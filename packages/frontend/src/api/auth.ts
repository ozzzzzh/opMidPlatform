import type { AuthUser, LoginResponse } from '@it-ops/shared';
import { apiGet, apiPost } from './client';

export interface LoginPayload {
  username: string;
  password: string;
}

export function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  return apiPost<LoginResponse, LoginPayload>('/auth/login', payload);
}

export function getMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export function logoutRequest(): Promise<{ success: true }> {
  return apiPost<{ success: true }>('/auth/logout');
}
