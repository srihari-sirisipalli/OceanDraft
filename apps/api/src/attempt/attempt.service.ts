import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { attemptsSubmitted } from '../metrics/metrics.module';

@Injectable()
export class AttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(params: {
    candidateId: string;
    sessionId: string;
    attemptId: string;
    optionId: string;
    clientNonce: string;
  }) {
    // Nonce replay check
    const existingNonce = await this.prisma.attempt.findFirst({
      where: { clientNonce: params.clientNonce },
      select: { id: true, status: true },
    });
    if (existingNonce && existingNonce.id !== params.attemptId) {
      throw new ConflictException({ code: 'NONCE_REUSED' });
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: params.attemptId },
      include: { question: { include: { options: true } } },
    });
    if (!attempt) throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND' });
    if (attempt.candidateId !== params.candidateId || attempt.sessionId !== params.sessionId) {
      throw new BadRequestException({ code: 'ATTEMPT_OWNERSHIP_MISMATCH' });
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'ATTEMPT_ALREADY_SUBMITTED',
        message: 'This attempt has already been submitted.',
      });
    }

    const option = attempt.question.options.find((o) => o.id === params.optionId);
    if (!option) throw new BadRequestException({ code: 'OPTION_INVALID' });

    const shownAt = attempt.questionShownAt ?? attempt.startedAt;
    const submittedAt = new Date();
    const timeTakenMs = submittedAt.getTime() - shownAt.getTime();
    const isCorrect = option.isCorrect;

    // Look for a per-category override first, e.g. HOORAY_CAT_ship-stability.
    const question = await this.prisma.question.findUnique({
      where: { id: attempt.questionId },
      include: { category: true },
    });
    const base = isCorrect ? 'HOORAY' : 'FAIL';
    const slug = question?.category.slug ?? '';
    const overrideKey = `${base}_CAT_${slug}`;
    const override = slug
      ? await this.prisma.resultTemplate.findFirst({
          where: { key: overrideKey, isActive: true },
        })
      : null;
    let templateKey = override?.key ?? `${base}_DEFAULT`;
    if (!override) {
      // Random pick from the HOORAY_* / FAIL_* pool (excluding category-specific keys).
      const poolCandidates = await this.prisma.resultTemplate.findMany({
        where: { key: { startsWith: `${base}_` }, isActive: true },
        select: { key: true },
      });
      const pool = poolCandidates.filter((p) => !p.key.includes('_CAT_'));
      if (pool.length > 0) {
        templateKey = pool[Math.floor(Math.random() * pool.length)].key;
      }
    }

    const updated = await this.prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        selectedOptionId: option.id,
        status: 'SUBMITTED',
        isCorrect,
        answerSubmittedAt: submittedAt,
        timeTakenMs,
        clientNonce: params.clientNonce,
        resultTemplateUsed: templateKey,
      },
    });

    await this.prisma.resultRecord.create({
      data: {
        attemptId: updated.id,
        pass: isCorrect,
        templateKey,
        contentSnapshot: {
          questionId: attempt.questionId,
          questionTitle: attempt.question.title,
          selectedOptionId: option.id,
          selectedOptionText: option.textMarkdown,
          timeTakenMs,
        } as never,
      },
    });

    attemptsSubmitted.inc({ result: isCorrect ? 'correct' : 'wrong' });
    return { resultId: updated.id };
  }

  async expire(params: { candidateId: string; attemptId: string }) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: params.attemptId },
    });
    if (!attempt) throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND' });
    if (attempt.candidateId !== params.candidateId) {
      throw new BadRequestException({ code: 'ATTEMPT_OWNERSHIP_MISMATCH' });
    }
    if (attempt.status === 'IN_PROGRESS') {
      await this.prisma.attempt.update({
        where: { id: attempt.id },
        data: { status: 'EXPIRED', answerSubmittedAt: new Date() },
      });
    }
    return { ok: true };
  }

  async result(params: { candidateId: string; attemptId: string }) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: params.attemptId },
      include: {
        question: { include: { options: true } },
        selectedOption: true,
        resultRecord: true,
      },
    });
    if (!attempt) throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND' });
    if (attempt.candidateId !== params.candidateId) {
      throw new BadRequestException({ code: 'ATTEMPT_OWNERSHIP_MISMATCH' });
    }
    if (attempt.status !== 'SUBMITTED') {
      throw new BadRequestException({ code: 'ATTEMPT_NOT_SUBMITTED' });
    }

    const templateKey = attempt.resultTemplateUsed ?? 'FAIL_DEFAULT';
    const template = await this.prisma.resultTemplate.findUnique({
      where: { key: templateKey },
    });

    const reveal = template?.revealCorrectOnFail ?? false;
    const correctOption =
      !attempt.isCorrect && reveal
        ? attempt.question.options.find((o) => o.isCorrect)
        : null;

    return {
      status: attempt.isCorrect ? 'CORRECT' : 'WRONG',
      headline: template?.headline ?? (attempt.isCorrect ? 'Hooray!' : 'Not quite'),
      body: template?.bodyMarkdown ?? '',
      correctOption: correctOption
        ? { id: correctOption.id, text: correctOption.textMarkdown }
        : null,
      timings: {
        timeTakenMs: attempt.timeTakenMs,
        questionShownAt: attempt.questionShownAt,
        answerSubmittedAt: attempt.answerSubmittedAt,
      },
    };
  }
}
