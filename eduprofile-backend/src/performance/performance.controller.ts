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
import { PerformanceService } from './performance.service.js';
import {
  StartPerformanceDto,
  SubmitAnswerDto,
  CompletePerformanceDto,
} from './dto/index.js';
import { GuestOrAuth } from '../common/decorators/guest-or-auth.decorator.js';
import { VakDimension } from '@prisma/client';
import type { Request } from 'express';

@Controller('test')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @GuestOrAuth()
  @Post('sessions/:sessionId/performance/start')
  @HttpCode(HttpStatus.OK)
  startPerformance(
    @Param('sessionId') sessionId: string,
    @Body() dto: StartPerformanceDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.performanceService.startPerformance(
      sessionId,
      dto,
      user?.userId,
      guestToken,
    );
  }

  @GuestOrAuth()
  @Get('sessions/:sessionId/performance/:vakDimension')
  @HttpCode(HttpStatus.OK)
  getPerformanceData(
    @Param('sessionId') sessionId: string,
    @Param('vakDimension') vakDimension: VakDimension,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.performanceService.getPerformanceData(
      sessionId,
      vakDimension,
      user?.userId,
      guestToken,
    );
  }

  @GuestOrAuth()
  @Post('sessions/:sessionId/performance/:vakDimension/answer')
  @HttpCode(HttpStatus.OK)
  submitAnswer(
    @Param('sessionId') sessionId: string,
    @Param('vakDimension') vakDimension: VakDimension,
    @Body() dto: SubmitAnswerDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.performanceService.submitAnswer(
      sessionId,
      vakDimension,
      dto,
      user?.userId,
      guestToken,
    );
  }

  @GuestOrAuth()
  @Post('sessions/:sessionId/performance/:vakDimension/complete')
  @HttpCode(HttpStatus.OK)
  completePerformance(
    @Param('sessionId') sessionId: string,
    @Param('vakDimension') vakDimension: VakDimension,
    @Body() dto: CompletePerformanceDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.performanceService.completePerformance(
      sessionId,
      vakDimension,
      dto,
      user?.userId,
      guestToken,
    );
  }
}
