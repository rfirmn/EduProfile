import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { GuestService } from './guest.service.js';
import { ConvertGuestDto } from './dto/convert-guest.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('guest')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  convert(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConvertGuestDto,
  ) {
    return this.guestService.convertGuest(userId, dto);
  }
}
