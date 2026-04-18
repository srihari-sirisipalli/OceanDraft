import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendRequest, SmsSendResult } from '../sms.types';

/**
 * Twilio Messages API — https://www.twilio.com/docs/sms/api/message-resource
 *
 * Required env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM   — e.g. "+15551234567" (a verified Twilio number)
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
        error: 'Twilio credentials are not fully configured.',
      };
    }
    try {
      const body = new URLSearchParams({ To: req.to, From: from, Body: req.text });
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${auth}`,
          },
          body: body.toString(),
        },
      );
      const payload = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      if (!resp.ok) {
        return {
          provider: this.name,
          ok: false,
          latencyMs: Date.now() - start,
          raw: payload,
          error: (payload.message as string) ?? `HTTP ${resp.status}`,
        };
      }
      return {
        provider: this.name,
        ok: true,
        providerMessageId: (payload.sid as string) ?? undefined,
        latencyMs: Date.now() - start,
        raw: payload,
      };
    } catch (e) {
      const err = e as Error;
      this.logger.error(`Twilio request failed: ${err.message}`);
      return {
        provider: this.name,
        ok: false,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  async isHealthy() {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    );
  }
}
