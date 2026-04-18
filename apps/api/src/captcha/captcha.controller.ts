import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  CandidateReq,
  CandidateSessionGuard,
} from '../common/guards/candidate-session.guard';
import { CaptchaService } from './captcha.service';

class VerifyCaptchaDto {
  @IsString() @IsNotEmpty() challengeId!: string;
  @IsString() @IsNotEmpty() answer!: string;
}

@UseGuards(CandidateSessionGuard)
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly svc: CaptchaService) {}

  @Get('new')
  async issue(@Req() req: CandidateReq) {
    return this.svc.issue(req.candidateSession!.sessionId);
  }

  @Post('verify')
  async verify(@Req() req: CandidateReq, @Body() dto: VerifyCaptchaDto) {
    return this.svc.verify(req.candidateSession!.sessionId, dto.challengeId, dto.answer);
  }
}
