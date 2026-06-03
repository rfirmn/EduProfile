import { Module } from '@nestjs/common';
import { TestSessionService } from './test-session.service.js';
import { TestSessionController } from './test-session.controller.js';

@Module({
  controllers: [TestSessionController],
  providers: [TestSessionService],
  exports: [TestSessionService],
})
export class TestSessionModule {}
