import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendRequest, SmsSendResult } from '../sms.types';

@Injectable()
export class DevSmsProvider implements SmsProvider {
  readonly name = 'dev';
  private readonly logger = new Logger('DevSmsProvider');

  async send(req: SmsSendRequest): Promise<SmsSendResult> {
    const start = Date.now();
    this.logger.warn(
      `\n========== DEV OTP ==========\nTo: ${req.to}\nText: ${req.text}\n=============================\n`,
    );
    return {
      provider: 'dev',
      ok: true,
      providerMessageId: `dev-${Date.now()}`,
      latencyMs: Date.now() - start,
    };
  }

  async isHealthy() {
    return true;
  }
}
