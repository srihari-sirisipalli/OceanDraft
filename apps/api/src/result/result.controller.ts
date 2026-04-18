import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  CandidateReq,
  CandidateSessionGuard,
} from '../common/guards/candidate-session.guard';
import { AttemptService } from '../attempt/attempt.service';

@UseGuards(CandidateSessionGuard)
@Controller('attempts/:id/result')
export class ResultController {
  constructor(private readonly attempts: AttemptService) {}

  @Get()
  async get(@Req() req: CandidateReq, @Param('id') id: string) {
    return this.attempts.result({
      candidateId: req.candidateSession!.candidateId,
      attemptId: id,
    });
  }
}
