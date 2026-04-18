import { Body, Controller, Headers, Ip, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OtpService } from './otp.service';
import { ResendOtpDto, SendOtpDto, VerifyOtpDto } from './dto/send-otp.dto';
import { baseCookie } from '../common/utils/cookie';

@Controller('otp')
export class OtpController {
  constructor(private readonly svc: OtpService) {}

  @Post('send')
  async send(
    @Body() dto: SendOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.svc.sendOtp({ candidateId: dto.candidateId, ip, ua });
  }

  @Post('resend')
  async resend(
    @Body() dto: ResendOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.svc.resend(dto.otpRequestId, ip, ua);
  }

  @Post('verify')
  async verify(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.svc.verify({
      otpRequestId: dto.otpRequestId,
      code: dto.code,
      ip,
      ua,
    });
    res.cookie(
      'od_sess',
      r.sessionToken,
      baseCookie(r.expiresAt.getTime() - Date.now()),
    );
    return {
      sessionToken: r.sessionToken,
      captchaRequired: r.captchaRequired,
      expiresAt: r.expiresAt,
    };
  }
}
