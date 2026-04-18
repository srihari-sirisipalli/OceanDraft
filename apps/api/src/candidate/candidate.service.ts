import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  generateSessionToken,
  sha256,
} from '../common/utils/otp';
import { normalizeMobile } from '../common/utils/mobile';

@Injectable()
export class CandidateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async init(params: {
    mobile: string;
    countryCode?: string;
    consent: boolean;
    ip?: string;
  }) {
    if (!params.consent) {
      throw new BadRequestException({
        code: 'CONSENT_REQUIRED',
        message: 'Consent is required before sending the OTP.',
      });
    }
    const e164 = normalizeMobile(params.mobile, params.countryCode ?? 'IN');
    if (!e164) {
      throw new BadRequestException({
        code: 'MOBILE_INVALID',
        message: 'Please enter a valid mobile number including country code.',
      });
    }

    const candidate = await this.prisma.candidate.upsert({
      where: { mobileE164: e164 },
      update: { lastSeenAt: new Date() },
      create: {
        mobileE164: e164,
        countryCode: params.countryCode ?? 'IN',
        consentAt: new Date(),
        consentIp: params.ip,
      },
    });

    if (candidate.isBlocked) {
      throw new ForbiddenException({
        code: 'CANDIDATE_BLOCKED',
        message: 'This mobile is currently blocked.',
      });
    }

    return { candidateId: candidate.id, mobileE164: candidate.mobileE164 };
  }

  /**
   * Kiosk / walk-up flow: no mobile, no OTP.
   * Only allowed when `event.collect_mobile` is disabled by admin.
   * Issues a short-lived candidate session tied to a synthetic candidate.
   */
  async guestInit(params: { ip?: string; ua?: string }) {
    const collect = await this.settings.get<boolean>('event.collect_mobile');
    if (collect) {
      throw new ForbiddenException({
        code: 'GUEST_DISABLED',
        message: 'Guest mode is disabled.',
      });
    }

    const synthetic = `GUEST-${randomUUID()}`;
    const candidate = await this.prisma.candidate.create({
      data: {
        mobileE164: synthetic,
        countryCode: 'XX',
        consentAt: new Date(),
        consentIp: params.ip,
        notes: 'guest',
      },
    });

    const token = generateSessionToken();
    const ttl =
      this.config.get<number>('candidateSessionTtlSeconds') ?? 900;
    const session = await this.prisma.candidateSession.create({
      data: {
        candidateId: candidate.id,
        sessionTokenHash: sha256(token),
        expiresAt: new Date(Date.now() + ttl * 1000),
        ip: params.ip,
        ua: params.ua,
        captchaVerified: true, // kiosk mode bypasses captcha by default
      },
    });

    return {
      sessionToken: token,
      candidateId: candidate.id,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  }
}
