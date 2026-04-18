import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpWebhookController } from './otp-webhook.controller';
import { OtpService } from './otp.service';

@Module({
  controllers: [OtpController, OtpWebhookController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
