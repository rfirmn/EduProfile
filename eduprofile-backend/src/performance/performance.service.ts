import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VakDimension } from '@prisma/client';
import { StartPerformanceDto, SubmitAnswerDto, CompletePerformanceDto } from './dto/index.js';
import { ScoringService } from '../scoring/scoring.service.js';

@Injectable()
export class PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  async startPerformance(
    sessionId: string,
    dto: StartPerformanceDto,
    userId?: string,
    guestToken?: string,
  ) {
    const session = await this.getAndVerifySession(sessionId, userId, guestToken);

    // Verify session status
    if (
      session.status !== 'self_perception_done' &&
      session.status !== 'performance_in_progress'
    ) {
      throw new ConflictException({
        code: 'SESSION_INVALID_STATUS',
        message: 'Selesaikan self-perception terlebih dahulu.',
      });
    }

    // Find the package selection for this dimension
    const selection = await this.prisma.sessionPackageSelection.findFirst({
      where: {
        sessionId,
        vakDimension: dto.vak_dimension,
      },
    });

    if (!selection) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: `Paket untuk dimensi ${dto.vak_dimension} tidak ditemukan di sesi ini.`,
      });
    }

    if (selection.status !== 'pending') {
      throw new ConflictException({
        code: 'SESSION_INVALID_STATUS',
        message: `Sub-test ${dto.vak_dimension} sudah dimulai atau selesai.`,
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + selection.timeLimitSeconds * 1000);

    // Start the sub-test
    await this.prisma.$transaction(async (tx) => {
      await tx.sessionPackageSelection.update({
        where: { id: selection.id },
        data: {
          status: 'in_progress',
          startedAt: now,
        },
      });

      // Update session status if first performance sub-test
      if (session.status === 'self_perception_done') {
        await tx.testSession.update({
          where: { id: sessionId },
          data: { status: 'performance_in_progress' },
        });
      }
    });

    return {
      vak_dimension: dto.vak_dimension,
      time_limit_seconds: selection.timeLimitSeconds,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };
  }

  async getPerformanceData(
    sessionId: string,
    vakDimension: VakDimension,
    userId?: string,
    guestToken?: string,
  ) {
    await this.getAndVerifySession(sessionId, userId, guestToken);

    const selection = await this.prisma.sessionPackageSelection.findFirst({
      where: { sessionId, vakDimension },
      include: {
        package: {
          include: {
            materials: {
              orderBy: { orderIndex: 'asc' },
            },
            questions: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' },
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    optionLabel: true,
                    optionText: true,
                    orderIndex: true,
                    // score_value intentionally excluded!
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!selection) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: `Paket untuk dimensi ${vakDimension} tidak ditemukan.`,
      });
    }

    // Calculate remaining time
    let timer: Record<string, unknown> | null = null;
    if (selection.startedAt) {
      const elapsed = Math.floor(
        (Date.now() - selection.startedAt.getTime()) / 1000,
      );
      const expiresAt = new Date(
        selection.startedAt.getTime() + selection.timeLimitSeconds * 1000,
      );
      timer = {
        time_limit_seconds: selection.timeLimitSeconds,
        started_at: selection.startedAt,
        expires_at: expiresAt,
        seconds_remaining: Math.max(0, selection.timeLimitSeconds - elapsed),
      };
    }

    return {
      vak_dimension: vakDimension,
      package: {
        id: selection.package.id,
        title: selection.package.title,
        genre: selection.package.genre,
      },
      materials: selection.package.materials.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        order_index: m.orderIndex,
      })),
      questions: selection.package.questions.map((q) => ({
        id: q.id,
        order_index: q.orderIndex,
        question_text: q.questionText,
        options: q.options.map((o) => ({
          id: o.id,
          option_label: o.optionLabel,
          option_text: o.optionText,
        })),
      })),
      timer,
    };
  }

  async submitAnswer(
    sessionId: string,
    vakDimension: VakDimension,
    dto: SubmitAnswerDto,
    userId?: string,
    guestToken?: string,
  ) {
    await this.getAndVerifySession(sessionId, userId, guestToken);

    // Get the selection
    const selection = await this.prisma.sessionPackageSelection.findFirst({
      where: { sessionId, vakDimension },
    });

    if (!selection || selection.status !== 'in_progress') {
      throw new ConflictException({
        code: 'SESSION_INVALID_STATUS',
        message: `Sub-test ${vakDimension} belum dimulai atau sudah selesai.`,
      });
    }

    // Timer validation (backend enforcement)
    if (selection.startedAt) {
      const elapsed = (Date.now() - selection.startedAt.getTime()) / 1000;
      if (elapsed > selection.timeLimitSeconds) {
        throw new ConflictException({
          code: 'SESSION_TIMER_EXPIRED',
          message: `Waktu untuk sub-test ${vakDimension} telah habis. Jawaban tidak dapat disimpan.`,
        });
      }
    }

    // Check if question already answered
    const existingAnswer = await this.prisma.performanceAnswer.findUnique({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.question_id,
        },
      },
    });

    if (existingAnswer) {
      throw new ConflictException({
        code: 'SESSION_ALREADY_ANSWERED',
        message: 'Soal ini sudah dijawab sebelumnya.',
      });
    }

    // Verify question belongs to this package
    const question = await this.prisma.packageQuestion.findFirst({
      where: {
        id: dto.question_id,
        packageId: selection.packageId,
      },
    });

    if (!question) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Soal tidak ditemukan dalam paket ini.',
      });
    }

    // Insert answer
    const answer = await this.prisma.performanceAnswer.create({
      data: {
        sessionId,
        packageSelectionId: selection.id,
        questionId: dto.question_id,
        selectedOptionId: dto.selected_option_id || null,
        timeSpentMs: dto.time_spent_ms,
      },
    });

    // Calculate remaining time
    let secondsRemaining = 0;
    if (selection.startedAt) {
      const elapsed = (Date.now() - selection.startedAt.getTime()) / 1000;
      secondsRemaining = Math.max(0, Math.floor(selection.timeLimitSeconds - elapsed));
    }

    return {
      question_id: answer.questionId,
      selected_option_id: answer.selectedOptionId,
      time_spent_ms: answer.timeSpentMs,
      answered_at: answer.answeredAt,
      seconds_remaining: secondsRemaining,
    };
  }

  async completePerformance(
    sessionId: string,
    vakDimension: VakDimension,
    dto: CompletePerformanceDto,
    userId?: string,
    guestToken?: string,
  ) {
    await this.getAndVerifySession(sessionId, userId, guestToken);

    const selection = await this.prisma.sessionPackageSelection.findFirst({
      where: { sessionId, vakDimension },
    });

    if (!selection || (selection.status !== 'in_progress' && selection.status !== 'pending')) {
      throw new ConflictException({
        code: 'SESSION_INVALID_STATUS',
        message: `Sub-test ${vakDimension} sudah selesai.`,
      });
    }

    // Calculate time elapsed
    let timeElapsedSeconds = 0;
    if (selection.startedAt) {
      timeElapsedSeconds = Math.floor(
        (Date.now() - selection.startedAt.getTime()) / 1000,
      );
    }

    // Count answers submitted
    const answersCount = await this.prisma.performanceAnswer.count({
      where: { packageSelectionId: selection.id },
    });

    // Determine completion status
    const completionStatus = dto.reason === 'timed_out' ? 'timed_out' as const : 'completed' as const;

    // Check if this is the last sub-test (K)
    const allSelections = await this.prisma.sessionPackageSelection.findMany({
      where: { sessionId },
      orderBy: { vakDimension: 'asc' },
    });

    const completedDimensions = allSelections.filter(
      (s) => s.status === 'completed' || s.status === 'timed_out' || s.id === selection.id,
    );
    const isSessionCompleted = completedDimensions.length >= 3;

    // Determine next dimension
    const dimensionOrder: VakDimension[] = ['V', 'A', 'K'];
    const currentIndex = dimensionOrder.indexOf(vakDimension);
    const nextDimension = currentIndex < 2 ? dimensionOrder[currentIndex + 1] : null;

    // Update in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.sessionPackageSelection.update({
        where: { id: selection.id },
        data: {
          status: completionStatus,
          completedAt: new Date(),
          timeElapsedSeconds,
        },
      });

      if (isSessionCompleted) {
        await tx.testSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      }
    });

    const response: Record<string, unknown> = {
      vak_dimension: vakDimension,
      status: completionStatus,
      time_elapsed_seconds: timeElapsedSeconds,
      answers_submitted: answersCount,
      session_completed: isSessionCompleted,
    };

    if (!isSessionCompleted && nextDimension) {
      response.next_dimension = nextDimension;
    }

    if (isSessionCompleted) {
      response.result_status = 'processing';
      response.poll_url = `/test/sessions/${sessionId}/result`;

      // Trigger AI scoring pipeline asynchronously
      // This will be handled by the ScoringService
      this.triggerScoringPipeline(sessionId).catch((err) => {
        console.error('Scoring pipeline error:', err);
      });
    }

    return response;
  }

  // --- Private helpers ---

  private async getAndVerifySession(
    sessionId: string,
    userId?: string,
    guestToken?: string,
  ) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Sesi tidak ditemukan.',
      });
    }

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

    return session;
  }

  private async triggerScoringPipeline(sessionId: string) {
    console.log(`🔄 Scoring pipeline triggered for session: ${sessionId}`);
    await this.scoringService.processSession(sessionId);
  }
}
