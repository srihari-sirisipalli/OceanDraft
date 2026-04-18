import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse() as
        | string
        | { message?: string | string[]; code?: string; error?: string };
      if (typeof resp === 'string') {
        message = resp;
      } else {
        message = resp.message ?? exception.message;
        code = resp.code ?? resp.error ?? this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
    }

    res.status(status).json({
      code,
      message,
      correlationId,
    });
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 410:
        return 'GONE';
      case 422:
        return 'UNPROCESSABLE';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'ERROR';
    }
  }
}
