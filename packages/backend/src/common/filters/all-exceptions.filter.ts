import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface ErrorBody {
  code: number;
  message: string;
  data: null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    const { status, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.originalUrl} -> ${status}`, stack);
    }

    const body: ErrorBody = { code: status, message, data: null };
    response.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: this.extractHttpMessage(exception),
      };
    }

    if (exception instanceof Error && exception.name === 'MulterError') {
      const code = (exception as Error & { code?: string }).code;
      const message =
        code === 'LIMIT_FILE_SIZE'
          ? '单张图片不能超过 10MB'
          : code === 'LIMIT_FILE_COUNT' || code === 'LIMIT_UNEXPECTED_FILE'
            ? '最多上传 5 张图片'
            : '图片上传失败';
      return { status: HttpStatus.BAD_REQUEST, message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { status: HttpStatus.CONFLICT, message: '数据已存在，违反唯一性约束' };
        case 'P2003':
          return { status: HttpStatus.CONFLICT, message: '存在关联数据，无法完成当前操作' };
        case 'P2025':
          return { status: HttpStatus.NOT_FOUND, message: '目标记录不存在' };
        case 'P1001':
        case 'P1002':
          return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库暂不可用，请稍后重试' };
        default:
          return { status: HttpStatus.BAD_REQUEST, message: '数据库操作失败' };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, message: '请求参数不合法' };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库连接失败' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: '服务器内部错误' };
  }

  private extractHttpMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const candidate = response as { message?: unknown; error?: unknown };

      if (Array.isArray(candidate.message)) {
        return candidate.message.map(String).join('；');
      }

      if (typeof candidate.message === 'string') {
        return candidate.message;
      }

      if (typeof candidate.error === 'string') {
        return candidate.error;
      }
    }

    return exception.message || '请求失败';
  }
}
