import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TestSessionService } from './test-session.service.js';
import { GuestOrAuth } from '../common/decorators/guest-or-auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import type { Request } from 'express';

@Controller('test')
export class TestSessionController {
  constructor(private readonly testSessionService: TestSessionService) {}

  @GuestOrAuth()
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  createSession(@Req() req: Request) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.testSessionService.createSession(user?.userId, guestToken);
  }

  @GuestOrAuth()
  @Get('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  getSession(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as { userId: string } | undefined;
    const guestToken = req['guestToken'] as string | undefined;
    return this.testSessionService.getSession(sessionId, user?.userId, guestToken);
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  getSessionHistory(
    @CurrentUser('userId') userId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.testSessionService.getSessionHistory(
      userId,
      pagination.page,
      pagination.limit,
      status,
    );
  }
}
