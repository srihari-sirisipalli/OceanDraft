import { Controller, Get, Headers, Ip, Req, UseGuards } from '@nestjs/common';
import {
  CandidateReq,
  CandidateSessionGuard,
} from '../common/guards/candidate-session.guard';
import { AssignmentService } from './assignment.service';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@UseGuards(CandidateSessionGuard)
@Controller('assignment')
export class AssignmentController {
  constructor(
    private readonly svc: AssignmentService,
    private readonly config: ConfigService,
  ) {}

  @Get('next')
  async next(
    @Req() req: CandidateReq,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    const captchaEnabled = this.config.get<boolean>('business.captchaEnabled');
    if (captchaEnabled && !req.candidateSession!.captchaVerified) {
      throw new ForbiddenException({ code: 'CAPTCHA_REQUIRED' });
    }
    return this.svc.nextForCandidate({
      candidateId: req.candidateSession!.candidateId,
      sessionId: req.candidateSession!.sessionId,
      ip,
      ua,
    });
  }
}
