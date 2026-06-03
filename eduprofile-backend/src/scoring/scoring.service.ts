import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaceCalculatorService } from './pace-calculator.service.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import { ProfileTestService } from '../profile-test/profile-test.service.js';
import { LearningPaceType } from '@prisma/client';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paceCalculator: PaceCalculatorService,
    private readonly aiAnalysis: AiAnalysisService,
    private readonly profileTestService: ProfileTestService,
  ) {}

  /**
   * Full scoring pipeline v2. Called async after last performance sub-test completes.
   *
   * Pipeline:
   * 1. Calculate perf scores per dimension (audit data)
   * 2. Calculate learning pace from performance answers
   * 3. Collect text_reflection from self-perception
   * 4. Collect habit_features from profile test
   * 5. Call ML API → get predicted_style + probabilities
   * 6. Generate roadmap text
   * 7. Save TestResult + update Profile (atomic)
   */
  async processSession(sessionId: string): Promise<void> {
    this.logger.log(`📊 Starting scoring pipeline v2 for session: ${sessionId}`);

    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        selfPerceptionAnswers: {
          include: { question: true },
        },
        performanceAnswers: {
          include: {
            selectedOption: true,
            packageSelection: true,
          },
        },
        packageSelections: true,
      },
    });

    if (!session || !session.userId) {
      this.logger.error(`Session ${sessionId} not found or no user associated`);
      return;
    }

    // Step 1 — Calculate perf scores per dimension (for audit, not used by ML API yet)
    const perfScores = { V: 0, A: 0, K: 0 };
    for (const selection of session.packageSelections) {
      const dimensionAnswers = session.performanceAnswers.filter(
        (a) => a.packageSelectionId === selection.id,
      );
      const dimensionScore = dimensionAnswers.reduce((sum, a) => {
        if (a.selectedOption) {
          return sum + Number(a.selectedOption.scoreValue);
        }
        return sum;
      }, 0);
      perfScores[selection.vakDimension] = Math.round(dimensionScore * 100) / 100;
    }

    this.logger.log(`  Performance scores: V=${perfScores.V}, A=${perfScores.A}, K=${perfScores.K}`);

    // Step 2 — Calculate learning pace
    const paceInput = session.performanceAnswers.map((a) => ({
      timeSpentMs: a.timeSpentMs,
      scoreValue: a.selectedOption ? Number(a.selectedOption.scoreValue) : null,
      selectedOptionId: a.selectedOptionId,
    }));
    const pace = this.paceCalculator.calculate(paceInput);

    this.logger.log(`  Pace: ${pace.learningPace} (avg ${pace.paceAvgTimeMs}ms, accuracy ${pace.paceAccuracyPct}%)`);

    // Step 3 — Collect text_reflection from self-perception (1 essay)
    const textReflection = session.selfPerceptionAnswers
      .map((a) => a.essayText)
      .join(' ')
      .trim();

    this.logger.log(`  Self-perception text length: ${textReflection.length} chars`);

    // Step 4 — Collect habit_features from profile test
    const habitFeatures = await this.profileTestService.calculateHabitFeatures(sessionId);

    this.logger.log(`  Habit features: [${habitFeatures.join(', ')}]`);

    // Step 5 — Call ML API
    const mlPrediction = await this.aiAnalysis.predictLearningStyle(
      textReflection,
      habitFeatures,
    );

    this.logger.log(
      `  ML prediction: ${mlPrediction.predictedStyle} (confidence: ${mlPrediction.confidence}%)`,
    );

    // Step 6 — Generate analysis text & roadmap
    const analysis = this.aiAnalysis.generateAnalysisText({
      predictedStyle: mlPrediction.predictedStyle,
      confidence: mlPrediction.confidence,
      probabilities: mlPrediction.probabilities,
      learningPace: pace.learningPace,
      paceSpeedLabel: pace.paceSpeedLabel,
      paceAccuracyLabel: pace.paceAccuracyLabel,
      paceAvgTimeMs: pace.paceAvgTimeMs,
      paceAccuracyPct: pace.paceAccuracyPct,
    });

    // Map predicted_style to short code for dominantStyle column
    const styleToCode: Record<string, string> = {
      Visual: 'V',
      Auditory: 'A',
      Kinesthetic: 'K',
    };
    const dominantStyle = mlPrediction.predictedStyle;

    // Step 7 — Save TestResult + update Profile (atomic)
    await this.prisma.$transaction(async (tx) => {
      await tx.testResult.create({
        data: {
          sessionId,
          userId: session.userId!,
          perfVScore: perfScores.V,
          perfAScore: perfScores.A,
          perfKScore: perfScores.K,
          mlProbabilityV: mlPrediction.probabilities.Visual,
          mlProbabilityA: mlPrediction.probabilities.Auditory,
          mlProbabilityK: mlPrediction.probabilities.Kinesthetic,
          mlConfidence: mlPrediction.confidence,
          finalVScore: mlPrediction.probabilities.Visual,
          finalAScore: mlPrediction.probabilities.Auditory,
          finalKScore: mlPrediction.probabilities.Kinesthetic,
          dominantStyle,
          learningPace: pace.learningPace as LearningPaceType,
          paceAvgTimeMs: pace.paceAvgTimeMs,
          paceAccuracyPct: pace.paceAccuracyPct,
          paceSpeedLabel: pace.paceSpeedLabel,
          paceAccuracyLabel: pace.paceAccuracyLabel,
          habitFeatures: habitFeatures,
          aiAnalysisText: analysis.aiAnalysisText,
          roadmapText: analysis.roadmapText,
          aiModelVersion: analysis.aiModelVersion,
          rawAiPayload: analysis.rawPayload as any,
        },
      });

      await tx.profile.update({
        where: { userId: session.userId! },
        data: {
          currentLearningStyle: dominantStyle,
          currentLearningPace: pace.learningPace as LearningPaceType,
          lastTestAt: new Date(),
        },
      });
    });

    this.logger.log(`✅ Scoring pipeline v2 completed for session: ${sessionId}`);
  }
}
