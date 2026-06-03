import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmitSelfPerceptionDto } from './dto/submit-answers.dto.js';

@Injectable()
export class SelfPerceptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestions() {
    const questions = await this.prisma.selfPerceptionQuestion.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        questionText: true,
      },
    });

    return {
      total_questions: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        order_index: q.orderIndex,
        question_text: q.questionText,
      })),
    };
  }

  async submitAnswers(
    sessionId: string,
    dto: SubmitSelfPerceptionDto,
    userId?: string,
    guestToken?: string,
  ) {
    // Verify session exists and belongs to user/guest
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
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

    // Verify session status — self-perception comes after profile test
    if (session.status !== 'profile_test_done') {
      throw new ConflictException({
        code: 'SESSION_INVALID_STATUS',
        message: 'Selesaikan profile test terlebih dahulu, atau self-perception sudah disubmit.',
      });
    }

    // Verify answer count matches active question count
    const activeQuestions = await this.prisma.selfPerceptionQuestion.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (dto.answers.length !== activeQuestions.length) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Jumlah jawaban (${dto.answers.length}) tidak sesuai dengan jumlah soal aktif (${activeQuestions.length}).`,
      });
    }

    // Verify all question IDs are valid
    const activeQuestionIds = new Set(activeQuestions.map((q) => q.id));
    for (const answer of dto.answers) {
      if (!activeQuestionIds.has(answer.question_id)) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `question_id ${answer.question_id} tidak valid.`,
        });
      }
    }

    // Insert answers and update session in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.selfPerceptionAnswer.createMany({
        data: dto.answers.map((a) => ({
          sessionId,
          questionId: a.question_id,
          essayText: a.essay_text,
        })),
      });

      await tx.testSession.update({
        where: { id: sessionId },
        data: {
          status: 'self_perception_done',
          selfPerceptionSubmittedAt: new Date(),
        },
      });
    });

    return {
      session_id: sessionId,
      status: 'self_perception_done',
      self_perception_submitted_at: new Date().toISOString(),
      answers_saved: dto.answers.length,
      next_step: 'performance_test',
    };
  }
}
