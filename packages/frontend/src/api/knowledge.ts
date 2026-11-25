import type {
  CreateKnowledgeCardPayload,
  CreateKnowledgeDocumentPayload,
  KnowledgeArticleDetail,
  KnowledgeArticleSummary,
  KnowledgeListQuery,
  KnowledgeListResponse,
  KnowledgeMetaResponse,
  KnowledgeTicketContext,
  UpdateKnowledgeCardPayload,
} from '@it-ops/shared';
import { apiDelete, apiGet, apiPatch, apiPost, http } from './client';

export function fetchKnowledgeList(params: KnowledgeListQuery): Promise<KnowledgeListResponse> {
  return apiGet<KnowledgeListResponse>('/knowledge', { params });
}

export function fetchKnowledgeMeta(): Promise<KnowledgeMetaResponse> {
  return apiGet<KnowledgeMetaResponse>('/knowledge/meta');
}

export function fetchKnowledge(id: string): Promise<KnowledgeArticleDetail> {
  return apiGet<KnowledgeArticleDetail>(`/knowledge/${id}`);
}

export function suggestKnowledge(q: string, limit = 5): Promise<KnowledgeArticleSummary[]> {
  return apiGet<KnowledgeArticleSummary[]>('/knowledge/suggest', { params: { q, limit } });
}

export function fetchTicketKnowledge(ticketId: string): Promise<KnowledgeTicketContext> {
  return apiGet<KnowledgeTicketContext>(`/knowledge/for-ticket/${ticketId}`);
}

export function linkTicketKnowledge(
  ticketId: string,
  articleId: string,
): Promise<KnowledgeTicketContext> {
  return apiPost<KnowledgeTicketContext, { articleId: string }>(
    `/knowledge/for-ticket/${ticketId}/link`,
    { articleId },
  );
}

export function unlinkTicketKnowledge(
  ticketId: string,
  articleId: string,
): Promise<KnowledgeTicketContext> {
  return apiDelete<KnowledgeTicketContext>(`/knowledge/for-ticket/${ticketId}/link/${articleId}`);
}

export function createKnowledgeCard(
  payload: CreateKnowledgeCardPayload,
): Promise<KnowledgeArticleDetail> {
  return apiPost<KnowledgeArticleDetail, CreateKnowledgeCardPayload>('/knowledge', payload);
}

export function updateKnowledgeCard(
  id: string,
  payload: UpdateKnowledgeCardPayload,
): Promise<KnowledgeArticleDetail> {
  return apiPatch<KnowledgeArticleDetail, UpdateKnowledgeCardPayload>(`/knowledge/${id}`, payload);
}

export function publishKnowledge(id: string): Promise<KnowledgeArticleDetail> {
  return apiPost<KnowledgeArticleDetail>(`/knowledge/${id}/publish`);
}

export function archiveKnowledge(id: string): Promise<KnowledgeArticleDetail> {
  return apiPost<KnowledgeArticleDetail>(`/knowledge/${id}/archive`);
}

export function deleteKnowledge(id: string): Promise<void> {
  return apiDelete<void>(`/knowledge/${id}`);
}

export async function uploadKnowledgeDocument(
  payload: CreateKnowledgeDocumentPayload,
  file: File,
): Promise<KnowledgeArticleDetail> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('space', payload.space);
  formData.append('docType', payload.docType);
  if (payload.system) formData.append('system', payload.system);
  if (payload.category) formData.append('category', payload.category);
  if (payload.summary) formData.append('summary', payload.summary);
  if (payload.ownerId) formData.append('ownerId', payload.ownerId);
  if (payload.tags?.length) formData.append('tags', JSON.stringify(payload.tags));
  if (payload.keywords?.length) formData.append('keywords', JSON.stringify(payload.keywords));
  formData.append('file', file);

  const response = await http.post<{ data: KnowledgeArticleDetail }>(
    '/knowledge/documents',
    formData,
  );
  return response.data.data;
}

export function updateKnowledgeDocument(
  id: string,
  payload: Partial<CreateKnowledgeDocumentPayload>,
): Promise<KnowledgeArticleDetail> {
  return apiPatch<KnowledgeArticleDetail, Partial<CreateKnowledgeDocumentPayload>>(
    `/knowledge/${id}/document`,
    payload,
  );
}

export async function replaceKnowledgeDocumentFile(
  id: string,
  file: File,
): Promise<KnowledgeArticleDetail> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await http.post<{ data: KnowledgeArticleDetail }>(
    `/knowledge/${id}/file`,
    formData,
  );
  return response.data.data;
}

export async function downloadKnowledgeFile(id: string): Promise<Blob> {
  const response = await http.get<Blob>(`/knowledge/${id}/file`, { responseType: 'blob' });
  return response.data;
}

export function knowledgeAttachmentUrl(attachmentId: string): string {
  return `/api/knowledge/attachments/${attachmentId}/file`;
}

export async function uploadKnowledgeAttachments(
  id: string,
  files: File[],
): Promise<KnowledgeArticleDetail> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await http.post<{ data: KnowledgeArticleDetail }>(
    `/knowledge/${id}/attachments`,
    formData,
  );
  return response.data.data;
}

export function deleteKnowledgeAttachment(attachmentId: string): Promise<void> {
  return apiDelete<void>(`/knowledge/attachments/${attachmentId}`);
}
