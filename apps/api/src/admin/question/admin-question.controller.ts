import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

class OptionDto {
  @IsString() @IsNotEmpty() @MaxLength(300) text!: string;
  @IsBoolean() @IsOptional() isCorrect?: boolean;
}

class CreateQuestionDto {
  @IsString() @IsNotEmpty() @MaxLength(140) title!: string;
  @IsString() @IsNotEmpty() stemMarkdown!: string;
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsEnum(['TEXT', 'IMAGE', 'MIXED']) @IsOptional() type?: 'TEXT' | 'IMAGE' | 'MIXED';
  @IsEnum(['EASY', 'MEDIUM', 'HARD']) @IsOptional() difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @IsString() @IsOptional() primaryMediaId?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionDto) @ArrayMinSize(2)
  options!: OptionDto[];
}

class UpdateQuestionDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() stemMarkdown?: string;
  @IsString() @IsOptional() categoryId?: string;
  @IsEnum(['TEXT', 'IMAGE', 'MIXED']) @IsOptional() type?: 'TEXT' | 'IMAGE' | 'MIXED';
  @IsEnum(['EASY', 'MEDIUM', 'HARD']) @IsOptional() difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @IsString() @IsOptional() primaryMediaId?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionDto) @IsOptional()
  options?: OptionDto[];
}

class ListQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() isActive?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/questions')
export class AdminQuestionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private ensureOneCorrect(options: OptionDto[]) {
    const correct = options.filter((o) => o.isCorrect).length;
    if (correct !== 1) {
      throw new Error('Exactly one option must be marked correct.');
    }
  }

  @Get()
  async list(@Query() q: ListQuery) {
    const where: Record<string, unknown> = {};
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.isActive === 'true') where.isActive = true;
    if (q.isActive === 'false') where.isActive = false;

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { category: true, options: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.question.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        category: true,
        primaryMedia: true,
      },
    });
    if (!q) return null;
    return {
      ...q,
      primaryMedia: q.primaryMedia
        ? {
            id: q.primaryMedia.id,
            url: `/api/v1/media/${q.primaryMedia.id}`,
            mimeType: q.primaryMedia.mimeType,
            altText: q.primaryMedia.altText,
            sizeBytes: q.primaryMedia.sizeBytes,
          }
        : null,
    };
  }

  @Post()
  async create(@Body() dto: CreateQuestionDto, @Req() req: AdminReq) {
    this.ensureOneCorrect(dto.options);

    // Allocate a fresh ticket number = max + 1.
    const maxTicket =
      (await this.prisma.question.aggregate({ _max: { ticketNumber: true } }))._max
        .ticketNumber ?? 0;
    const nextTicket = maxTicket + 1;

    const q = await this.prisma.question.create({
      data: {
        title: dto.title,
        stemMarkdown: dto.stemMarkdown,
        categoryId: dto.categoryId,
        type: dto.type ?? 'TEXT',
        difficulty: dto.difficulty ?? 'MEDIUM',
        primaryMediaId: dto.primaryMediaId,
        isActive: dto.isActive ?? true,
        tags: dto.tags ?? [],
        ticketNumber: nextTicket,
        createdById: req.admin!.sub,
        options: {
          create: dto.options.map((o, i) => ({
            orderIndex: i,
            textMarkdown: o.text,
            isCorrect: !!o.isCorrect,
          })),
        },
      },
      include: { options: true },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'question.create',
      entityType: 'Question',
      entityId: q.id,
      after: q,
    });
    return q;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Req() req: AdminReq,
  ) {
    const before = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (dto.options) this.ensureOneCorrect(dto.options);

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.question.update({
        where: { id },
        data: {
          title: dto.title,
          stemMarkdown: dto.stemMarkdown,
          categoryId: dto.categoryId,
          type: dto.type,
          difficulty: dto.difficulty,
          primaryMediaId: dto.primaryMediaId,
          isActive: dto.isActive,
          tags: dto.tags,
          version: { increment: 1 },
        },
      });
      if (dto.options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({
          data: dto.options.map((o, i) => ({
            questionId: id,
            orderIndex: i,
            textMarkdown: o.text,
            isCorrect: !!o.isCorrect,
          })),
        });
      }
      return tx.question.findUnique({
        where: { id: q.id },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      });
    });

    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'question.update',
      entityType: 'Question',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string, @Req() req: AdminReq) {
    const q = await this.prisma.question.update({
      where: { id },
      data: { isActive: true },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'question.activate',
      entityType: 'Question',
      entityId: id,
      after: q,
    });
    return q;
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @Req() req: AdminReq) {
    const q = await this.prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'question.deactivate',
      entityType: 'Question',
      entityId: id,
      after: q,
    });
    return q;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AdminReq) {
    const q = await this.prisma.question.delete({ where: { id } });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'question.delete',
      entityType: 'Question',
      entityId: id,
      before: q,
    });
    return { ok: true };
  }
}
