import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto, VerifyEmailDto } from './dto/index.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException({
        code: 'VALIDATION_ERROR',
        message: 'Email sudah terdaftar.',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
      },
    });

    // Generate tokens
    const { accessToken, expiresAt } = await this.generateAccessToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_verified_at: user.emailVerifiedAt,
        created_at: user.createdAt,
      },
      token: accessToken,
      token_expires_at: expiresAt,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Email atau password salah.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Email atau password salah.',
      });
    }

    // Generate tokens
    const { accessToken, expiresAt } = await this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Save refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Build profile response
    const profileData = user.profile
      ? {
          full_name: user.profile.fullName,
          occupation: user.profile.occupation,
          avatar_url: user.profile.avatarUrl,
          current_learning_style: user.profile.currentLearningStyle,
          current_learning_pace: user.profile.currentLearningPace,
          last_test_at: user.profile.lastTestAt,
        }
      : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_verified_at: user.emailVerifiedAt,
      },
      profile: profileData,
      token: accessToken,
      token_expires_at: expiresAt,
      refresh_token: refreshToken,
    };
  }

  async logout(userId: string) {
    // Clear refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logout berhasil.' };
  }

  async refresh(dto: RefreshTokenDto) {
    // Verify refresh token
    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Refresh token tidak valid atau sudah expired.',
      });
    }

    // Verify refresh token matches stored one
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.refreshToken !== dto.refresh_token) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Refresh token tidak valid.',
      });
    }

    // Generate new access token
    const { accessToken, expiresAt } = await this.generateAccessToken(
      user.id,
      user.email,
      user.role,
    );

    return {
      token: accessToken,
      token_expires_at: expiresAt,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    // For MVP: token is the user ID (simple approach)
    // In production, use a proper verification token system
    const user = await this.prisma.user.findUnique({
      where: { id: dto.token },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'VALIDATION_ERROR',
        message: 'Token verifikasi tidak valid.',
      });
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Email sudah diverifikasi sebelumnya.',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    return { message: 'Email berhasil diverifikasi.' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'VALIDATION_ERROR',
        message: 'User tidak ditemukan.',
      });
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Email sudah diverifikasi sebelumnya.',
      });
    }

    // TODO: Send actual verification email
    // For MVP, just return success
    return { message: 'Email verifikasi telah dikirim ulang.' };
  }

  // --- Private helpers ---

  private async generateAccessToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; expiresAt: string }> {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: expiresIn as any,
      },
    );

    // Calculate expiry date
    const expiresAt = new Date();
    const hours = parseInt(expiresIn) || 24;
    expiresAt.setHours(expiresAt.getHours() + hours);

    return { accessToken, expiresAt: expiresAt.toISOString() };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    return this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: expiresIn as any,
      },
    );
  }
}
