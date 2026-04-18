import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { AdminGuard, AdminRoles } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

class ReportQuery {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'OPS')
@Controller('admin/reports')
export class AdminReportController {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(q: ReportQuery) {
    if (!q.from && !q.to) return undefined;
    return {
      ...(q.from ? { gte: new Date(q.from) } : {}),
      ...(q.to ? { lte: new Date(q.to) } : {}),
    };
  }

  @Get('questions')
  async byQuestion(@Query() q: ReportQuery) {
    const range = this.dateRange(q);
    const attempts = await this.prisma.attempt.groupBy({
      by: ['questionId', 'isCorrect'],
      where: {
        status: 'SUBMITTED',
        ...(range ? { answerSubmittedAt: range } : {}),
      },
      _count: { _all: true },
      _avg: { timeTakenMs: true },
    });
    const questionIds = Array.from(new Set(attempts.map((a) => a.questionId)));
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { category: true },
    });
    const qmap = new Map(questions.map((x) => [x.id, x]));

    type Agg = {
      questionId: string;
      title: string;
      category: string;
      active: boolean;
      total: number;
      correct: number;
      wrong: number;
      avgMs: number | null;
    };
    const out = new Map<string, Agg>();
    for (const a of attempts) {
      const q = qmap.get(a.questionId);
      if (!q) continue;
      const cur: Agg =
        out.get(a.questionId) ?? {
          questionId: a.questionId,
          title: q.title,
          category: q.category.name,
          active: q.isActive,
          total: 0,
          correct: 0,
          wrong: 0,
          avgMs: null,
        };
      cur.total += a._count._all;
      if (a.isCorrect) cur.correct += a._count._all;
      else cur.wrong += a._count._all;
      if (a._avg.timeTakenMs != null) {
        cur.avgMs =
          cur.avgMs == null
            ? Math.round(a._avg.timeTakenMs)
            : Math.round((cur.avgMs + a._avg.timeTakenMs) / 2);
      }
      out.set(a.questionId, cur);
    }
    const rows = Array.from(out.values())
      .map((r) => ({
        ...r,
        correctnessPct: r.total ? Math.round((r.correct / r.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
    return { rows };
  }

  @Get('categories')
  async byCategory(@Query() q: ReportQuery) {
    const range = this.dateRange(q);
    const attempts = await this.prisma.attempt.findMany({
      where: {
        status: 'SUBMITTED',
        ...(range ? { answerSubmittedAt: range } : {}),
      },
      include: { question: { include: { category: true } } },
    });

    type Agg = {
      categoryId: string;
      category: string;
      total: number;
      correct: number;
      wrong: number;
      sumMs: number;
      countMs: number;
    };
    const out = new Map<string, Agg>();
    for (const a of attempts) {
      const c = a.question.category;
      const cur: Agg =
        out.get(c.id) ?? {
          categoryId: c.id,
          category: c.name,
          total: 0,
          correct: 0,
          wrong: 0,
          sumMs: 0,
          countMs: 0,
        };
      cur.total++;
      if (a.isCorrect) cur.correct++;
      else cur.wrong++;
      if (a.timeTakenMs != null) {
        cur.sumMs += a.timeTakenMs;
        cur.countMs++;
      }
      out.set(c.id, cur);
    }

    const rows = Array.from(out.values())
      .map((r) => ({
        categoryId: r.categoryId,
        category: r.category,
        total: r.total,
        correct: r.correct,
        wrong: r.wrong,
        correctnessPct: r.total ? Math.round((r.correct / r.total) * 100) : 0,
        avgMs: r.countMs ? Math.round(r.sumMs / r.countMs) : null,
      }))
      .sort((a, b) => b.total - a.total);

    return { rows };
  }

  @Get('otp')
  async otpReport(@Query() q: ReportQuery) {
    const range = this.dateRange(q) ?? {
      gte: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    };
    const rows = await this.prisma.otpRequest.findMany({
      where: { generatedAt: range },
      orderBy: { generatedAt: 'asc' },
      select: {
        generatedAt: true,
        deliveryStatus: true,
        verifyAttempts: true,
        status: true,
        provider: true,
      },
    });
    type Day = {
      day: string;
      sent: number;
      failed: number;
      verified: number;
      expired: number;
    };
    const out = new Map<string, Day>();
    for (const r of rows) {
      const day = r.generatedAt.toISOString().slice(0, 10);
      const cur: Day =
        out.get(day) ?? { day, sent: 0, failed: 0, verified: 0, expired: 0 };
      if (r.deliveryStatus === 'FAILED') cur.failed++;
      else cur.sent++;
      if (r.status === 'CONSUMED') cur.verified++;
      if (r.status === 'EXPIRED') cur.expired++;
      out.set(day, cur);
    }
    return {
      rows: Array.from(out.values()).sort((a, b) => a.day.localeCompare(b.day)),
    };
  }
}
