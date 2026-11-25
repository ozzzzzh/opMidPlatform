import type {
  ApiResponse,
  CreateStaffTicketPayload,
  CreateTicketPayload,
  CreateTicketResult,
  TicketCommentItem,
  TicketDetail,
  TicketListResponse,
  TicketQrResponse,
  TicketLookupResult,
  TicketQuery,
  TicketTracking,
} from '@it-ops/shared';
import { apiGet, apiPost, http } from './client';

function buildTicketFormData(payload: CreateTicketPayload, files: File[]): FormData {
  const formData = new FormData();
  formData.append('category', payload.category);
  formData.append('description', payload.description);
  formData.append('reporterName', payload.reporterName);
  formData.append('priority', payload.priority ?? 'MEDIUM');
  formData.append('source', payload.source ?? 'WEB');
  if (payload.title) formData.append('title', payload.title);
  if (payload.expectedAt) formData.append('expectedAt', payload.expectedAt);
  files.forEach((file) => formData.append('files', file));
  return formData;
}

export function fetchTickets(params: TicketQuery): Promise<TicketListResponse> {
  return apiGet<TicketListResponse>('/tickets', { params });
}

export function fetchTicket(id: string): Promise<TicketDetail> {
  return apiGet<TicketDetail>(`/tickets/${id}`);
}

export async function createTicket(
  payload: CreateTicketPayload,
  files: File[] = [],
): Promise<CreateTicketResult> {
  const response = await http.post<ApiResponse<CreateTicketResult>>(
    '/tickets',
    buildTicketFormData(payload, files),
  );
  return response.data.data;
}

export async function createStaffTicket(
  payload: CreateStaffTicketPayload,
  files: File[] = [],
): Promise<TicketDetail> {
  const formData = buildTicketFormData(payload, files);
  if (payload.assignToMe) formData.append('assignToMe', 'true');

  const response = await http.post<ApiResponse<TicketDetail>>('/tickets/staff', formData);
  return response.data.data;
}

export async function uploadTicketAttachments(id: string, files: File[]): Promise<TicketDetail> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await http.post<ApiResponse<TicketDetail>>(
    `/tickets/${id}/attachments`,
    formData,
  );
  return response.data.data;
}

export function fetchTicketTracking(publicToken: string): Promise<TicketTracking> {
  return apiGet<TicketTracking>(`/tickets/track/${encodeURIComponent(publicToken)}`);
}

export function lookupTicket(ticketNo: string, accessCode: string): Promise<TicketLookupResult> {
  return apiPost<TicketLookupResult, { ticketNo: string; accessCode: string }>('/tickets/lookup', {
    ticketNo,
    accessCode,
  });
}

export function attachmentUrl(attachmentId: string): string {
  return `/api/tickets/attachments/${attachmentId}/file`;
}

export function claimTicket(id: string): Promise<TicketDetail> {
  return apiPost<TicketDetail>(`/tickets/${id}/claim`);
}

export function resolveTicket(id: string, resolution: string): Promise<TicketDetail> {
  return apiPost<TicketDetail, { resolution: string }>(`/tickets/${id}/resolve`, { resolution });
}

export function closeTicket(id: string): Promise<TicketDetail> {
  return apiPost<TicketDetail>(`/tickets/${id}/close`);
}

export function addTicketComment(id: string, content: string): Promise<TicketCommentItem> {
  return apiPost<TicketCommentItem, { content: string }>(`/tickets/${id}/comments`, { content });
}

export function fetchTicketQr(): Promise<TicketQrResponse> {
  return apiGet<TicketQrResponse>('/tickets/qrcode');
}
