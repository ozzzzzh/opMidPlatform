import type { DashboardReport } from '@it-ops/shared';
import { apiGet } from './client';

export function fetchDashboard(): Promise<DashboardReport> {
  return apiGet<DashboardReport>('/dashboard');
}
