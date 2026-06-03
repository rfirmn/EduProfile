import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmitProfileTestDto } from './dto/submit-profile-test.dto.js';

// Category order — MUST match ML API habit_features order
export const PROFILE_TEST_CATEGORIES = [
  'Edutech',
  'DeviceUsage',
  'Resources',
  'Discussion',
  'CourseParticipation',
  'EmotionEngagement',
  'PhysicalActivity',
  'Extracurricular',
] as const;

@Injectable()
export class ProfileTestService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestions() {
    const questions = await this.prisma.profileTestQuestion.findMany({
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
            // scoreValue intentionally excluded from response
          },
        },
      },
    });

    // Group by category
    const grouped: Record<string, typeof questions> = {};
    for (const q of questions) {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(q);
    }

    return {
      total_questions: questions.length,
      categories: PROFILE_TEST_CATEGORIES.map((cat) => ({
        category: cat,
        questions: (grouped[cat] || []).map((q) => ({
          id: q.id,
          order_index: q.orderIndex,
          question_text: q.questionText,
          options: q.options.map((o) => ({
            id: o.id,
            option_label: o.optionLabel,
            option_text: o.optionText,
          })),
        })),
      })),
    };
  }

  async submitAnswers(
    sessionId: string,
    dto: SubmitProfileTestDto,
    userId?: string,
    guestToken?: string,
  ) {
    // Verify session
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

    // Must be in_progress (profile test is the first step)
    if (session.status !== 'in_progress') {
      throw new ConflictException({
        code: 'SESSION_INVALID_STATUS',
        message: 'Profile test sudah disubmit untuk sesi ini.',
      });
    }

    // Verify all questions answered
    const activeQuestions = await this.prisma.profileTestQuestion.findMany({
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
    const activeIds = new Set(activeQuestions.map((q) => q.id));
    for (const answer of dto.answers) {
      if (!activeIds.has(answer.question_id)) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `question_id ${answer.question_id} tidak valid.`,
        });
      }
    }

    // Verify all option IDs belong to their respective questions
    for (const answer of dto.answers) {
      const option = await this.prisma.profileTestOption.findFirst({
        where: {
          id: answer.selected_option_id,
          questionId: answer.question_id,
        },
      });
      if (!option) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `selected_option_id ${answer.selected_option_id} tidak valid untuk soal ${answer.question_id}.`,
        });
      }
    }

    // Insert answers + update session status
    await this.prisma.$transaction(async (tx) => {
      await tx.profileTestAnswer.createMany({
        data: dto.answers.map((a) => ({
          sessionId,
          questionId: a.question_id,
          selectedOptionId: a.selected_option_id,
        })),
      });

      await tx.testSession.update({
        where: { id: sessionId },
        data: {
          status: 'profile_test_done',
          profileTestSubmittedAt: new Date(),
        },
      });
    });

    return {
      session_id: sessionId,
      status: 'profile_test_done',
      profile_test_submitted_at: new Date().toISOString(),
      answers_saved: dto.answers.length,
      next_step: 'self_perception',
    };
  }

  /**
   * Calculate habit_features array from profile test answers for ML API.
   * Returns array of 8 integers in category order, each 0-2.
   */
  async calculateHabitFeatures(sessionId: string): Promise<number[]> {
    const answers = await this.prisma.profileTestAnswer.findMany({
      where: { sessionId },
      include: {
        question: true,
        selectedOption: true,
      },
    });

    // Sum scores per category
    const categoryScores: Record<string, number> = {};
    for (const cat of PROFILE_TEST_CATEGORIES) {
      categoryScores[cat] = 0;
    }

    for (const answer of answers) {
      const cat = answer.question.category;
      if (cat in categoryScores) {
        categoryScores[cat] += answer.selectedOption.scoreValue;
      }
    }

    // Return in fixed category order
    return PROFILE_TEST_CATEGORIES.map((cat) => categoryScores[cat]);
  }
}
