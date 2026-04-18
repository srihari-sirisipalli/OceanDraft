import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminGuard, AdminRoles } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { maskMobile } from '../../common/utils/mobile';

class ListQuery {
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() result?: 'CORRECT' | 'WRONG' | 'ALL';
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN', 'OPS', 'AUDITOR')
@Controller('admin/attempts')
export class AdminAttemptController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ListQuery) {
    const where: Record<string, unknown> = { status: 'SUBMITTED' };
    if (q.result === 'CORRECT') where.isCorrect = true;
    if (q.result === 'WRONG') where.isCorrect = false;
    if (q.from || q.to) {
      where.answerSubmittedAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.attempt.findMany({
        where,
        include: {
          candidate: true,
          question: { include: { category: true } },
          selectedOption: true,
        },
        orderBy: { answerSubmittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attempt.count({ where }),
    ]);

    return {
      rows: rows.map((r) => ({
        attemptId: r.id,
        maskedMobile: maskMobile(r.candidate.mobileE164),
        questionTitle: r.question.title,
        category: r.question.category.name,
        result: r.isCorrect ? 'CORRECT' : 'WRONG',
        timeTakenMs: r.timeTakenMs,
        submittedAt: r.answerSubmittedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const r = await this.prisma.attempt.findUnique({
      where: { id },
      include: {
        candidate: true,
        question: { include: { options: { orderBy: { orderIndex: 'asc' } }, category: true } },
        selectedOption: true,
        resultRecord: true,
      },
    });
    if (!r) return null;
    return {
      ...r,
      candidate: { ...r.candidate, mobileE164: maskMobile(r.candidate.mobileE164) },
    };
  }
}
