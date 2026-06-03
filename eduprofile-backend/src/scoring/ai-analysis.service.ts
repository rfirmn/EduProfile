import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MlPredictionResult {
  predictedStyle: string;   // "Visual" | "Auditory" | "Kinesthetic"
  confidence: number;       // e.g. 91.15
  probabilities: {
    Visual: number;
    Auditory: number;
    Kinesthetic: number;
  };
}

export interface AiAnalysisResult {
  aiAnalysisText: string;
  roadmapText: string;
  aiModelVersion: string;
  rawPayload: Record<string, unknown>;
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly mlApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.mlApiUrl = this.configService.get<string>('ML_API_URL', 'http://localhost:8000/predict');
  }

  /**
   * Call external ML API to predict learning style.
   * Input: text_reflection (from self-perception) + habit_features (from profile test)
   * Output: predicted_style + confidence + probabilities
   */
  async predictLearningStyle(
    textReflection: string,
    habitFeatures: number[],
  ): Promise<MlPredictionResult> {
    this.logger.log(`🤖 Calling ML API at ${this.mlApiUrl}...`);
    this.logger.log(`   text_reflection length: ${textReflection.length} chars`);
    this.logger.log(`   habit_features: [${habitFeatures.join(', ')}]`);

    const requestBody = {
      text_reflection: textReflection,
      habit_features: habitFeatures,
    };

    try {
      const response = await fetch(this.mlApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json() as {
        predicted_style: string;
        confidence: number;
        probabilities: {
          Auditory: number;
          Kinesthetic: number;
          Visual: number;
        };
      };

      this.logger.log(`✅ ML API response: style=${data.predicted_style}, confidence=${data.confidence}%`);

      return {
        predictedStyle: data.predicted_style,
        confidence: data.confidence,
        probabilities: {
          Visual: data.probabilities.Visual,
          Auditory: data.probabilities.Auditory,
          Kinesthetic: data.probabilities.Kinesthetic,
        },
      };
    } catch (error) {
      this.logger.error(`❌ ML API call failed: ${error}`);

      // Fallback: return mock prediction if ML API is unavailable
      this.logger.warn('⚠️ Using fallback mock prediction');
      return {
        predictedStyle: 'Visual',
        confidence: 0,
        probabilities: {
          Visual: 33.33,
          Auditory: 33.33,
          Kinesthetic: 33.34,
        },
      };
    }
  }

  /**
   * Generate analysis text and roadmap based on ML prediction.
   */
  generateAnalysisText(params: {
    predictedStyle: string;
    confidence: number;
    probabilities: { Visual: number; Auditory: number; Kinesthetic: number };
    learningPace: string;
    paceSpeedLabel: string;
    paceAccuracyLabel: string;
    paceAvgTimeMs: number;
    paceAccuracyPct: number;
  }): AiAnalysisResult {
    const styleNames: Record<string, string> = {
      Visual: 'Visual',
      Auditory: 'Auditory',
      Kinesthetic: 'Kinestetik',
    };

    const paceDescriptions: Record<string, string> = {
      fast_accurate: 'Kamu belajar dengan cepat dan langsung paham. Roadmap ini dirancang dengan intensitas tinggi.',
      fast_inaccurate: 'Kamu cenderung tergesa-gesa saat menjawab. Perlu checkpoint validasi di setiap tahap.',
      moderate_accurate: 'Pace belajarmu terukur dan efektif. Roadmap ini dirancang dengan progress bertahap.',
      moderate_inaccurate: 'Kamu perlu waktu lebih untuk pendalaman materi. Roadmap menyertakan latihan pengulangan.',
      slow_accurate: 'Kamu adalah tipe pemelajar yang teliti. Roadmap dengan jadwal lebih longgar cocok untukmu.',
      slow_inaccurate: 'Kamu membutuhkan pendekatan pembelajaran khusus dengan scaffolding yang lebih banyak.',
    };

    const styleName = styleNames[params.predictedStyle] || params.predictedStyle;
    const paceDesc = paceDescriptions[params.learningPace] || '';

    const aiAnalysisText =
      `Berdasarkan analisis model AI (confidence: ${params.confidence.toFixed(1)}%), ` +
      `gaya belajar dominanmu adalah **${styleName}**. ` +
      `Probabilitas: Visual ${params.probabilities.Visual.toFixed(1)}%, ` +
      `Auditory ${params.probabilities.Auditory.toFixed(1)}%, ` +
      `Kinestetik ${params.probabilities.Kinesthetic.toFixed(1)}%. ` +
      `Learning pace kamu: ${params.learningPace.replace('_', ' ')} ` +
      `(rata-rata ${Math.round(params.paceAvgTimeMs / 1000)} detik/soal, akurasi ${params.paceAccuracyPct}%). ` +
      paceDesc;

    const roadmapText =
      `## Roadmap Pembelajaran untuk Gaya Belajar ${styleName}\n\n` +
      `### Profil Kamu\n` +
      `- Gaya: ${styleName} (${params.confidence.toFixed(1)}% confidence)\n` +
      `- Pace: ${params.learningPace.replace('_', ' ')}\n\n` +
      `### Minggu 1-2: Fondasi\n` +
      `- Kenali kekuatan gaya belajar ${styleName} kamu\n` +
      `- Terapkan teknik belajar yang sesuai\n\n` +
      `### Minggu 3-4: Pengembangan\n` +
      `- Tingkatkan efisiensi belajar berdasarkan pace kamu\n` +
      `- Eksplorasi metode belajar komplementer\n\n` +
      `### Minggu 5+: Penguasaan\n` +
      `- Evaluasi progress dan sesuaikan strategi\n` +
      `- Capai target pembelajaran kamu`;

    return {
      aiAnalysisText,
      roadmapText,
      aiModelVersion: 'ml-api-v1',
      rawPayload: {
        model: 'ml-api-v1',
        input: {
          predicted_style: params.predictedStyle,
          confidence: params.confidence,
          probabilities: params.probabilities,
          learning_pace: params.learningPace,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
