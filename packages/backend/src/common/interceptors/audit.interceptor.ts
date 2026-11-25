import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_KEY, AuditOptions, SKIP_AUDIT_KEY } from '../decorators/audit.decorator';
import { AuthenticatedRequest } from '../types/authenticated-user.interface';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|passwordhash|token|secret|authorization|api[-_]?key|credential|accesscode)/i;

const TARGET_TYPE_BY_SEGMENT: Record<string, string> = {
  users: 'USER',
  auth: 'AUTH',
  tickets: 'TICKET',
  knowledge: 'KNOWLEDGE',
  contacts: 'CONTACT',
  subsystems: 'SUBSYSTEM',
  settings: 'SETTING',
  llm: 'LLM',
  audit: 'AUDIT',
};

/**
 * 全局写操作审计：
 * - 自动覆盖所有 POST/PUT/PATCH/DELETE，避免遗漏；
 * - 成功、失败均记录；
 * - 对 password/token/secret 等字段脱敏；
 * - 审计失败只写应用日志，不影响业务响应。
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!WRITE_METHODS.has(request.method.toUpperCase())) {
      return next.handle();
    }

    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAudit) {
      return next.handle();
    }

    const metadata =
      this.reflector.getAllAndOverride<AuditOptions>(AUDIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? null;
    const successStatusCode = this.resolveSuccessStatusCode(context, request.method);
    const startedAt = Date.now();

    return next.handle().pipe(
      mergeMap(async (data) => {
        await this.persist({
          request,
          metadata,
          startedAt,
          success: true,
          statusCode: successStatusCode,
          data,
        });
        return data;
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        return from(
          this.persist({
            request,
            metadata,
            startedAt,
            success: false,
            statusCode,
            error,
          }),
        ).pipe(mergeMap(() => throwError(() => error)));
      }),
    );
  }

  private async persist(input: {
    request: AuthenticatedRequest;
    metadata: AuditOptions | null;
    startedAt: number;
    success: boolean;
    statusCode: number;
    data?: unknown;
    error?: unknown;
  }): Promise<void> {
    const { request, metadata, startedAt, success, statusCode } = input;
    const result = success ? this.unwrapData(input.data) : undefined;
    const targetType = metadata?.targetType ?? this.inferTargetType(request);
    const targetId = this.extractTargetId(request, result);
    const userId = request.user?.id ?? this.extractUserId(result);
    const action = metadata?.action ?? this.inferAction(request);

    const detail = this.toJsonSafe({
      method: request.method.toUpperCase(),
      path: request.originalUrl,
      route: request.route?.path,
      params: request.params,
      query: request.query,
      body: request.body,
      statusCode,
      durationMs: Date.now() - startedAt,
      outcome: success ? 'SUCCESS' : 'FAILURE',
      result: success ? result : undefined,
      error: success ? undefined : this.extractErrorMessage(input.error),
      userAgent: request.headers['user-agent'],
    });

    try {
      await this.auditService.record({
        userId,
        action,
        targetType,
        targetId,
        detail: detail as Prisma.InputJsonValue,
        ip: this.getClientIp(request),
        ticketId: targetType === 'TICKET' ? targetId : null,
      });
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`审计写入失败：${action} ${request.method} ${request.originalUrl}`, stack);
    }
  }

  /**
   * 拦截器运行时 Nest 尚未把 @HttpCode 应用到响应对象，因此从 handler 元数据解析，
   * 避免把所有成功写操作都记成 200。
   */
  private resolveSuccessStatusCode(context: ExecutionContext, method: string): number {
    const explicit = this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler());
    if (explicit) return explicit;
    return method.toUpperCase() === 'POST' ? HttpStatus.CREATED : HttpStatus.OK;
  }

  private unwrapData(data: unknown): unknown {
    if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
      return (data as { data: unknown }).data;
    }
    return data;
  }

  private extractUserId(result: unknown): string | null {
    if (!result || typeof result !== 'object') return null;

    const payload = result as Record<string, unknown>;
    const user = payload.user;

    if (user && typeof user === 'object') {
      const id = (user as Record<string, unknown>).id;
      if (typeof id === 'string') return id;
    }

    return null;
  }

  private extractTargetId(request: AuthenticatedRequest, result: unknown): string | null {
    const params = (request.params ?? {}) as Record<string, string | undefined>;

    if (params.id) return params.id;

    for (const [key, value] of Object.entries(params)) {
      if (key.endsWith('Id') && typeof value === 'string' && value) {
        return value;
      }
    }

    if (!result || typeof result !== 'object') return null;

    const payload = result as Record<string, unknown>;
    const user = payload.user;

    if (user && typeof user === 'object') {
      const id = (user as Record<string, unknown>).id;
      if (typeof id === 'string') return id;
    }

    if (typeof payload.id === 'string') return payload.id;
    return null;
  }

  private inferTargetType(request: AuthenticatedRequest): string | null {
    const [first] = this.pathSegments(request);
    return first ? (TARGET_TYPE_BY_SEGMENT[first] ?? null) : null;
  }

  private inferAction(request: AuthenticatedRequest): string {
    const segments = this.pathSegments(request).map((segment) =>
      /^\d+$/.test(segment) || /^[a-z0-9]{20,}$/i.test(segment) ? ':id' : segment,
    );

    const suffix = segments.length > 0 ? `_${segments.join('_').toUpperCase()}` : '_ROOT';
    return `HTTP_${request.method.toUpperCase()}${suffix}`;
  }

  private pathSegments(request: AuthenticatedRequest): string[] {
    return request.path
      .split('/')
      .filter(Boolean)
      .filter((segment) => segment !== 'api');
  }

  private getClientIp(request: AuthenticatedRequest): string | null {
    // Express 在 trust proxy 开启后会按代理层数解析 X-Forwarded-For，
    // 避免直接取首项被客户端伪造。
    const raw = request.ip ?? request.socket.remoteAddress;

    if (!raw) return null;
    return raw
      .trim()
      .replace(/^::ffff:/, '')
      .slice(0, 64);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object') {
        const message = (response as { message?: unknown }).message;
        if (Array.isArray(message)) return message.map(String).join('；');
        if (typeof message === 'string') return message;
      }
      return error.message;
    }

    if (error instanceof Error) return error.message;
    return String(error);
  }

  /** 深度脱敏 + 截断，确保审计 JSON 不含口令、JWT、API Key，也不会无限膨胀。 */
  private toJsonSafe(value: unknown): unknown {
    const sanitized = this.sanitize(value, 0, new WeakSet<object>());

    try {
      return JSON.parse(JSON.stringify(sanitized));
    } catch {
      return { _audit_error: 'detail serialization failed' };
    }
  }

  private sanitize(value: unknown, depth: number, seen: WeakSet<object>): unknown {
    if (value === null || value === undefined) return null;

    if (depth > 6) return '[MaxDepth]';

    if (typeof value === 'string') {
      return value.length > 4000 ? `${value.slice(0, 4000)}…[truncated]` : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;

    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return '[Buffer]';

    if (Array.isArray(value)) {
      return value.slice(0, 100).map((item) => this.sanitize(item, depth + 1, seen));
    }

    if (typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);

      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          result[key] = '[REDACTED]';
        } else {
          const sanitizedItem = this.sanitize(item, depth + 1, seen);
          if (sanitizedItem !== undefined) {
            result[key] = sanitizedItem;
          }
        }
      }

      seen.delete(value);
      return result;
    }

    return String(value);
  }
}
