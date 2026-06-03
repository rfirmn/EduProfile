import { Module } from '@nestjs/common';
import { GuestService } from './guest.service.js';
import { GuestController } from './guest.controller.js';

@Module({
  controllers: [GuestController],
  providers: [GuestService],
})
export class GuestModule {}
