import { IsEnum } from 'class-validator';

export class CompletePerformanceDto {
  @IsEnum(['completed', 'timed_out'], {
    message: 'reason harus "completed" atau "timed_out".',
  })
  reason: 'completed' | 'timed_out';
}
