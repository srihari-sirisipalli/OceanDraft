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
      animationsEnabled,
      soundEnabled,
      ambientOceanEnabled,
      captchaEnabled,
      revealCorrectOnFail,
      autoResetFallbackSeconds,
      autoResetFallbackEnabled,
      privacyPolicyUrl,
    ] = await Promise.all([
      this.settings.get<boolean>('event.kiosk_mode'),
      this.settings.get<boolean>('event.collect_mobile'),
      this.settings.get<number>('event.auto_reset_seconds'),
      this.settings.get<string>('event.booth_name'),
      this.settings.get<string>('branding.product_name'),
      this.settings.get<boolean>('branding.animations_enabled'),
      this.settings.get<boolean>('branding.sound_enabled'),
      this.settings.get<boolean>('branding.ambient_ocean_enabled'),
      this.settings.get<boolean>('captcha.enabled'),
      this.settings.get<boolean>('result.reveal_correct_on_fail'),
      this.settings.get<number>('result.auto_reset_fallback_seconds'),
      this.settings.get<boolean>('result.auto_reset_fallback_enabled'),
      this.settings.get<string>('privacy.policy_url'),
    ]);

    return {
      event: {
        kioskMode: kioskMode ?? true,
        collectMobile: collectMobile ?? false,
        autoResetSeconds: autoResetSeconds ?? 10,
        boothName: boothName ?? 'OceanDraft · Event booth',
      },
      branding: {
        productName: productName ?? 'OceanDraft',
        animationsEnabled: animationsEnabled ?? true,
        soundEnabled: soundEnabled ?? true,
        ambientOceanEnabled: ambientOceanEnabled ?? true,
      },
      captcha: { enabled: captchaEnabled ?? false },
      result: {
        revealCorrectOnFail: revealCorrectOnFail ?? false,
        autoResetFallbackSeconds: autoResetFallbackSeconds ?? 120,
        autoResetFallbackEnabled: autoResetFallbackEnabled ?? true,
      },
      privacy: { policyUrl: privacyPolicyUrl ?? '/privacy' },
    };
  }
}
