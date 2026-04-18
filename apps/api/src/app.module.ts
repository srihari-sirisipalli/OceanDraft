import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './health/health.module';
import { SmsModule } from './sms/sms.module';
import { CandidateModule } from './candidate/candidate.module';
import { OtpModule } from './otp/otp.module';
import { CaptchaModule } from './captcha/captcha.module';
import { AssignmentModule } from './assignment/assignment.module';
import { AttemptModule } from './attempt/attempt.module';
import { ResultModule } from './result/result.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { AdminAuthModule } from './admin/auth/admin-auth.module';
import { AdminQuestionModule } from './admin/question/admin-question.module';
import { AdminAttemptModule } from './admin/attempt/admin-attempt.module';
import { AdminSettingsModule } from './admin/settings/admin-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    RedisModule,
    HealthModule,
    SmsModule,
    SettingsModule,
    AuditModule,
    CandidateModule,
    OtpModule,
    CaptchaModule,
    AssignmentModule,
    AttemptModule,
    ResultModule,
    AdminAuthModule,
    AdminQuestionModule,
    AdminAttemptModule,
    AdminSettingsModule,
  ],
})
export class AppModule {}
