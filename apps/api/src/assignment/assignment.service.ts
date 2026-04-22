import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssignmentMode, Prisma } from '@prisma/client';

type AttemptPolicy = 'SINGLE_LIFETIME' | 'SINGLE_PER_DAY' | 'UNLIMITED';
import { PrismaService } from '../common/prisma/prisma.service';
import { computeDisplayTicket } from '../common/utils/display-ticket';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async nextForCandidate(params: {
    candidateId: string;
    sessionId: string;
    ip?: string;
    ua?: string;
  }) {
    // 1. Check per-mobile attempt policy.
    const policyStr =
      (await this.readSetting<string>('attempt.policy')) ??
      this.config.get<string>('business.attemptPolicy') ??
      'SINGLE_LIFETIME';
    const policy = policyStr as AttemptPolicy;

    if (policy === 'SINGLE_LIFETIME') {
      const prior = await this.prisma.attempt.findFirst({
        where: { candidateId: params.candidateId, status: 'SUBMITTED' },
      });
      if (prior) {
        throw new ConflictException({
          code: 'ATTEMPT_ALREADY_SUBMITTED',
          message: 'This mobile has already completed an attempt.',
        });
      }
    } else if (policy === 'SINGLE_PER_DAY') {
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const prior = await this.prisma.attempt.findFirst({
        where: {
          candidateId: params.candidateId,
          status: 'SUBMITTED',
          answerSubmittedAt: { gte: since },
        },
      });
      if (prior) {
        throw new ConflictException({
          code: 'ATTEMPT_COOLDOWN',
          message: 'Try again after 24 hours.',
        });
      }
    }

    // Steps 2-5 (existing-check → pick question → create attempt) run
    // inside a Serializable transaction with one retry. Prevents a race
    // where two parallel requests from the same session both pass the
    // "no IN_PROGRESS" check and insert duplicate attempts.
    const runPick = async (): Promise<ReturnType<AssignmentService['fetchAttempt']>> =>
      this.prisma.$transaction(
        async (tx) => {
          // 2. If this session already has an IN_PROGRESS attempt, return it.
          const existing = await tx.attempt.findFirst({
            where: { sessionId: params.sessionId, status: 'IN_PROGRESS' },
            include: {
              question: {
                include: {
                  options: { orderBy: { orderIndex: 'asc' } },
                  primaryMedia: true,
                  category: true,
                },
              },
            },
          });
          if (existing) return existing;

          // 3. Determine assignment mode.
          const modeStr =
            (await this.readSettingTx(tx, 'assignment.mode')) ??
            this.config.get<string>('business.assignmentMode') ??
            'RANDOM_ACTIVE';
          const mode = modeStr as AssignmentMode;

          // 4. Resolve question pool.
          const seenQuestionIds = (
            await tx.attempt.findMany({
              where: { candidateId: params.candidateId },
              select: { questionId: true },
            })
          ).map((a) => a.questionId);

          let questionId: string | null = null;

          if (mode === 'MANUAL_BY_MOBILE') {
            const manual = await tx.candidateQuestionAssignment.findFirst({
              where: { candidateId: params.candidateId, active: true },
              orderBy: { assignedAt: 'desc' },
            });
            if (!manual) throw new NotFoundException({ code: 'NO_MANUAL_ASSIGNMENT' });
            questionId = manual.questionId;
          } else if (mode === 'ALL_SAME') {
            const designatedId = await this.readSettingTx<string>(
              tx,
              'assignment.all_same_question_id',
            );
            if (!designatedId) throw new NotFoundException({ code: 'NO_DESIGNATED_QUESTION' });
            questionId = designatedId;
          } else if (mode === 'ONE_TIME_USE_POOL') {
            const usedIds = (
              await tx.attempt.findMany({
                where: { status: { in: ['SUBMITTED', 'IN_PROGRESS'] } },
                select: { questionId: true },
                distinct: ['questionId'],
              })
            ).map((a) => a.questionId);
            const ids = await tx.question.findMany({
              where: {
                isActive: true,
                ...(usedIds.length ? { id: { notIn: usedIds } } : {}),
              },
              select: { id: true },
            });
            if (ids.length === 0) {
              throw new NotFoundException({
                code: 'NO_ACTIVE_QUESTION',
                message: 'The one-time-use pool is empty — no fresh questions remain.',
              });
            }
            questionId = ids[Math.floor(Math.random() * ids.length)].id;
          } else {
            const whereBase = {
              isActive: true,
              ...(seenQuestionIds.length ? { id: { notIn: seenQuestionIds } } : {}),
              ...(mode === 'RANDOM_BY_CATEGORY'
                ? {
                    categoryId:
                      (await this.readSettingTx<string>(tx, 'assignment.category_id')) ?? undefined,
                  }
                : {}),
            } as const;
            const ids = await tx.question.findMany({
              where: whereBase,
              select: { id: true },
            });
            if (ids.length === 0) {
              throw new NotFoundException({
                code: 'NO_ACTIVE_QUESTION',
                message: 'The dry dock is empty — no active questions are available.',
              });
            }
            questionId = ids[Math.floor(Math.random() * ids.length)].id;
          }

          if (!questionId) {
            throw new NotFoundException({ code: 'NO_ACTIVE_QUESTION' });
          }

          const question = await tx.question.findUnique({
            where: { id: questionId },
            include: {
              options: { orderBy: { orderIndex: 'asc' } },
              primaryMedia: true,
              category: true,
            },
          });
          if (!question || !question.isActive) {
            throw new NotFoundException({ code: 'QUESTION_UNAVAILABLE' });
          }

          // 5. Create IN_PROGRESS attempt.
          return tx.attempt.create({
            data: {
              candidateId: params.candidateId,
              sessionId: params.sessionId,
              questionId: question.id,
              questionVersion: question.version,
              status: 'IN_PROGRESS',
              questionShownAt: new Date(),
              ip: params.ip,
              ua: params.ua,
            },
            include: {
              question: {
                include: {
                  options: { orderBy: { orderIndex: 'asc' } },
                  primaryMedia: true,
                  category: true,
                },
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

    let attempt: Awaited<ReturnType<typeof runPick>>;
    try {
      attempt = await runPick();
    } catch (e) {
      // Retry once on serialization failure (Prisma P2034), second failure propagates.
      if ((e as { code?: string }).code === 'P2034') {
        attempt = await runPick();
      } else {
        throw e;
      }
    }

    return this.toPayload(attempt);
  }

  private async readSettingTx<T>(
    tx: Prisma.TransactionClient,
    key: string,
  ): Promise<T | undefined> {
    const row = await tx.appSetting.findUnique({ where: { key } });
    return (row?.valueJson as T | undefined) ?? undefined;
  }

  private toPayload(
    attempt: Awaited<ReturnType<AssignmentService['fetchAttempt']>>,
  ) {
    if (!attempt) throw new NotFoundException();
    const displayTicketNumber = computeDisplayTicket(
      attempt.question.ticketNumber,
    );
    return {
      attemptId: attempt.id,
      ticketNumber: attempt.question.ticketNumber ?? null,
      displayTicketNumber,
      timeLimitSeconds: attempt.question.timeLimitSeconds ?? null,
      category: attempt.question.category
        ? {
            slug: attempt.question.category.slug,
            name: attempt.question.category.name,
          }
        : null,
      question: {
        id: attempt.question.id,
        ticketNumber: attempt.question.ticketNumber ?? null,
        displayTicketNumber,
        timeLimitSeconds: attempt.question.timeLimitSeconds ?? null,
        title: attempt.question.title,
        stem: attempt.question.stemMarkdown,
        type: attempt.question.type,
        answerType: attempt.question.answerType,
        category: attempt.question.category
          ? {
              slug: attempt.question.category.slug,
              name: attempt.question.category.name,
            }
          : null,
        primaryMedia: attempt.question.primaryMedia
          ? {
              id: attempt.question.primaryMedia.id,
              url: `/api/v1/media/${attempt.question.primaryMedia.id}`,
              altText: attempt.question.primaryMedia.altText ?? '',
            }
          : null,
        options: attempt.question.options.map((o) => ({
          id: o.id,
          orderIndex: o.orderIndex,
          text: o.textMarkdown,
          // deliberately NOT returning isCorrect
        })),
      },
    };
  }

  private async fetchAttempt(id: string) {
    return this.prisma.attempt.findUnique({
      where: { id },
      include: {
        question: {
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
            primaryMedia: true,
            category: true,
          },
        },
      },
    });
  }

  private async readSetting<T>(key: string): Promise<T | undefined> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return (row?.valueJson as T | undefined) ?? undefined;
  }
}
