import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminRoles } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { maskMobile } from '../../common/utils/mobile';

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN', 'OPS', 'AUDITOR')
@Controller('admin/event')
export class AdminEventController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('board')
  async board() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [total, correct, latest] = await Promise.all([
      this.prisma.attempt.count({
        where: { status: 'SUBMITTED', answerSubmittedAt: { gte: startOfDay } },
      }),
      this.prisma.attempt.count({
        where: {
          status: 'SUBMITTED',
          isCorrect: true,
          answerSubmittedAt: { gte: startOfDay },
        },
      }),
      this.prisma.attempt.findMany({
        where: { status: 'SUBMITTED', answerSubmittedAt: { gte: startOfDay } },
        orderBy: { answerSubmittedAt: 'desc' },
        take: 15,
        include: {
          candidate: true,
          question: { include: { category: true } },
        },
      }),
    ]);

    // Category leaderboard (today)
    const byCategoryRows = await this.prisma.attempt.findMany({
      where: { status: 'SUBMITTED', answerSubmittedAt: { gte: startOfDay } },
      include: { question: { include: { category: true } } },
    });
    type AggCat = { name: string; total: number; correct: number };
    const byCat = new Map<string, AggCat>();
    for (const r of byCategoryRows) {
      const c = r.question.category.name;
      const cur: AggCat = byCat.get(c) ?? { name: c, total: 0, correct: 0 };
      cur.total++;
      if (r.isCorrect) cur.correct++;
      byCat.set(c, cur);
    }

    // Fastest correct today
    const fastest = await this.prisma.attempt.findFirst({
      where: {
        status: 'SUBMITTED',
        isCorrect: true,
        answerSubmittedAt: { gte: startOfDay },
      },
      orderBy: { timeTakenMs: 'asc' },
      include: { candidate: true, question: true },
    });

    return {
      now: new Date().toISOString(),
      totalsToday: {
        attempts: total,
        correct,
        wrong: total - correct,
        successRate: total ? Math.round((correct / total) * 100) : 0,
      },
      latest: latest.map((r) => ({
        id: r.id,
        mobile: maskMobile(r.candidate.mobileE164),
        isGuest: r.candidate.mobileE164.startsWith('GUEST-'),
        questionTitle: r.question.title,
        category: r.question.category.name,
        isCorrect: !!r.isCorrect,
        timeTakenMs: r.timeTakenMs,
        at: r.answerSubmittedAt,
      })),
      byCategory: Array.from(byCat.values())
        .map((c) => ({
          ...c,
          pct: c.total ? Math.round((c.correct / c.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total),
      fastestCorrect: fastest
        ? {
            ms: fastest.timeTakenMs,
            mobile: maskMobile(fastest.candidate.mobileE164),
            isGuest: fastest.candidate.mobileE164.startsWith('GUEST-'),
            questionTitle: fastest.question.title,
          }
        : null,
    };
  }
}
