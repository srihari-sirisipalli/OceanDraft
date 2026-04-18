import { Body, Controller, Headers, Ip, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CandidateService } from './candidate.service';
import { InitCandidateDto } from './dto/init-candidate.dto';

@Controller('candidates')
export class CandidateController {
  constructor(private readonly svc: CandidateService) {}

  @Post('init')
  async init(@Body() dto: InitCandidateDto, @Ip() ip: string) {
    return this.svc.init({ ...dto, ip });
  }

  @Post('guest')
  async guest(
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.svc.guestInit({ ip, ua });
    res.cookie('od_sess', r.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: r.expiresAt.getTime() - Date.now(),
      path: '/',
    });
    return {
      sessionToken: r.sessionToken,
      candidateId: r.candidateId,
      expiresAt: r.expiresAt,
    };
  }
}
