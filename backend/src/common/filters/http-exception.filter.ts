import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DatabaseError } from '../supabase/database.error';

/**
 * Global exception filter — normalizes every thrown error (Nest HttpException
 * or otherwise) into a consistent JSON error body instead of leaking stack
 * traces / framework-specific shapes to API consumers. Database failures
 * become 503 so the client can tell "down" from "broken".
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof DatabaseError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = { code: 'database_unavailable', message: 'The Virtual Office database is unavailable. Try again shortly.' };
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
