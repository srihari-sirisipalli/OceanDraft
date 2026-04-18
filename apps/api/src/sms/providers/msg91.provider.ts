import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendRequest, SmsSendResult } from '../sms.types';

/**
 * MSG91 SendOTP-style flow (v5 Flow API).
 * Sends a templated message via MSG91. See https://docs.msg91.com/
 *
 * Required env:
 *   MSG91_AUTH_KEY      — auth key from the MSG91 console
 *   MSG91_TEMPLATE_ID   — DLT-registered flow template ID (required in India)
 *   MSG91_SENDER_ID     — 6-char sender ID (optional if template has one)
 *
 * The template must contain a variable named `otp` that holds the code —
 * OceanDraft extracts the 6-digit OTP from the message text and passes it as
 * `var.otp` to MSG91.
 */
@Injectable()
export class Msg91Provider implements SmsProvider {
  readonly name = 'msg91';
  private readonly logger = new Logger('Msg91Provider');

  async send(req: SmsSendRequest): Promise<SmsSendResult> {
    const start = Date.now();
    const key = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID;
    if (!key || !templateId) {
      return {
        provider: this.name,
        ok: false,
        latencyMs: Date.now() - start,
        error: 'MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required.',
      };
    }

    // Strip '+' for MSG91 mobile format
    const mobiles = req.to.replace(/^\+/, '');
    const otp = /\b(\d{4,8})\b/.exec(req.text)?.[1];

    const body = {
      template_id: templateId,
      short_url: '0',
      recipients: [
        {
          mobiles,
          ...(otp ? { otp } : {}),
          ...(req.context ?? {}),
        },
      ],
      ...(senderId ? { sender: senderId } : {}),
    };

    try {
      const resp = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: key,
        },
        body: JSON.stringify(body),
      });
      const payload = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      if (!resp.ok || payload.type === 'error') {
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
        providerMessageId: (payload.request_id as string) ?? String(Date.now()),
        latencyMs: Date.now() - start,
        raw: payload,
      };
    } catch (e) {
      const err = e as Error;
      this.logger.error(`MSG91 request failed: ${err.message}`);
      return {
        provider: this.name,
        ok: false,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  async isHealthy() {
    return !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
  }
}
