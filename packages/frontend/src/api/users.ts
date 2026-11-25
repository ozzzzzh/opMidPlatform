import type { AuthUser, Paginated, Role, UserListQuery } from '@it-ops/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export interface UserQueryParams extends UserListQuery {
  page?: number;
  pageSize?: number;
}

export interface CreateUserPayload {
  username: string;
  displayName: string;
  email?: string | null;
  password: string;
  role?: Role;
  active?: boolean;
}

export interface UpdateUserPayload {
  displayName?: string;
  email?: string | null;
  password?: string;
  role?: Role;
  active?: boolean;
}

export function fetchUsers(params: UserQueryParams): Promise<Paginated<AuthUser>> {
  return apiGet<Paginated<AuthUser>>('/users', { params });
}

export function createUser(payload: CreateUserPayload): Promise<AuthUser> {
  return apiPost<AuthUser, CreateUserPayload>('/users', payload);
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<AuthUser> {
  return apiPatch<AuthUser, UpdateUserPayload>(`/users/${id}`, payload);
}

export function deactivateUser(id: string): Promise<AuthUser> {
  return apiDelete<AuthUser>(`/users/${id}`);
}
