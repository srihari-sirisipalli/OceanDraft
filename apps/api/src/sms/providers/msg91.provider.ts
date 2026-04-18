import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendRequest, SmsSendResult } from '../sms.types';

/**
 * MSG91 provider stub — wire the real MSG91 OTP HTTP API here.
 * Docs: https://docs.msg91.com/overview
 * Required env: MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID
 */
@Injectable()
export class Msg91Provider implements SmsProvider {
  readonly name = 'msg91';
  private readonly logger = new Logger('Msg91Provider');

  async send(req: SmsSendRequest): Promise<SmsSendResult> {
    const start = Date.now();
    const key = process.env.MSG91_AUTH_KEY;
    if (!key) {
      return {
        provider: this.name,
        ok: false,
        latencyMs: Date.now() - start,
        error: 'MSG91_AUTH_KEY not configured',
      };
    }
    // TODO: implement real MSG91 request; returning a stub for now.
    this.logger.log(`[stub] would send MSG91 SMS to ${req.to}`);
    return {
      provider: this.name,
      ok: true,
      providerMessageId: `msg91-stub-${Date.now()}`,
      latencyMs: Date.now() - start,
    };
  }

  async isHealthy() {
    return !!process.env.MSG91_AUTH_KEY;
  }
}
