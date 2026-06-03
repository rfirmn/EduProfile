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
import { SelfPerceptionService } from './self-perception.service.js';
import { SubmitSelfPerceptionDto } from './dto/submit-answers.dto.js';
import { GuestOrAuth } from '../common/decorators/guest-or-auth.decorator.js';
import type { Request } from 'express';

@Controller('test')
export class SelfPerceptionController {
  constructor(
    private readonly selfPerceptionService: SelfPerceptionService,
  ) {}

  @GuestOrAuth()
  @Get('self-perception/questions')
  @HttpCode(HttpStatus.OK)
  getQuestions() {
    return this.selfPerceptionService.getQuestions();
  }

  @GuestOrAuth()
  @Post('sessions/:sessionId/self-perception/submit')
  @HttpCode(HttpStatus.OK)
  submitAnswers(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitSelfPerceptionDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.selfPerceptionService.submitAnswers(
      sessionId,
      dto,
      user?.userId,
      guestToken,
    );
  }
}
