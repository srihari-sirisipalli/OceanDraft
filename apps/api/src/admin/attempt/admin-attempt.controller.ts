import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { maskMobile } from '../../common/utils/mobile';
import { AuditService } from '../../audit/audit.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private whereClause(q: ListQuery) {
    const where: Record<string, unknown> = { status: 'SUBMITTED' };
    if (q.result === 'CORRECT') where.isCorrect = true;
    if (q.result === 'WRONG') where.isCorrect = false;
    if (q.from || q.to) {
      where.answerSubmittedAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    return where;
  }

  @Get()
  async list(@Query() q: ListQuery) {
    const where = this.whereClause(q);
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

  @Get('export')
  async exportCsv(
    @Query() q: ListQuery,
    @Res() res: Response,
    @Req() req: AdminReq,
  ) {
    const where = this.whereClause(q);
    const rows = await this.prisma.attempt.findMany({
      where,
      include: {
        candidate: true,
        question: { include: { category: true } },
        selectedOption: true,
      },
      orderBy: { answerSubmittedAt: 'desc' },
      take: 50_000,
    });

    const header = [
      'attempt_id',
      'masked_mobile',
      'country_code',
      'category',
      'question_title',
      'selected_option',
      'result',
      'is_correct',
      'time_taken_ms',
      'question_shown_at',
      'answer_submitted_at',
      'ip',
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          maskMobile(r.candidate.mobileE164),
          r.candidate.countryCode,
          r.question.category.name,
          r.question.title,
          r.selectedOption?.textMarkdown ?? '',
          r.isCorrect ? 'CORRECT' : 'WRONG',
          r.isCorrect ? 'true' : 'false',
          r.timeTakenMs ?? '',
          r.questionShownAt?.toISOString() ?? '',
          r.answerSubmittedAt?.toISOString() ?? '',
          r.ip ?? '',
        ]
          .map(escape)
          .join(','),
      );
    }

    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'export.attempts.csv',
      entityType: 'Export',
      after: { rows: rows.length, filters: q },
    });

    const filename = `oceandraft-attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const r = await this.prisma.attempt.findUnique({
      where: { id },
      include: {
        candidate: true,
        question: {
          include: { options: { orderBy: { orderIndex: 'asc' } }, category: true },
        },
        selectedOption: true,
        resultRecord: true,
      },
    });
    if (!r) return null;
    return {
      ...r,
      candidate: {
        ...r.candidate,
        mobileE164: maskMobile(r.candidate.mobileE164),
      },
    };
  }
}
