import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { SettingsService } from '../../settings/settings.service';
import { AuditService } from '../../audit/audit.service';

class UpsertSettingDto {
  @IsString() @IsNotEmpty() key!: string;
  value!: unknown;
  @IsString() @IsNotEmpty() type!: string;
}

@UseGuards(AdminGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async all() {
    return this.settings.getAll();
  }

  @Patch()
  async upsert(@Body() dto: UpsertSettingDto, @Req() req: AdminReq) {
    const before = await this.settings.get(dto.key);
    const row = await this.settings.set(dto.key, dto.value, dto.type, req.admin!.sub);
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'settings.update',
      entityType: 'AppSetting',
      entityId: dto.key,
      before: { key: dto.key, value: before },
      after: { key: dto.key, value: dto.value },
    });
    return row;
  }
}
