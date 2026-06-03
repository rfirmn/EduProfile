import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { CreateProfileDto, UpdateProfileDto } from './dto/index.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.profileService.createProfile(userId, dto);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(userId, dto);
  }
}
