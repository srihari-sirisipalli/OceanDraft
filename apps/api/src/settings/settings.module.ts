import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PublicSettingsController } from './public-settings.controller';

@Global()
@Module({
  controllers: [PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
