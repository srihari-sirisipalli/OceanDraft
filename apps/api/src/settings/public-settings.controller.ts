import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * Publicly-readable settings the candidate UI needs at render time.
 * Never expose anything sensitive here. Only whitelisted keys are returned.
 */
@Controller('settings/public')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get() {
    const [
      kioskMode,
      collectMobile,
      autoResetSeconds,
      boothName,
      productName,
      captchaEnabled,
      revealCorrectOnFail,
      privacyPolicyUrl,
    ] = await Promise.all([
      this.settings.get<boolean>('event.kiosk_mode'),
      this.settings.get<boolean>('event.collect_mobile'),
      this.settings.get<number>('event.auto_reset_seconds'),
      this.settings.get<string>('event.booth_name'),
      this.settings.get<string>('branding.product_name'),
      this.settings.get<boolean>('captcha.enabled'),
      this.settings.get<boolean>('result.reveal_correct_on_fail'),
      this.settings.get<string>('privacy.policy_url'),
    ]);

    return {
      event: {
        kioskMode: kioskMode ?? true,
        collectMobile: collectMobile ?? false,
        autoResetSeconds: autoResetSeconds ?? 10,
        boothName: boothName ?? 'OceanDraft · Event booth',
      },
      branding: { productName: productName ?? 'OceanDraft' },
      captcha: { enabled: captchaEnabled ?? false },
      result: { revealCorrectOnFail: revealCorrectOnFail ?? false },
      privacy: { policyUrl: privacyPolicyUrl ?? '/privacy' },
    };
  }
}
