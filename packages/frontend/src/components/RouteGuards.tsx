import { Result, Spin } from 'antd';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role } from '@it-ops/shared';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

export function FullPageSpin({ tip }: { tip?: string }) {
  const { t } = useI18n();
  return (
    <div className="full-page-spin">
      <Spin size="large" tip={tip ?? t('common.loading')}>
        <div className="spin-placeholder" />
      </Spin>
    </div>
  );
}

export function RequireAuth() {
  const { token, user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (!token) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (loading || !user) {
    return <FullPageSpin tip={t('guard.checking')} />;
  }

  return <Outlet />;
}

export function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) {
    return <FullPageSpin />;
  }

  if (!roles.includes(user.role)) {
    return <Result status="403" title="403" subTitle={t('guard.forbidden')} />;
  }

  return <>{children}</>;
}
