import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { AdminRole } from '@prisma/client';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

const ALL_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'OPS', 'AUDITOR'];

class CreateAdminDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsArray() @IsIn(ALL_ROLES, { each: true }) roles!: AdminRole[];
}
class UpdateAdminDto {
  @IsString() @IsOptional() @IsEmail() email?: string;
  @IsString() @IsOptional() @MinLength(12) password?: string;
  @IsArray() @IsOptional() @IsIn(ALL_ROLES, { each: true }) roles?: AdminRole[];
  @IsBoolean() @IsOptional() isActive?: boolean;
}
class VerifyMfaDto {
  @IsString() @IsNotEmpty() code!: string;
}

@UseGuards(AdminGuard)
@AdminRoles('SUPER_ADMIN')
@Controller('admin/users')
export class AdminUserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const rows = await this.prisma.adminUser.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      rows: rows.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isActive: u.isActive,
        mfaEnabled: !!u.mfaSecret,
        roles: u.roles.map((r) => r.role.name),
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    };
  }

  // Admin creation is high-leverage: a compromised session could spawn
  // many privileged accounts. 5/min is plenty for legitimate onboarding.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async create(@Body() dto: CreateAdminDto, @Req() req: AdminReq) {
    const hash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.adminUser.create({
      data: { username: dto.username, email: dto.email, passwordHash: hash },
    });
    for (const roleName of dto.roles) {
      const role = await this.prisma.role.findUnique({ where: { name: roleName } });
      if (!role) continue;
      await this.prisma.adminUserRole.create({
        data: { adminUserId: user.id, roleId: role.id },
      });
    }
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'admin.create',
      entityType: 'AdminUser',
      entityId: user.id,
      after: { username: dto.username, email: dto.email, roles: dto.roles },
    });
    return { id: user.id };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @Req() req: AdminReq,
  ) {
    const before = await this.prisma.adminUser.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!before) throw new NotFoundException();

    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    }
    const updated = await this.prisma.adminUser.update({ where: { id }, data });

    if (dto.roles) {
      await this.prisma.adminUserRole.deleteMany({ where: { adminUserId: id } });
      for (const roleName of dto.roles) {
        const role = await this.prisma.role.findUnique({ where: { name: roleName } });
        if (!role) continue;
        await this.prisma.adminUserRole.create({
          data: { adminUserId: id, roleId: role.id },
        });
      }
    }

    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'admin.update',
      entityType: 'AdminUser',
      entityId: id,
      before: {
        email: before.email,
        isActive: before.isActive,
        roles: before.roles.map((r) => r.role.name),
      },
      after: {
        email: updated.email,
        isActive: updated.isActive,
        roles: dto.roles ?? before.roles.map((r) => r.role.name),
      },
    });

    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AdminReq) {
    if (id === req.admin!.sub) {
      throw new ForbiddenException({ code: 'CANNOT_DELETE_SELF' });
    }
    const before = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!before) return { ok: true };
    await this.prisma.adminUser.delete({ where: { id } });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'admin.delete',
      entityType: 'AdminUser',
      entityId: id,
      before,
    });
    return { ok: true };
  }

  @Post(':id/mfa/setup')
  async setupMfa(@Param('id') id: string, @Req() req: AdminReq) {
    if (id !== req.admin!.sub) {
      throw new ForbiddenException({ code: 'MFA_SELF_ONLY' });
    }
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    const secret = authenticator.generateSecret();
    await this.prisma.adminUser.update({
      where: { id },
      data: { mfaSecret: secret },
    });
    const otpauthUrl = authenticator.keyuri(user.username, 'OceanDraft', secret);
    return { secret, otpauthUrl };
  }

  @Post(':id/mfa/verify')
  async verifyMfa(
    @Param('id') id: string,
    @Body() dto: VerifyMfaDto,
    @Req() req: AdminReq,
  ) {
    if (id !== req.admin!.sub) {
      throw new ForbiddenException({ code: 'MFA_SELF_ONLY' });
    }
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user?.mfaSecret) {
      throw new BadRequestException({ code: 'MFA_NOT_SETUP' });
    }
    if (!authenticator.check(dto.code, user.mfaSecret)) {
      throw new BadRequestException({ code: 'MFA_INVALID' });
    }
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'admin.mfa.enabled',
      entityType: 'AdminUser',
      entityId: id,
    });
    return { ok: true };
  }

  @Post(':id/mfa/disable')
  async disableMfa(@Param('id') id: string, @Req() req: AdminReq) {
    if (id !== req.admin!.sub) {
      throw new ForbiddenException({ code: 'MFA_SELF_ONLY' });
    }
    await this.prisma.adminUser.update({
      where: { id },
      data: { mfaSecret: null },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'admin.mfa.disabled',
      entityType: 'AdminUser',
      entityId: id,
    });
    return { ok: true };
  }
}
