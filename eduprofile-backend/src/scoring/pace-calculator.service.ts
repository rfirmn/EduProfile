import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaceResult {
  paceAvgTimeMs: number;
  paceAccuracyPct: number;
  paceSpeedLabel: 'fast' | 'moderate' | 'slow';
  paceAccuracyLabel: 'high' | 'low';
  learningPace: string;
}

@Injectable()
export class PaceCalculatorService {
  private readonly fastThresholdMs: number;
  private readonly slowThresholdMs: number;
  private readonly accuracyThresholdPct: number;

  constructor(private readonly configService: ConfigService) {
    this.fastThresholdMs = this.configService.get<number>(
      'PACE_FAST_THRESHOLD_MS',
      40000,
    );
    this.slowThresholdMs = this.configService.get<number>(
      'PACE_SLOW_THRESHOLD_MS',
      70000,
    );
    this.accuracyThresholdPct = this.configService.get<number>(
      'PACE_ACCURACY_THRESHOLD_PCT',
      70,
    );
  }

  /**
   * Calculate learning pace from performance answers.
   *
   * @param answers Array of { timeSpentMs, scoreValue (from joined option) }
   *   scoreValue is null for skipped questions
   */
  calculate(
    answers: Array<{
      timeSpentMs: number;
      scoreValue: number | null;
      selectedOptionId: string | null;
    }>,
  ): PaceResult {
    const totalQuestions = answers.length;

    if (totalQuestions === 0) {
      return {
        paceAvgTimeMs: 0,
        paceAccuracyPct: 0,
        paceSpeedLabel: 'slow',
        paceAccuracyLabel: 'low',
        learningPace: 'slow_inaccurate',
      };
    }

    // Step 1 — Speed
    const totalTimeMs = answers.reduce((sum, a) => sum + a.timeSpentMs, 0);
    const paceAvgTimeMs = Math.round(totalTimeMs / totalQuestions);

    let paceSpeedLabel: 'fast' | 'moderate' | 'slow';
    if (paceAvgTimeMs < this.fastThresholdMs) {
      paceSpeedLabel = 'fast';
    } else if (paceAvgTimeMs < this.slowThresholdMs) {
      paceSpeedLabel = 'moderate';
    } else {
      paceSpeedLabel = 'slow';
    }

    // Step 2 — Accuracy
    const answeredQuestions = answers.filter(
      (a) => a.selectedOptionId !== null,
    );
    const correctAnswers = answeredQuestions.filter(
      (a) => a.scoreValue !== null && a.scoreValue > 0,
    );

    const paceAccuracyPct =
      answeredQuestions.length > 0
        ? Math.round(
            (correctAnswers.length / answeredQuestions.length) * 10000,
          ) / 100
        : 0;

    const paceAccuracyLabel: 'high' | 'low' =
      paceAccuracyPct >= this.accuracyThresholdPct ? 'high' : 'low';

    // Step 3 — Combine
    const accuracyWord = paceAccuracyLabel === 'high' ? 'accurate' : 'inaccurate';
    const learningPace = `${paceSpeedLabel}_${accuracyWord}`;

    return {
      paceAvgTimeMs,
      paceAccuracyPct,
      paceSpeedLabel,
      paceAccuracyLabel,
      learningPace,
    };
  }
}
