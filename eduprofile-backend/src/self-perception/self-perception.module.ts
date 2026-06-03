import { Module } from '@nestjs/common';
import { SelfPerceptionService } from './self-perception.service.js';
import { SelfPerceptionController } from './self-perception.controller.js';

@Module({
  controllers: [SelfPerceptionController],
  providers: [SelfPerceptionService],
  exports: [SelfPerceptionService],
})
export class SelfPerceptionModule {}
