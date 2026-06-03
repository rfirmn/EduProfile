import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { TestSessionModule } from './test-session/test-session.module.js';
import { ProfileTestModule } from './profile-test/profile-test.module.js';
import { SelfPerceptionModule } from './self-perception/self-perception.module.js';
import { PerformanceModule } from './performance/performance.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { ResultModule } from './result/result.module.js';
import { GuestModule } from './guest/guest.module.js';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    ProfileModule,
    TestSessionModule,
    ProfileTestModule,
    SelfPerceptionModule,
    PerformanceModule,
    ScoringModule,
    ResultModule,
    GuestModule,
  ],
})
export class AppModule {}
