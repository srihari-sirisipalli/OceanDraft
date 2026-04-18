import { Injectable } from '@nestjs/common';
import { AuditActorType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    actorId?: string | null;
    actorType: AuditActorType;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    ip?: string;
    ua?: string;
    correlationId?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorType: params.actorType,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeJson: (params.before ?? null) as never,
        afterJson: (params.after ?? null) as never,
        ip: params.ip,
        ua: params.ua,
        correlationId: params.correlationId,
      },
    });
  }
}
