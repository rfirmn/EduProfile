import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileTestService } from './profile-test.service.js';
import { SubmitProfileTestDto } from './dto/submit-profile-test.dto.js';
import { GuestOrAuth } from '../common/decorators/guest-or-auth.decorator.js';
import type { Request } from 'express';

@Controller('test')
export class ProfileTestController {
  constructor(private readonly profileTestService: ProfileTestService) {}

  @GuestOrAuth()
  @Get('profile-test/questions')
  @HttpCode(HttpStatus.OK)
  getQuestions() {
    return this.profileTestService.getQuestions();
  }

  @GuestOrAuth()
  @Post('sessions/:sessionId/profile-test/submit')
  @HttpCode(HttpStatus.OK)
  submitAnswers(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitProfileTestDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.profileTestService.submitAnswers(
      sessionId,
      dto,
      user?.userId,
      guestToken,
    );
  }
}
