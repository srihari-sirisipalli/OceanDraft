import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevSmsProvider } from './providers/dev-sms.provider';
import { Msg91Provider } from './providers/msg91.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { SMS_PROVIDER, SmsProvider } from './sms.types';

@Global()
@Module({
  providers: [
    DevSmsProvider,
    Msg91Provider,
    TwilioProvider,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService, DevSmsProvider, Msg91Provider, TwilioProvider],
      useFactory: (
        cfg: ConfigService,
        dev: DevSmsProvider,
        msg91: Msg91Provider,
        twilio: TwilioProvider,
      ): SmsProvider => {
        const devMode = cfg.get<boolean>('otp.devMode');
        const name = cfg.get<string>('otp.provider') ?? 'dev';
        if (devMode) return dev;
        switch (name) {
          case 'msg91':
            return msg91;
          case 'twilio':
            return twilio;
          default:
            return dev;
        }
      },
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
