import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

class CreateCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsOptional() description?: string | null;
}
class UpdateCategoryDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() slug?: string;
  @IsString() @IsOptional() description?: string | null;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return { rows, total: rows.length };
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto, @Req() req: AdminReq) {
    const c = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
      },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'category.create',
      entityType: 'Category',
      entityId: c.id,
      after: c,
    });
    return c;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AdminReq,
  ) {
    const before = await this.prisma.category.findUnique({ where: { id } });
    const after = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'category.update',
      entityType: 'Category',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AdminReq) {
    const usage = await this.prisma.question.count({ where: { categoryId: id } });
    if (usage > 0) {
      return {
        ok: false,
        error: `Category is used by ${usage} question(s). Reassign first.`,
      };
    }
    const c = await this.prisma.category.delete({ where: { id } });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'category.delete',
      entityType: 'Category',
      entityId: id,
      before: c,
    });
    return { ok: true };
  }
}
