import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useGetCurrentUserQuery, useLogoutMutation } from '@/services/api/auth-api';
import { BrandMark } from './BrandMark';

const adminItems = [
  { label: 'Dashboard', path: '/admin', icon: 'dashboard', enabled: true },
  { label: 'Entries', path: '/admin/entries', icon: 'entries', enabled: true },
  { label: 'Payments', path: '/admin/payments', icon: 'payments', enabled: true },
  { label: 'Expenses', path: '/admin/expenses', icon: 'expenses', enabled: true },
  { label: 'Customers', path: '/admin/customers', icon: 'customers', enabled: true },
  { label: 'Staff', path: '/admin/staff', icon: 'staff', enabled: true },
  { label: 'Reports', path: '/admin/reports', icon: 'dashboard', enabled: true },
  { label: 'Grading Settings', path: '/admin/grading-settings', icon: 'settings', enabled: true },
  { label: 'Seeds & Stock', path: '/admin/seeds', icon: 'seeds', enabled: true },
  { label: 'Payment Accounts', path: '/admin/payment-accounts', icon: 'payments', enabled: true },
];
const staffItems = [
  { label: 'New Entry', path: '/staff/new-entry', icon: 'new-entry', enabled: true },
  { label: 'My Entries', path: '/staff/entries', icon: 'entries', enabled: true },
  { label: 'Payments', path: '/staff/payments', icon: 'payments', enabled: true },
  { label: 'Expenses', path: '/staff/expenses', icon: 'expenses', enabled: true },
];

const SidebarIcon = ({ name }: { name: string }) => {
  const paths: Record<string, ReactNode> = {
    dashboard: (
      <>
        <path d="M4 13h6V4H4v9zm10 7h6V11h-6v9zM4 20h6v-3H4v3zm10-13h6V4h-6v3z" />
      </>
    ),
    staff: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-2a5.5 5.5 0 0111 0v2M16 6a3 3 0 010 6m1.5 3a4 4 0 013 3.5V20" />
      </>
    ),
    customers: (
      <>
        <circle cx="8" cy="9" r="3" />
        <circle cx="17" cy="8" r="2.5" />
        <path d="M2.5 20v-2a5.5 5.5 0 0111 0v2m1-6a4.5 4.5 0 017 4v2" />
      </>
    ),
    settings: (
      <>
        <path d="M4 6h10m4 0h2M4 12h3m4 0h9M4 18h8m4 0h4" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="14" cy="18" r="2" />
      </>
    ),
    entries: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9 12h7M9 16h7" />
      </>
    ),
    payments: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    expenses: (
      <>
        <path d="M4 7h16v12H4zM7 7V5h10v2M8 12h8M8 15h5" />
      </>
    ),
    seeds: (
      <>
        <path d="M12 21V9M12 14c-4 0-7-2-7-6 4 0 7 2 7 6zm0-3c4 0 7-2 7-6-4 0-7 2-7 6z" />
      </>
    ),
    'new-entry': (
      <>
        <path d="M6 3h9l4 4v14H6zM14 3v5h5M12 12v6M9 15h6" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
};

export const AppShell = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem('dhakad-sidebar-collapsed') === 'true',
  );
  useEffect(() => {
    window.localStorage.setItem('dhakad-sidebar-collapsed', String(collapsed));
  }, [collapsed]);
  const { data: user } = useGetCurrentUserQuery();
  const [logout, { isLoading }] = useLogoutMutation();
  const items = user?.role === 'ADMIN' ? adminItems : staffItems;
  const nav = (isCollapsed = false) => (
    <>
      <div
        className={`border-b border-stone-200 py-4 ${isCollapsed ? 'grid place-items-center px-2' : 'px-4'}`}
      >
        <BrandMark compact={isCollapsed} />
      </div>
      <nav className="flex-1 space-y-1 p-2.5" aria-label="Main navigation">
        {items.map((item) =>
          item.enabled && item.path ? (
            <NavLink
              key={item.label}
              to={item.path}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item gap-3 ${isCollapsed ? 'justify-center px-2' : ''} ${isActive ? 'nav-item-active' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
              aria-label={isCollapsed ? item.label : undefined}
            >
              <SidebarIcon name={item.icon} />
              {!isCollapsed && <span className="flex-1">{item.label}</span>}
            </NavLink>
          ) : (
            <button key={item.label} className="nav-item" disabled>
              <span>{item.label}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                Soon
              </span>
            </button>
          ),
        )}
      </nav>
      <div className="border-t border-stone-200 p-3">
        <button
          className={`secondary-button flex w-full items-center justify-center gap-2 ${isCollapsed ? 'px-2' : ''}`}
          disabled={isLoading}
          onClick={() => void logout()}
          title={isCollapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
          </svg>
          {!isCollapsed && (isLoading ? 'Signing out…' : 'Sign out')}
        </button>
      </div>
    </>
  );
  return (
    <div className="min-h-screen bg-stone-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-stone-200 bg-white transition-[width] duration-200 md:flex ${collapsed ? 'w-[4.5rem]' : 'w-[13.5rem]'}`}
      >
        {nav(collapsed)}
        <button
          type="button"
          className="absolute -right-3 top-20 grid size-7 min-h-0 place-items-center rounded-full border border-stone-300 bg-white text-stone-600 shadow-sm hover:text-brand-800"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`size-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            className="absolute inset-0 min-h-0 w-full bg-stone-950/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(82vw,15rem)] flex-col bg-white shadow-xl">
            {nav(false)}
          </aside>
        </div>
      )}
      <div
        className={`min-w-0 transition-[margin] duration-200 ${collapsed ? 'md:ml-[4.5rem]' : 'md:ml-[13.5rem]'}`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            className="secondary-button mr-auto px-3 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="ml-auto flex items-center gap-3">
            {user?.role === 'STAFF' && (
              <NavLink
                to="/staff/new-entry"
                className="primary-button flex min-h-10 items-center gap-2 px-3 sm:px-4"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden sm:inline">New entry</span>
                <span className="sm:hidden">New</span>
              </NavLink>
            )}
            <div className="text-right leading-tight">
              <p className="max-w-48 truncate text-sm font-bold text-stone-900">{user?.name}</p>
              <p className="mt-1 text-xs font-medium text-stone-500">{user?.mobile}</p>
            </div>
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800"
              title={user?.name}
            >
              {user?.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
