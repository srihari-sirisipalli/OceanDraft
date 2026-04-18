import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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
    const templateKey = isCorrect ? 'HOORAY_DEFAULT' : 'FAIL_DEFAULT';

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

    return { resultId: updated.id };
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
