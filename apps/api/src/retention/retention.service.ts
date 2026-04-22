import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Nightly data retention sweeper.
 *
 * Env:
 *   RETENTION_DAYS (default 180) — candidates not seen in N days are scrubbed.
 *   OTP_CLEANUP_DAYS (default 14) — expired OTP rows older than N days are removed.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger('RetentionService');
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run() {
    await this.scrubOldCandidates();
    await this.purgeExpiredOtps();
    await this.expireStaleSessions();
  }

  async scrubOldCandidates() {
    const days = Number(process.env.RETENTION_DAYS ?? 180);
    // Safety floor: a typo like RETENTION_DAYS=1 would nuke the entire
    // candidate table in one cron cycle. Refuse to run below 30 days.
    if (!Number.isFinite(days) || days < 30) {
      this.logger.warn(
        `Retention: RETENTION_DAYS=${process.env.RETENTION_DAYS ?? '(unset)'} below 30-day floor — skipping scrub.`,
      );
      return;
    }
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
    const rows = await this.prisma.candidate.findMany({
      where: { lastSeenAt: { lt: cutoff } },
      select: { id: true, mobileE164: true },
      take: 1000,
    });
    if (rows.length === 0) return;
    for (const r of rows) {
      const scrubbed = `SCRUBBED_${r.id.slice(0, 8)}`;
      await this.prisma.candidate.update({
        where: { id: r.id },
        data: {
          mobileE164: scrubbed,
          notes: 'scrubbed by retention policy',
        },
      });
    }
    this.logger.log(`Retention: scrubbed ${rows.length} candidates beyond ${days}d`);
  }

  async purgeExpiredOtps() {
    const days = Number(process.env.OTP_CLEANUP_DAYS ?? 14);
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
    const res = await this.prisma.otpRequest.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    if (res.count > 0) this.logger.log(`Retention: purged ${res.count} old OTP rows`);
  }

  async expireStaleSessions() {
    const res = await this.prisma.candidateSession.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
    });
    if (res.count > 0) this.logger.log(`Retention: purged ${res.count} stale sessions`);
  }
}
