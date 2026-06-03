import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { v4 as uuidv4 } from 'uuid';
import { VakDimension, SessionStatus } from '@prisma/client';

@Injectable()
export class TestSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId?: string, guestToken?: string) {
    // If logged-in user, check profile exists
    if (userId) {
      const profile = await this.prisma.profile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new UnprocessableEntityException({
          code: 'PROFILE_NOT_FOUND',
          message: 'Lengkapi profil sebelum memulai test.',
        });
      }
    }

    // Generate guest token if not provided
    const sessionGuestToken = guestToken || uuidv4();

    // Select 1 random package per dimension
    const dimensions: VakDimension[] = ['V', 'A', 'K'];
    const packageSelections: {
      vakDimension: VakDimension;
      packageId: string;
    }[] = [];

    for (const dim of dimensions) {
      // Get previously used packages for this user (to exclude them)
      let excludeIds: string[] = [];
      if (userId) {
        const previousSelections = await this.prisma.sessionPackageSelection.findMany({
          where: {
            vakDimension: dim,
            session: { userId },
          },
          select: { packageId: true },
        });
        excludeIds = previousSelections.map((s) => s.packageId);
      }

      // Find active packages excluding already used ones
      const availablePackages = await this.prisma.performancePackage.findMany({
        where: {
          vakDimension: dim,
          isActive: true,
          ...(excludeIds.length > 0
            ? { id: { notIn: excludeIds } }
            : {}),
        },
      });

      // If all packages have been used, reset and allow all
      let targetPackages = availablePackages;
      if (targetPackages.length === 0) {
        targetPackages = await this.prisma.performancePackage.findMany({
          where: { vakDimension: dim, isActive: true },
        });
      }

      if (targetPackages.length === 0) {
        throw new BadRequestException({
          code: 'PACKAGE_UNAVAILABLE',
          message: `Tidak ada paket aktif untuk dimensi ${dim}.`,
        });
      }

      // Pick random
      const randomIndex = Math.floor(Math.random() * targetPackages.length);
      packageSelections.push({
        vakDimension: dim,
        packageId: targetPackages[randomIndex].id,
      });
    }

    // Create session + package selections in a transaction
    const session = await this.prisma.$transaction(async (tx) => {
      const newSession = await tx.testSession.create({
        data: {
          userId: userId || null,
          guestToken: userId ? null : sessionGuestToken,
          status: 'in_progress',
        },
      });

      await tx.sessionPackageSelection.createMany({
        data: packageSelections.map((ps) => ({
          sessionId: newSession.id,
          vakDimension: ps.vakDimension,
          packageId: ps.packageId,
        })),
      });

      return newSession;
    });

    // Fetch created selections for response
    const selections = await this.prisma.sessionPackageSelection.findMany({
      where: { sessionId: session.id },
      orderBy: { vakDimension: 'asc' },
    });

    return {
      session_id: session.id,
      status: session.status,
      guest_token: session.guestToken,
      started_at: session.startedAt,
      package_selections: selections.map((s) => ({
        vak_dimension: s.vakDimension,
        package_id: s.packageId,
        status: s.status,
      })),
    };
  }

  async getSession(sessionId: string, userId?: string, guestToken?: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        packageSelections: {
          orderBy: { vakDimension: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Sesi tidak ditemukan.',
      });
    }

    // Verify ownership
    if (userId && session.userId !== userId) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Sesi tidak ditemukan.',
      });
    }
    if (guestToken && session.guestToken !== guestToken) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Sesi tidak ditemukan.',
      });
    }

    return {
      session_id: session.id,
      status: session.status,
      started_at: session.startedAt,
      self_perception_submitted_at: session.selfPerceptionSubmittedAt,
      completed_at: session.completedAt,
      package_selections: session.packageSelections.map((s) => {
        const base: Record<string, unknown> = {
          vak_dimension: s.vakDimension,
          status: s.status,
          time_limit_seconds: s.timeLimitSeconds,
        };

        if (s.status === 'completed' || s.status === 'timed_out') {
          base.time_elapsed_seconds = s.timeElapsedSeconds;
        }

        if (s.status === 'in_progress' && s.startedAt) {
          const elapsed = Math.floor(
            (Date.now() - s.startedAt.getTime()) / 1000,
          );
          base.started_at = s.startedAt;
          base.seconds_remaining = Math.max(0, s.timeLimitSeconds - elapsed);
        }

        return base;
      }),
    };
  }

  async getSessionHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.testSession.findMany({
        where,
        include: {
          testResult: {
            select: {
              dominantStyle: true,
              learningPace: true,
              finalVScore: true,
              finalAScore: true,
              finalKScore: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.testSession.count({ where }),
    ]);

    return {
      data: sessions.map((s) => ({
        session_id: s.id,
        status: s.status,
        started_at: s.startedAt,
        completed_at: s.completedAt,
        result_summary: s.testResult
          ? {
              dominant_style: s.testResult.dominantStyle,
              learning_pace: s.testResult.learningPace,
              final_v_score: Number(s.testResult.finalVScore),
              final_a_score: Number(s.testResult.finalAScore),
              final_k_score: Number(s.testResult.finalKScore),
            }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
