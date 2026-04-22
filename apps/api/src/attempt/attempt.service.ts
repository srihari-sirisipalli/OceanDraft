import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { attemptsSubmitted } from '../metrics/metrics.module';
import { computeDisplayTicket } from '../common/utils/display-ticket';

@Injectable()
export class AttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(params: {
    candidateId: string;
    sessionId: string;
    attemptId: string;
    optionId?: string;
    optionIds?: string[];
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

    const isMulti = attempt.question.answerType === 'MULTI';
    const selectedIds = isMulti
      ? (params.optionIds ?? (params.optionId ? [params.optionId] : []))
      : params.optionId
        ? [params.optionId]
        : (params.optionIds ?? []).slice(0, 1);

    if (selectedIds.length === 0) {
      throw new BadRequestException({ code: 'SELECTION_REQUIRED' });
    }

    const selectedOptions = attempt.question.options.filter((o) =>
      selectedIds.includes(o.id),
    );
    if (selectedOptions.length !== selectedIds.length) {
      throw new BadRequestException({ code: 'OPTION_INVALID' });
    }

    const shownAt = attempt.questionShownAt ?? attempt.startedAt;
    const submittedAt = new Date();
    const timeTakenMs = submittedAt.getTime() - shownAt.getTime();

    // Correctness: SINGLE = the single pick is isCorrect; MULTI = selected set
    // equals the correct set exactly (all-and-only).
    let isCorrect: boolean;
    if (isMulti) {
      const correctIds = new Set(
        attempt.question.options.filter((o) => o.isCorrect).map((o) => o.id),
      );
      const pickedIds = new Set(selectedIds);
      isCorrect =
        correctIds.size === pickedIds.size &&
        [...correctIds].every((id) => pickedIds.has(id));
    } else {
      isCorrect = selectedOptions[0].isCorrect;
    }

    // Template resolution (per-category override, else random pool).
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
        // For single: also populate the legacy selectedOptionId link.
        selectedOptionId: isMulti ? null : selectedOptions[0].id,
        selectedOptionIds: selectedIds,
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
          answerType: attempt.question.answerType,
          selectedOptionIds: selectedIds,
          selectedOptionTexts: selectedOptions.map((o) => o.textMarkdown),
          timeTakenMs,
        } as never,
      },
    });

    attemptsSubmitted.inc({ result: isCorrect ? 'correct' : 'wrong' });
    return {
      resultId: updated.id,
      status: (isCorrect ? 'CORRECT' : 'WRONG') as 'CORRECT' | 'WRONG',
    };
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
      // Pick a random EXPIRE_* template so the result page can show a
      // timeout-themed headline instead of a pass/fail one.
      const pool = await this.prisma.resultTemplate.findMany({
        where: { key: { startsWith: 'EXPIRE_' }, isActive: true },
        select: { key: true },
      });
      const templateKey =
        pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)].key
          : 'EXPIRE_DEFAULT';
      await this.prisma.attempt.update({
        where: { id: attempt.id },
        data: {
          status: 'EXPIRED',
          answerSubmittedAt: new Date(),
          resultTemplateUsed: templateKey,
        },
      });
    }
    return { ok: true };
  }

  async result(params: { candidateId: string; attemptId: string }) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: params.attemptId },
      include: {
        question: { include: { options: true, category: true } },
        selectedOption: true,
        resultRecord: true,
      },
    });
    if (!attempt) throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND' });
    if (attempt.candidateId !== params.candidateId) {
      throw new BadRequestException({ code: 'ATTEMPT_OWNERSHIP_MISMATCH' });
    }
    if (attempt.status !== 'SUBMITTED' && attempt.status !== 'EXPIRED') {
      throw new BadRequestException({ code: 'ATTEMPT_NOT_SUBMITTED' });
    }

    const isExpired = attempt.status === 'EXPIRED';
    const templateKey =
      attempt.resultTemplateUsed ??
      (isExpired ? 'EXPIRE_DEFAULT' : 'FAIL_DEFAULT');
    const template = await this.prisma.resultTemplate.findUnique({
      where: { key: templateKey },
    });

    const reveal = template?.revealCorrectOnFail ?? false;
    const correctOptions =
      !attempt.isCorrect && (reveal || isExpired)
        ? attempt.question.options.filter((o) => o.isCorrect)
        : [];

    return {
      status: isExpired
        ? 'EXPIRED'
        : attempt.isCorrect
          ? 'CORRECT'
          : 'WRONG',
      headline:
        template?.headline ??
        (isExpired
          ? "Time's up, captain"
          : attempt.isCorrect
            ? 'Hooray!'
            : 'Not quite'),
      body: template?.bodyMarkdown ?? '',
      ticketNumber: attempt.question.ticketNumber ?? null,
      displayTicketNumber: computeDisplayTicket(attempt.question.ticketNumber),
      category: attempt.question.category
        ? {
            slug: attempt.question.category.slug,
            name: attempt.question.category.name,
          }
        : null,
      timeLimitSeconds: attempt.question.timeLimitSeconds ?? null,
      correctOption:
        correctOptions.length === 1
          ? { id: correctOptions[0].id, text: correctOptions[0].textMarkdown }
          : null,
      correctOptions: correctOptions.map((o) => ({
        id: o.id,
        text: o.textMarkdown,
      })),
      timings: {
        timeTakenMs: attempt.timeTakenMs,
        questionShownAt: attempt.questionShownAt,
        answerSubmittedAt: attempt.answerSubmittedAt,
      },
    };
  }
}
