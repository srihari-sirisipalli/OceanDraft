import {
  BadRequestException,
  GoneException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SMS_PROVIDER, SmsProvider } from '../sms/sms.types';
import {
  generateOtp,
  generateSalt,
  generateSessionToken,
  hashOtp,
  sha256,
} from '../common/utils/otp';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  private otpCfg() {
    return {
      length: this.config.get<number>('otp.length') ?? 6,
      expiry: this.config.get<number>('otp.expirySeconds') ?? 300,
      cooldown: this.config.get<number>('otp.resendCooldownSeconds') ?? 60,
      maxResends: this.config.get<number>('otp.maxResendsPer15m') ?? 3,
      maxVerify: this.config.get<number>('otp.maxVerifyAttempts') ?? 5,
      devMode: this.config.get<boolean>('otp.devMode') ?? true,
    };
  }

  async sendOtp(params: { candidateId: string; ip?: string; ua?: string }) {
    const cfg = this.otpCfg();

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: params.candidateId },
    });
    if (!candidate) throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND' });

    // Rate limit: per-mobile 15-minute window
    const windowKey = `otp:send:${candidate.mobileE164}`;
    const count = await this.redis.incrWithTtl(windowKey, 15 * 60);
    if (count > cfg.maxResends) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Cooldown
    const cooldownKey = `otp:cooldown:${candidate.mobileE164}`;
    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      throw new HttpException(
        { code: 'COOLDOWN', message: `Please wait before requesting a new code.` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.redis.setEx(cooldownKey, '1', cfg.cooldown);

    // Mark any prior ACTIVE OTPs as EXPIRED
    await this.prisma.otpRequest.updateMany({
      where: { candidateId: candidate.id, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });

    const code = generateOtp(cfg.length);
    const salt = generateSalt();
    const expiresAt = new Date(Date.now() + cfg.expiry * 1000);

    const otp = await this.prisma.otpRequest.create({
      data: {
        candidateId: candidate.id,
        otpHash: hashOtp(code, salt),
        otpSalt: salt,
        devOtpPlaintext: cfg.devMode ? code : null,
        expiresAt,
        ip: params.ip,
        ua: params.ua,
        status: 'ACTIVE',
        provider: this.sms.name,
        maxVerifyAttempts: cfg.maxVerify,
      },
    });

    const text = `Your OceanDraft verification code is ${code}. Valid for ${Math.floor(
      cfg.expiry / 60,
    )} minutes.`;

    const result = await this.sms.send({ to: candidate.mobileE164, text });

    await this.prisma.smsProviderLog.create({
      data: {
        otpRequestId: otp.id,
        provider: result.provider,
        requestPayloadJson: { to: candidate.mobileE164, text } as never,
        responsePayloadJson: (result.raw ?? {
          providerMessageId: result.providerMessageId,
          error: result.error,
        }) as never,
        status: result.ok ? 'OK' : 'FAILED',
        latencyMs: result.latencyMs,
      },
    });

    await this.prisma.otpRequest.update({
      where: { id: otp.id },
      data: {
        deliveryStatus: result.ok ? 'SENT' : 'FAILED',
        providerMessageId: result.providerMessageId,
      },
    });

    if (!result.ok) {
      throw new HttpException(
        { code: 'OTP_SEND_FAILED', message: 'Failed to send OTP.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      otpRequestId: otp.id,
      expiresAt: otp.expiresAt,
      resendAfter: cfg.cooldown,
      devOtp: cfg.devMode ? code : undefined,
    };
  }

  async resend(otpRequestId: string, ip?: string, ua?: string) {
    const otp = await this.prisma.otpRequest.findUnique({ where: { id: otpRequestId } });
    if (!otp) throw new NotFoundException({ code: 'OTP_NOT_FOUND' });
    return this.sendOtp({ candidateId: otp.candidateId, ip, ua });
  }

  async verify(params: { otpRequestId: string; code: string; ip?: string; ua?: string }) {
    const cfg = this.otpCfg();
    const otp = await this.prisma.otpRequest.findUnique({
      where: { id: params.otpRequestId },
    });
    if (!otp) throw new NotFoundException({ code: 'OTP_NOT_FOUND' });
    if (otp.status === 'LOCKED') {
      throw new BadRequestException({ code: 'OTP_LOCKED', message: 'OTP is locked.' });
    }
    if (otp.status === 'CONSUMED') {
      throw new BadRequestException({ code: 'OTP_CONSUMED' });
    }
    if (otp.expiresAt < new Date() || otp.status === 'EXPIRED') {
      await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException({ code: 'OTP_EXPIRED', message: 'OTP has expired.' });
    }

    const expectedHash = hashOtp(params.code, otp.otpSalt);
    const ok = expectedHash === otp.otpHash;

    if (!ok) {
      const attempts = otp.verifyAttempts + 1;
      const locked = attempts >= otp.maxVerifyAttempts;
      await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { verifyAttempts: attempts, status: locked ? 'LOCKED' : 'ACTIVE' },
      });
      throw new BadRequestException({
        code: locked ? 'OTP_LOCKED' : 'OTP_INVALID',
        message: locked
          ? 'Too many wrong attempts. Please request a new OTP.'
          : 'Invalid OTP code.',
      });
    }

    await this.prisma.otpRequest.update({
      where: { id: otp.id },
      data: { status: 'CONSUMED' },
    });

    // Create candidate session
    const token = generateSessionToken();
    const ttl = this.config.get<number>('candidateSessionTtlSeconds') ?? 900;
    const session = await this.prisma.candidateSession.create({
      data: {
        candidateId: otp.candidateId,
        sessionTokenHash: sha256(token),
        expiresAt: new Date(Date.now() + ttl * 1000),
        ip: params.ip,
        ua: params.ua,
      },
    });

    await this.prisma.candidate.update({
      where: { id: otp.candidateId },
      data: { lastSeenAt: new Date() },
    });

    const captchaEnabled =
      this.config.get<boolean>('business.captchaEnabled') ?? false;

    return {
      sessionToken: token,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      captchaRequired: captchaEnabled,
    };
  }
}
