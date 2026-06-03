import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProfileDto, UpdateProfileDto } from './dto/index.js';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil belum diisi.',
      });
    }

    return {
      id: profile.id,
      user_id: profile.userId,
      full_name: profile.fullName,
      date_of_birth: profile.dateOfBirth?.toISOString().split('T')[0] ?? null,
      gender: profile.gender,
      occupation: profile.occupation,
      education_level: profile.educationLevel,
      avatar_url: profile.avatarUrl,
      current_learning_style: profile.currentLearningStyle,
      current_learning_pace: profile.currentLearningPace,
      last_test_at: profile.lastTestAt,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  async createProfile(userId: string, dto: CreateProfileDto) {
    // Check if profile already exists
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'VALIDATION_ERROR',
        message: 'Profil sudah dibuat sebelumnya. Gunakan PATCH untuk update.',
      });
    }

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        fullName: dto.full_name,
        dateOfBirth: dto.date_of_birth ? new Date(dto.date_of_birth) : null,
        gender: dto.gender ?? null,
        occupation: dto.occupation,
        educationLevel: dto.education_level ?? null,
      },
    });

    return {
      id: profile.id,
      full_name: profile.fullName,
      occupation: profile.occupation,
      current_learning_style: null,
      current_learning_pace: null,
      last_test_at: null,
      created_at: profile.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil belum diisi.',
      });
    }

    // Build update data — only include provided fields
    const updateData: Record<string, unknown> = {};
    if (dto.full_name !== undefined) updateData.fullName = dto.full_name;
    if (dto.date_of_birth !== undefined) updateData.dateOfBirth = new Date(dto.date_of_birth);
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.occupation !== undefined) updateData.occupation = dto.occupation;
    if (dto.education_level !== undefined) updateData.educationLevel = dto.education_level;
    if (dto.avatar_url !== undefined) updateData.avatarUrl = dto.avatar_url;

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: updateData,
    });

    return {
      id: profile.id,
      full_name: profile.fullName,
      occupation: profile.occupation,
      updated_at: profile.updatedAt,
    };
  }
}
