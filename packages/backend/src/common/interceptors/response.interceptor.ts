import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessEnvelope<T> {
  code: 0;
  message: 'success';
  data: T | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T> | T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // 文件下载等二进制响应不包装。
        if (data instanceof StreamableFile) {
          return data;
        }

        return {
          code: 0 as const,
          message: 'success' as const,
          data: data === undefined ? null : data,
        };
      }),
    );
  }
}
