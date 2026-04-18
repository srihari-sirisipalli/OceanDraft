import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CaptchaService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async issue(sessionId: string) {
    const a = randomInt(2, 15);
    const b = randomInt(2, 15);
    const prompt = `What is ${a} + ${b}?`;
    const answer = String(a + b);
    const challengeId = randomUUID();
    const key = `captcha:${sessionId}:${challengeId}`;
    await this.redis.setEx(key, answer, 60);
    return { challengeId, prompt };
  }

  async verify(sessionId: string, challengeId: string, answer: string) {
    const key = `captcha:${sessionId}:${challengeId}`;
    const expected = await this.redis.get(key);
    if (!expected) {
      throw new BadRequestException({ code: 'CAPTCHA_EXPIRED' });
    }
    const ok = expected.trim() === String(answer).trim();
    if (!ok) {
      throw new BadRequestException({ code: 'CAPTCHA_INVALID' });
    }
    await this.redis.del(key);
    await this.prisma.candidateSession.update({
      where: { id: sessionId },
      data: { captchaVerified: true },
    });
    return { ok: true };
  }
}
