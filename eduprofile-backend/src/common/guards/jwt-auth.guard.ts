import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { IS_GUEST_OR_AUTH_KEY } from '../decorators/guest-or-auth.decorator.js';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isGuestOrAuth = this.reflector.getAllAndOverride<boolean>(
      IS_GUEST_OR_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<Request>();

    // Try Bearer token first
    const token = this.extractTokenFromHeader(request);
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        request['user'] = {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        };
        return true;
      } catch {
        if (!isGuestOrAuth) {
          throw new UnauthorizedException({
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token tidak valid atau sudah expired.',
          });
        }
      }
    }

    // If guest-or-auth, check X-Guest-Token header
    if (isGuestOrAuth) {
      const guestToken = request.headers['x-guest-token'] as string;
      if (guestToken) {
        request['guestToken'] = guestToken;
        return true;
      }
      // Both missing for guest-or-auth — still allow but no identity
      // The controller/service will handle the case
      return true;
    }

    throw new UnauthorizedException({
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Token tidak ditemukan. Silakan login terlebih dahulu.',
    });
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
