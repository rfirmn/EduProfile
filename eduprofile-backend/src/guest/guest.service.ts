import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConvertGuestDto } from './dto/convert-guest.dto.js';

@Injectable()
export class GuestService {
  constructor(private readonly prisma: PrismaService) {}

  async convertGuest(userId: string, dto: ConvertGuestDto) {
    // Find sessions with this guest token
    const sessions = await this.prisma.testSession.findMany({
      where: {
        guestToken: dto.guest_token,
        userId: null,
      },
    });

    if (sessions.length === 0) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Guest token tidak valid atau sudah kedaluwarsa.',
      });
    }

    // Convert all guest sessions in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const session of sessions) {
        // Update session
        await tx.testSession.update({
          where: { id: session.id },
          data: {
            userId,
            isGuestConverted: true,
          },
        });

        // Update test result if exists
        await tx.testResult.updateMany({
          where: { sessionId: session.id },
          data: { userId },
        });
      }
    });

    return {
      converted_sessions: sessions.length,
      message: 'Histori test berhasil tersimpan ke akun kamu.',
    };
  }
}
