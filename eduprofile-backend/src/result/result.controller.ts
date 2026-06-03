import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResultService } from './result.service.js';
import { GuestOrAuth } from '../common/decorators/guest-or-auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import type { Request } from 'express';

@Controller()
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @GuestOrAuth()
  @Get('test/sessions/:sessionId/result')
  @HttpCode(HttpStatus.OK)
  getSessionResult(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.resultService.getSessionResult(
      sessionId,
      user?.userId,
      guestToken,
    );
  }

  @Get('results')
  @HttpCode(HttpStatus.OK)
  getAllResults(
    @CurrentUser('userId') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.resultService.getAllResults(userId, pagination.page, pagination.limit);
  }

  @Get('results/:resultId')
  @HttpCode(HttpStatus.OK)
  getResultById(
    @Param('resultId') resultId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.resultService.getResultById(resultId, userId);
  }
}
