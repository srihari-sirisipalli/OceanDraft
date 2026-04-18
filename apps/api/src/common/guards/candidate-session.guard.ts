import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { sha256 } from '../utils/otp';

export interface CandidateReq extends Request {
  candidateSession?: {
    sessionId: string;
    candidateId: string;
    captchaVerified: boolean;
  };
}

@Injectable()
export class CandidateSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<CandidateReq>();
    const token =
      (req.cookies?.od_sess as string | undefined) ??
      (req.headers['x-session-token'] as string | undefined);
    if (!token) {
      throw new UnauthorizedException({ code: 'SESSION_REQUIRED' });
    }
    const session = await this.prisma.candidateSession.findUnique({
      where: { sessionTokenHash: sha256(token) },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'SESSION_EXPIRED' });
    }
    req.candidateSession = {
      sessionId: session.id,
      candidateId: session.candidateId,
      captchaVerified: session.captchaVerified,
    };
    return true;
  }
}
