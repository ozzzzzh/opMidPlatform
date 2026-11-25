import type {
  CreateSubsystemPayload,
  SubsystemItem,
  SubsystemListQuery,
  SubsystemListResponse,
  UpdateSubsystemPayload,
} from '@it-ops/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export function fetchSubsystems(params: SubsystemListQuery): Promise<SubsystemListResponse> {
  return apiGet<SubsystemListResponse>('/subsystems', { params });
}

export function createSubsystem(payload: CreateSubsystemPayload): Promise<SubsystemItem> {
  return apiPost<SubsystemItem, CreateSubsystemPayload>('/subsystems', payload);
}

export function updateSubsystem(
  id: string,
  payload: UpdateSubsystemPayload,
): Promise<SubsystemItem> {
  return apiPatch<SubsystemItem, UpdateSubsystemPayload>(`/subsystems/${id}`, payload);
}

export function deleteSubsystem(id: string): Promise<void> {
  return apiDelete<void>(`/subsystems/${id}`);
}
