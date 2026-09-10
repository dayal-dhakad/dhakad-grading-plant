import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { CustomersPage } from '@/components/customers/CustomersPage';
import { CustomerDetailPage } from '@/components/customers/CustomerDetailPage';
import { AdminEntriesPage } from '@/components/admin/AdminEntriesPage';
import { GradingSettingsPage } from '@/components/admin/GradingSettingsPage';
import { DashboardPage } from '@/components/DashboardPage';
import { LoginPage } from '@/components/LoginPage';
import { StaffManagementPage } from '@/components/staff/StaffManagementPage';
import { StaffDetailPage } from '@/components/staff/StaffDetailPage';
import { StaffEntryPage } from '@/components/staff/StaffEntryPage';
import { MyEntriesPage } from '@/components/staff/MyEntriesPage';
import { EditGradingEntryPage } from '@/components/grading/EditGradingEntryPage';
import { GradingRevisionHistoryPage } from '@/components/grading/GradingRevisionHistoryPage';
import { PaymentsPage } from '@/components/payments/PaymentsPage';
import { SeedManagementPage } from '@/components/admin/SeedManagementPage';
import { SeedDetailPage } from '@/components/admin/SeedDetailPage';
import { useGetCurrentUserQuery } from '@/services/api/auth-api';

const SessionGate = () => {
  const { data: user, isLoading } = useGetCurrentUserQuery();
  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100">
        <div className="text-center">
          <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
          <p className="mt-4 font-medium text-stone-600">Opening workspace…</p>
        </div>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

const LoginRoute = () => {
  const { data: user, isLoading } = useGetCurrentUserQuery();
  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100">
        <span className="block size-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
      </main>
    );
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/staff/new-entry'} replace />;
  return <LoginPage />;
};

const RoleGate = ({ role }: { role: 'ADMIN' | 'STAFF' }) => {
  const { data: user } = useGetCurrentUserQuery();
  return user?.role === role ? <Outlet /> : <Navigate to="/" replace />;
};

const RoleLanding = () => {
  const { data: user } = useGetCurrentUserQuery();
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/staff/new-entry'} replace />;
};

export const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/" element={<SessionGate />}>
      <Route index element={<RoleLanding />} />
      <Route element={<RoleGate role="ADMIN" />}>
        <Route path="admin" element={<DashboardPage />} />
        <Route path="admin/staff" element={<StaffManagementPage />} />
        <Route path="admin/staff/:id" element={<StaffDetailPage />} />
        <Route path="admin/customers" element={<CustomersPage />} />
        <Route path="admin/customers/:id" element={<CustomerDetailPage />} />
        <Route path="admin/entries" element={<AdminEntriesPage />} />
        <Route path="admin/grading-settings" element={<GradingSettingsPage />} />
        <Route path="admin/payments" element={<PaymentsPage admin />} />
        <Route path="admin/seeds" element={<SeedManagementPage />} />
        <Route path="admin/seeds/:id" element={<SeedDetailPage />} />
        <Route path="admin/entries/:id/history" element={<GradingRevisionHistoryPage admin />} />
      </Route>
      <Route element={<RoleGate role="STAFF" />}>
        <Route path="staff/new-entry" element={<StaffEntryPage />} />
        <Route path="staff/entries" element={<MyEntriesPage />} />
        <Route path="staff/entries/:id/edit" element={<EditGradingEntryPage />} />
        <Route path="staff/entries/:id/history" element={<GradingRevisionHistoryPage />} />
        <Route path="staff/payments" element={<PaymentsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
