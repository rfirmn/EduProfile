import { Module, forwardRef } from '@nestjs/common';
import { PerformanceService } from './performance.service.js';
import { PerformanceController } from './performance.controller.js';
import { ScoringModule } from '../scoring/scoring.module.js';

@Module({
  imports: [ScoringModule],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
