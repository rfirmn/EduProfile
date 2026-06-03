import { Module } from '@nestjs/common';
import { ProfileTestService } from './profile-test.service.js';
import { ProfileTestController } from './profile-test.controller.js';

@Module({
  controllers: [ProfileTestController],
  providers: [ProfileTestService],
  exports: [ProfileTestService],
})
export class ProfileTestModule {}
