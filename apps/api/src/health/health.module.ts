import { Controller, Get, Module } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { ok: true, time: new Date().toISOString(), service: 'oceandraft-api' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
