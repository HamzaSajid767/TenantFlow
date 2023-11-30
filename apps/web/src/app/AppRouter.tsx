import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { RequireAuth } from './RequireAuth';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { AcceptInvitationPage } from '../features/invitations/AcceptInvitationPage';
import { ApiKeysPage } from '../features/organizations/ApiKeysPage';
import { AuditLogsPage } from '../features/organizations/AuditLogsPage';
import { DashboardPage } from '../features/organizations/DashboardPage';
import { MembersPage } from '../features/organizations/MembersPage';
import { OrganizationsPage } from '../features/organizations/OrganizationsPage';
import { ProjectsPage } from '../features/organizations/ProjectsPage';
import { UsagePage } from '../features/organizations/UsagePage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Navigate to="/organizations" replace />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/organizations/:id" element={<DashboardPage />} />
          <Route path="/organizations/:id/members" element={<MembersPage />} />
          <Route path="/organizations/:id/projects" element={<ProjectsPage />} />
          <Route path="/organizations/:id/api-keys" element={<ApiKeysPage />} />
          <Route path="/organizations/:id/usage" element={<UsagePage />} />
          <Route path="/organizations/:id/audit-logs" element={<AuditLogsPage />} />
          <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/organizations" replace />} />
    </Routes>
  );
}
