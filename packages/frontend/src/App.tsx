import { Result } from 'antd';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Role } from '@it-ops/shared';
import { FullPageSpin, RequireAuth, RoleGuard } from '@/components/RouteGuards';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import ContactsPage from '@/pages/ContactsPage';
import KnowledgeDetailPage from '@/pages/KnowledgeDetailPage';
import KnowledgeEditorPage from '@/pages/KnowledgeEditorPage';
import KnowledgePage from '@/pages/KnowledgePage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import StaffTicketCreatePage from '@/pages/StaffTicketCreatePage';
import SubsystemsPage from '@/pages/SubsystemsPage';
import TicketDetailPage from '@/pages/TicketDetailPage';
import TicketsPage from '@/pages/TicketsPage';
import UsersPage from '@/pages/UsersPage';
import ReportPage from '@/pages/public/ReportPage';
import TrackLookupPage from '@/pages/public/TrackLookupPage';
import TrackPage from '@/pages/public/TrackPage';

const AuditPage = lazy(() => import('@/pages/AuditPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

function HomeRedirect() {
  const { token, user, loading } = useAuth();

  if (!token) return <Navigate to="/report" replace />;
  if (loading) return <FullPageSpin />;
  if (!user) return <Navigate to="/report" replace />;

  return <Navigate to={user.role === Role.USER ? '/tickets' : '/dashboard'} replace />;
}

export default function App() {
  const { t } = useI18n();

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/track" element={<TrackLookupPage />} />
      <Route path="/track/:token" element={<TrackPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route
            path="dashboard"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <Suspense fallback={<FullPageSpin />}>
                  <DashboardPage />
                </Suspense>
              </RoleGuard>
            }
          />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/new" element={<StaffTicketCreatePage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route
            path="knowledge"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <KnowledgePage />
              </RoleGuard>
            }
          />
          <Route
            path="knowledge/new"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <KnowledgeEditorPage />
              </RoleGuard>
            }
          />
          <Route
            path="knowledge/:id/edit"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <KnowledgeEditorPage />
              </RoleGuard>
            }
          />
          <Route
            path="knowledge/:id"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <KnowledgeDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="subsystems"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <SubsystemsPage />
              </RoleGuard>
            }
          />
          <Route
            path="contacts"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <ContactsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/users"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="dashboard/audit"
            element={
              <RoleGuard roles={[Role.ADMIN, Role.OPS]}>
                <Suspense fallback={<FullPageSpin />}>
                  <AuditPage />
                </Suspense>
              </RoleGuard>
            }
          />
          <Route
            path="forbidden"
            element={<Result status="403" title="403" subTitle={t('guard.forbidden')} />}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
