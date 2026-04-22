import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { SettingsService } from '../../settings/settings.service';
import { AuditService } from '../../audit/audit.service';

// Whitelist of settings keys the admin UI may write. Must stay in sync with
// the seed file (apps/api/prisma/seed.ts) and the public settings controller.
// Unlisted keys are rejected with 400 to prevent typos or malicious injection
// from silently poisoning the app configuration.
const ALLOWED_KEYS = [
  'attempt.policy',
  'assignment.mode',
  'assignment.category_id',
  'assignment.all_same_question_id',
  'event.kiosk_mode',
  'event.collect_mobile',
  'event.auto_reset_seconds',
  'event.booth_name',
  'result.reveal_correct_on_fail',
  'result.auto_reset_fallback_seconds',
  'result.auto_reset_fallback_enabled',
  'branding.product_name',
  'branding.animations_enabled',
  'branding.sound_enabled',
  'branding.ambient_ocean_enabled',
  'captcha.enabled',
  'privacy.policy_url',
] as const;

class UpsertSettingDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_KEYS as unknown as string[], {
    message: 'Unknown settings key. See admin-settings.controller.ts ALLOWED_KEYS.',
  })
  key!: string;
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
