import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const logger = new Logger('Bootstrap');

  const port = Number(process.env.PORT ?? 4000);
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser(process.env.SESSION_COOKIE_SECRET ?? 'dev-cookie-secret'));
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port, '0.0.0.0');
  logger.log(`⚓ OceanDraft API listening on http://localhost:${port}/api/v1`);
  if ((process.env.OTP_DEV_MODE ?? 'true') === 'true') {
    logger.warn('OTP_DEV_MODE is ON — OTPs will be logged, not sent via SMS.');
  }
}
bootstrap();
