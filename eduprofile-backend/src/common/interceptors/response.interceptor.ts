import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the service already wrapped the response with meta, extract it
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          const wrapped = data as unknown as {
            data: T;
            meta: Record<string, unknown>;
          };
          return {
            success: true as const,
            data: wrapped.data,
            meta: wrapped.meta,
          };
        }

        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}
