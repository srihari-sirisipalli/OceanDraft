import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import ExcelJS from 'exceljs';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { maskMobile, normalizeMobile } from '../../common/utils/mobile';
import { AuditService } from '../../audit/audit.service';

class ListQuery {
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() result?: 'CORRECT' | 'WRONG' | 'ALL';
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() format?: 'csv' | 'xlsx';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
}

class ResetAttemptsDto {
  @IsString() @IsNotEmpty() mobile!: string;
  @IsString() @IsNotEmpty() reason!: string;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN', 'OPS', 'AUDITOR')
@Controller('admin/attempts')
export class AdminAttemptController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
  async exportAttempts(
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

    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: `export.attempts.${q.format ?? 'csv'}`,
      entityType: 'Export',
      after: { rows: rows.length, filters: q },
    });

    const baseName = `oceandraft-attempts-${new Date().toISOString().slice(0, 10)}`;

    if (q.format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'OceanDraft';
      wb.created = new Date();
      const ws = wb.addWorksheet('Attempts');
      ws.columns = [
        { header: 'Attempt ID', key: 'id', width: 28 },
        { header: 'Masked Mobile', key: 'mobile', width: 16 },
        { header: 'Country', key: 'cc', width: 8 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Question', key: 'question', width: 40 },
        { header: 'Selected option', key: 'option', width: 40 },
        { header: 'Result', key: 'result', width: 10 },
        { header: 'Time (ms)', key: 'ms', width: 10 },
        { header: 'Shown at', key: 'shown', width: 22 },
        { header: 'Submitted at', key: 'submitted', width: 22 },
        { header: 'IP', key: 'ip', width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B2540' },
      };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFF4F7FA' } };
      for (const r of rows) {
        ws.addRow({
          id: r.id,
          mobile: maskMobile(r.candidate.mobileE164),
          cc: r.candidate.countryCode,
          category: r.question.category.name,
          question: r.question.title,
          option: r.selectedOption?.textMarkdown ?? '',
          result: r.isCorrect ? 'CORRECT' : 'WRONG',
          ms: r.timeTakenMs ?? '',
          shown: r.questionShownAt?.toISOString() ?? '',
          submitted: r.answerSubmittedAt?.toISOString() ?? '',
          ip: r.ip ?? '',
        });
      }
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

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
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
    res.send(lines.join('\n'));
  }

  @Post('reset')
  @AdminRoles('ADMIN', 'SUPER_ADMIN')
  async reset(@Body() dto: ResetAttemptsDto, @Req() req: AdminReq) {
    const e164 = normalizeMobile(dto.mobile);
    if (!e164) throw new BadRequestException({ code: 'MOBILE_INVALID' });

    const candidate = await this.prisma.candidate.findUnique({
      where: { mobileE164: e164 },
    });
    if (!candidate) throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND' });

    const updated = await this.prisma.attempt.updateMany({
      where: { candidateId: candidate.id, status: { in: ['SUBMITTED', 'IN_PROGRESS'] } },
      data: { status: 'ABANDONED' },
    });

    await this.redis.del(`otp:send:${e164}`);
    await this.redis.del(`otp:cooldown:${e164}`);

    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'attempts.reset',
      entityType: 'Candidate',
      entityId: candidate.id,
      after: { mobile: e164, reason: dto.reason, resetCount: updated.count },
    });

    return {
      ok: true,
      mobile: maskMobile(e164),
      resetCount: updated.count,
    };
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
