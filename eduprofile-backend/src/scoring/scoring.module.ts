import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { PaceCalculatorService } from './pace-calculator.service.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import { ProfileTestModule } from '../profile-test/profile-test.module.js';

@Module({
  imports: [ProfileTestModule],
  providers: [ScoringService, PaceCalculatorService, AiAnalysisService],
  exports: [ScoringService],
})
export class ScoringModule {}
