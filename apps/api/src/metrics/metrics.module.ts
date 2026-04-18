import { Controller, Get, Header, Module, Res } from '@nestjs/common';
import type { Response } from 'express';
import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';

collectDefaultMetrics({ prefix: 'oceandraft_' });

export const otpSent = new Counter({
  name: 'oceandraft_otp_sent_total',
  help: 'OTP send attempts by provider and outcome',
  labelNames: ['provider', 'outcome'] as const,
});
export const otpVerified = new Counter({
  name: 'oceandraft_otp_verified_total',
  help: 'OTP verifications by outcome',
  labelNames: ['outcome'] as const,
});
export const attemptsSubmitted = new Counter({
  name: 'oceandraft_attempts_submitted_total',
  help: 'Attempts submitted by result',
  labelNames: ['result'] as const,
});
export const httpDuration = new Histogram({
  name: 'oceandraft_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

@Controller('metrics')
class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  async metrics(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', register.contentType);
    return await register.metrics();
  }
}

@Module({ controllers: [MetricsController] })
export class MetricsModule {}
