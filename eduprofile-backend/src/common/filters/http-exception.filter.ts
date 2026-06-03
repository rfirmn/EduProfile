import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorBody: ErrorResponseBody = {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan pada server.',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorBody = {
          code: 'VALIDATION_ERROR',
          message: exceptionResponse,
        };
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;

        // Handle class-validator errors from ValidationPipe
        if (Array.isArray(resp['message'])) {
          const messages = resp['message'] as string[];
          errorBody = {
            code: (resp['code'] as string) || 'VALIDATION_ERROR',
            message: messages[0] || 'Validasi gagal.',
            details: messages.map((msg) => ({
              field: this.extractFieldFromMessage(msg),
              message: msg,
            })),
          };
        } else {
          errorBody = {
            code: (resp['code'] as string) || 'VALIDATION_ERROR',
            message: (resp['message'] as string) || 'Terjadi kesalahan.',
            details: resp['details'] as
              | Array<{ field: string; message: string }>
              | undefined,
          };
        }
      }
    } else if (exception instanceof Error) {
      console.error('Unhandled exception:', exception);
      errorBody = {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server.',
      };
    }

    response.status(status).json({
      success: false,
      error: errorBody,
    });
  }

  private extractFieldFromMessage(message: string): string {
    // Try to extract field name from class-validator messages like "email must be an email"
    const parts = message.split(' ');
    return parts[0] || 'unknown';
  }
}
