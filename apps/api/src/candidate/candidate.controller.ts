import { Body, Controller, Ip, Post } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { InitCandidateDto } from './dto/init-candidate.dto';

@Controller('candidates')
export class CandidateController {
  constructor(private readonly svc: CandidateService) {}

  @Post('init')
  async init(@Body() dto: InitCandidateDto, @Ip() ip: string) {
    return this.svc.init({ ...dto, ip });
  }
}
