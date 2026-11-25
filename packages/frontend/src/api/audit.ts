import type { AuditLogItem, AuditLogQuery, AuditReport, Paginated } from '@it-ops/shared';
import { apiGet, http } from './client';

export interface AuditQueryParams extends AuditLogQuery {
  page?: number;
  pageSize?: number;
}

export function fetchAuditLogs(params: AuditQueryParams): Promise<Paginated<AuditLogItem>> {
  return apiGet<Paginated<AuditLogItem>>('/audit/logs', { params });
}

export function fetchAuditReport(days: number): Promise<AuditReport> {
  return apiGet<AuditReport>('/audit/report', { params: { days } });
}

export async function downloadAuditReport(days: number, lang: 'zh' | 'en'): Promise<Blob> {
  const response = await http.get<Blob>('/audit/report/export', {
    params: { days, lang },
    responseType: 'blob',
  });
  return response.data;
}
