import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendRequest, SmsSendResult } from '../sms.types';

/**
 * Twilio provider stub — wire the real Twilio Messages API here.
 * Required env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 */
@Injectable()
export class TwilioProvider implements SmsProvider {
  readonly name = 'twilio';
  private readonly logger = new Logger('TwilioProvider');

  async send(req: SmsSendRequest): Promise<SmsSendResult> {
    const start = Date.now();
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) {
      return {
        provider: this.name,
        ok: false,
        latencyMs: Date.now() - start,
        error: 'Twilio credentials not configured',
      };
    }
    // TODO: implement real Twilio request; returning a stub for now.
    this.logger.log(`[stub] would send Twilio SMS to ${req.to}`);
    return {
      provider: this.name,
      ok: true,
      providerMessageId: `twilio-stub-${Date.now()}`,
      latencyMs: Date.now() - start,
    };
  }

  async isHealthy() {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }
}
