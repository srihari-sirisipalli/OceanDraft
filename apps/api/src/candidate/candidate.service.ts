import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { normalizeMobile } from '../common/utils/mobile';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

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
}
