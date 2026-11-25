import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';
export const SKIP_AUDIT_KEY = 'skipAudit';

export interface AuditOptions {
  action: string;
  targetType?: string;
}

/**
 * 为写操作声明稳定的审计动作名。未声明的写接口仍会被 AuditInterceptor 兜底记录。
 */
export const Audit = (action: string, options: Omit<AuditOptions, 'action'> = {}) =>
  SetMetadata(AUDIT_KEY, { action, ...options } satisfies AuditOptions);

/** 只读 POST（例如凭证查询）不写入审计，避免泄露查询码。 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
