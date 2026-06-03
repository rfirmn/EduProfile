import { Module } from '@nestjs/common';
import { ResultService } from './result.service.js';
import { ResultController } from './result.controller.js';

@Module({
  controllers: [ResultController],
  providers: [ResultService],
  exports: [ResultService],
})
export class ResultModule {}
