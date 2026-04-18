import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Receives delivery-report webhooks from SMS providers.
 * Accepts either MSG91-style or Twilio-style payloads and marks
 * the matching otp_request.delivery_status.
 *
 * Configure this URL with your provider:
 *   https://<your-host>/api/v1/otp/webhook
 *
 * Auth is via a shared secret in the `X-Webhook-Secret` header.
 * Env: OTP_WEBHOOK_SECRET
 */
@Controller('otp/webhook')
export class OtpWebhookController {
  private readonly logger = new Logger('OtpWebhook');
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    const expected = process.env.OTP_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      return { ok: false, error: 'invalid secret' };
    }

    const providerMessageId =
      (body.request_id as string) ??
      (body.MessageSid as string) ??
      (body.sid as string) ??
      undefined;
    if (!providerMessageId) return { ok: true, note: 'no message id' };

    const statusRaw =
      (body.MessageStatus as string) ??
      (body.status as string) ??
      (body.type as string) ??
      '';
    const s = statusRaw.toLowerCase();
    const mapped =
      s.includes('deliver')
        ? 'DELIVERED'
        : s.includes('sent') || s.includes('queued') || s.includes('success')
          ? 'SENT'
          : s.includes('fail') || s.includes('undeliver') || s.includes('reject')
            ? 'FAILED'
            : 'SENT';

    const updated = await this.prisma.otpRequest.updateMany({
      where: { providerMessageId },
      data: { deliveryStatus: mapped as 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING' },
    });
    this.logger.log(
      `Webhook: ${providerMessageId} → ${mapped} (rows=${updated.count})`,
    );
    return { ok: true, updated: updated.count };
  }
}
