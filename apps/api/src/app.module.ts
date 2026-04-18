import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { S3Module } from './common/s3/s3.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { SmsModule } from './sms/sms.module';
import { MediaModule } from './media/media.module';
import { CandidateModule } from './candidate/candidate.module';
import { OtpModule } from './otp/otp.module';
import { CaptchaModule } from './captcha/captcha.module';
import { AssignmentModule } from './assignment/assignment.module';
import { AttemptModule } from './attempt/attempt.module';
import { ResultModule } from './result/result.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { RetentionModule } from './retention/retention.module';
import { AdminAuthModule } from './admin/auth/admin-auth.module';
import { AdminQuestionModule } from './admin/question/admin-question.module';
import { AdminCategoryModule } from './admin/category/admin-category.module';
import { AdminAttemptModule } from './admin/attempt/admin-attempt.module';
import { AdminSettingsModule } from './admin/settings/admin-settings.module';
import { AdminMediaModule } from './admin/media/admin-media.module';
import { AdminUserModule } from './admin/user/admin-user.module';
import { AdminReportModule } from './admin/report/admin-report.module';
import { AdminTemplateModule } from './admin/template/admin-template.module';
import { AdminEventModule } from './admin/event/admin-event.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'strict', ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    RedisModule,
    S3Module,
    HealthModule,
    MetricsModule,
    SmsModule,
    SettingsModule,
    AuditModule,
    RetentionModule,
    MediaModule,
    CandidateModule,
    OtpModule,
    CaptchaModule,
    AssignmentModule,
    AttemptModule,
    ResultModule,
    AdminAuthModule,
    AdminQuestionModule,
    AdminCategoryModule,
    AdminAttemptModule,
    AdminSettingsModule,
    AdminMediaModule,
    AdminUserModule,
    AdminReportModule,
    AdminTemplateModule,
    AdminEventModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, CsrfMiddleware).forRoutes('*');
  }
}
