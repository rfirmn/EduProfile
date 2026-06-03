import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ResultService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionResult(sessionId: string, userId?: string, guestToken?: string) {
    // Verify session ownership
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

    // Check if result exists
    const result = await this.prisma.testResult.findUnique({
      where: { sessionId },
    });

    if (!result) {
      return {
        result_status: 'processing',
        message: 'Hasil sedang dianalisis oleh AI. Silakan tunggu beberapa saat.',
      };
    }

    return {
      result_id: result.id,
      session_id: result.sessionId,
      result_status: 'ready',
      scores: {
        performance: {
          V: Number(result.perfVScore),
          A: Number(result.perfAScore),
          K: Number(result.perfKScore),
        },
        final: {
          V: Number(result.finalVScore),
          A: Number(result.finalAScore),
          K: Number(result.finalKScore),
        },
      },
      ml_prediction: {
        predicted_style: result.dominantStyle,
        confidence: Number(result.mlConfidence),
        probabilities: {
          Visual: Number(result.mlProbabilityV),
          Auditory: Number(result.mlProbabilityA),
          Kinesthetic: Number(result.mlProbabilityK),
        },
      },
      dominant_style: result.dominantStyle,
      learning_pace: result.learningPace,
      pace_breakdown: {
        avg_time_per_question_ms: result.paceAvgTimeMs,
        accuracy_pct: Number(result.paceAccuracyPct),
        speed_label: result.paceSpeedLabel,
        accuracy_label: result.paceAccuracyLabel,
      },
      habit_features: result.habitFeatures,
      ai_analysis: result.aiAnalysisText,
      roadmap: result.roadmapText,
      generated_at: result.generatedAt,
    };
  }

  async getAllResults(userId: string, page: number = 1, limit: number = 5) {
    const [results, total] = await Promise.all([
      this.prisma.testResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.testResult.count({ where: { userId } }),
    ]);

    return {
      data: results.map((r) => ({
        result_id: r.id,
        session_id: r.sessionId,
        dominant_style: r.dominantStyle,
        learning_pace: r.learningPace,
        ml_confidence: Number(r.mlConfidence),
        scores: {
          final: {
            V: Number(r.finalVScore),
            A: Number(r.finalAScore),
            K: Number(r.finalKScore),
          },
        },
        generated_at: r.generatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getResultById(resultId: string, userId: string) {
    const result = await this.prisma.testResult.findFirst({
      where: { id: resultId, userId },
    });

    if (!result) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Hasil tidak ditemukan.',
      });
    }

    return {
      result_id: result.id,
      session_id: result.sessionId,
      scores: {
        performance: {
          V: Number(result.perfVScore),
          A: Number(result.perfAScore),
          K: Number(result.perfKScore),
        },
        final: {
          V: Number(result.finalVScore),
          A: Number(result.finalAScore),
          K: Number(result.finalKScore),
        },
      },
      ml_prediction: {
        predicted_style: result.dominantStyle,
        confidence: Number(result.mlConfidence),
        probabilities: {
          Visual: Number(result.mlProbabilityV),
          Auditory: Number(result.mlProbabilityA),
          Kinesthetic: Number(result.mlProbabilityK),
        },
      },
      dominant_style: result.dominantStyle,
      learning_pace: result.learningPace,
      pace_breakdown: {
        avg_time_per_question_ms: result.paceAvgTimeMs,
        accuracy_pct: Number(result.paceAccuracyPct),
        speed_label: result.paceSpeedLabel,
        accuracy_label: result.paceAccuracyLabel,
      },
      habit_features: result.habitFeatures,
      ai_analysis: result.aiAnalysisText,
      roadmap: result.roadmapText,
      ai_model_version: result.aiModelVersion,
      generated_at: result.generatedAt,
    };
  }
}
