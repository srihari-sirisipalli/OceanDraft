import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  CandidateReq,
  CandidateSessionGuard,
} from '../common/guards/candidate-session.guard';
import { AttemptService } from './attempt.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@UseGuards(CandidateSessionGuard)
@Controller('attempts')
export class AttemptController {
  constructor(private readonly svc: AttemptService) {}

  @Post('submit')
  async submit(@Req() req: CandidateReq, @Body() dto: SubmitAnswerDto) {
    return this.svc.submit({
      candidateId: req.candidateSession!.candidateId,
      sessionId: req.candidateSession!.sessionId,
      attemptId: dto.attemptId,
      optionId: dto.optionId,
      clientNonce: dto.clientNonce,
    });
  }

  @Post('expire')
  async expire(
    @Req() req: CandidateReq,
    @Body() body: { attemptId: string },
  ) {
    return this.svc.expire({
      candidateId: req.candidateSession!.candidateId,
      attemptId: body.attemptId,
    });
  }
}
