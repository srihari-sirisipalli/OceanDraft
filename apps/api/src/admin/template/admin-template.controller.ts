import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

class UpdateTemplateDto {
  @IsString() @IsOptional() @IsNotEmpty() headline?: string;
  @IsString() @IsOptional() bodyMarkdown?: string;
  @IsString() @IsOptional() mediaId?: string | null;
  @IsBoolean() @IsOptional() revealCorrectOnFail?: boolean;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/result-templates')
export class AdminTemplateController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const rows = await this.prisma.resultTemplate.findMany({
      orderBy: { key: 'asc' },
    });
    return { rows };
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    const t = await this.prisma.resultTemplate.findUnique({ where: { key } });
    if (!t) throw new NotFoundException({ code: 'TEMPLATE_NOT_FOUND' });
    return t;
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: AdminReq,
  ) {
    const before = await this.prisma.resultTemplate.findUnique({ where: { key } });
    if (!before) throw new NotFoundException({ code: 'TEMPLATE_NOT_FOUND' });
    const after = await this.prisma.resultTemplate.update({
      where: { key },
      data: {
        headline: dto.headline,
        bodyMarkdown: dto.bodyMarkdown,
        mediaId: dto.mediaId,
        revealCorrectOnFail: dto.revealCorrectOnFail,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'result-template.update',
      entityType: 'ResultTemplate',
      entityId: key,
      before,
      after,
    });
    return after;
  }
}
