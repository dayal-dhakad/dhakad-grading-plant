import { useDeferredValue, useState, type FormEvent } from 'react';
import { CreateStaffSchema } from '@dhakad/shared';
import { Link } from 'react-router-dom';
import {
  useCreateStaffMutation,
  useGetStaffListQuery,
  useSetStaffStatusMutation,
} from '@/services/api/staff-api';
import { TablePagination } from '../table/TablePagination';

export const StaffManagementPage = () => {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const { data, isLoading } = useGetStaffListQuery({
    ...(deferred ? { search: deferred } : {}),
    status,
    page,
    pageSize,
  });
  const [create, createState] = useCreateStaffMutation();
  const [setStaffStatus] = useSetStaffStatusMutation();
  const closeForm = () => {
    setShowForm(false);
    setName('');
    setMobile('');
    setPassword('');
    setShowPassword(false);
    setMessage('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = CreateStaffSchema.safeParse({ name, mobile, password });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the details');
      return;
    }
    try {
      await create(parsed.data).unwrap();
      closeForm();
    } catch {
      setMessage('Unable to create staff. The mobile number may already be in use.');
    }
  };
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Team access</p>
          <h1 className="mt-1 text-3xl font-bold">Staff</h1>
        </div>
        <button className="primary-button" onClick={() => setShowForm(true)}>
          + Create staff account
        </button>
      </div>
      {showForm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-staff-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <form
            onSubmit={(event) => void submit(event)}
            className="grid max-h-[calc(100vh-2rem)] w-full max-w-2xl gap-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:grid-cols-2"
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 sm:col-span-2">
              <div>
                <p className="card-label">Team access</p>
                <h2 id="create-staff-title" className="mt-1 text-xl font-bold">
                  New staff account
                </h2>
              </div>
              <button
                type="button"
                className="grid min-h-9 w-9 place-items-center rounded-full text-xl text-stone-500 hover:bg-stone-100"
                aria-label="Close staff form"
                onClick={closeForm}
              >
                ×
              </button>
            </div>
            <label className="field-label">
              Name *
              <input
                className="field mt-2"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field-label">
              Mobile number *
              <input
                className="field mt-2"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </label>
            <label className="field-label sm:col-span-2">
              Password *
              <div className="relative mt-2">
                <input
                  className="field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid min-w-12 place-items-center rounded-r-xl text-brand-800 transition hover:bg-brand-100 focus-visible:bg-brand-100"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide Password' : 'Show temporary password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a16.6 16.6 0 01-2.1 2.5M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5a9.8 9.8 0 004-.8" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
            {message && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2"
              >
                {message}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-stone-200 pt-3 sm:col-span-2">
              <button type="button" className="secondary-button" onClick={closeForm}>
                Cancel
              </button>
              <button className="primary-button" disabled={createState.isLoading}>
                {createState.isLoading ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      )}
      <section className="card mt-6">
        <input
          className="field"
          type="search"
          placeholder="Search name or mobile"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="mt-4 flex gap-2">
          {(['active', 'inactive', 'all'] as const).map((item) => (
            <button
              key={item}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${status === item ? 'bg-brand-800 text-white' : 'bg-stone-100'}`}
              onClick={() => {
                setStatus(item);
                setPage(1);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <div className="table-panel mt-5">
        <table className="data-table min-w-[680px]">
          <thead>
            <tr>
              <th className="p-4">Staff</th>
              <th className="p-4">Mobile</th>
              <th className="p-4">Entries</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {isLoading ? (
              <tr>
                <td className="p-5" colSpan={5}>
                  Loading staff…
                </td>
              </tr>
            ) : (
              data?.staff.map((staff) => (
                <tr key={staff.id}>
                  <td className="table-primary">
                    <Link
                      className="text-brand-800 hover:underline"
                      to={`/admin/staff/${staff.id}`}
                    >
                      {staff.name}
                    </Link>
                  </td>
                  <td className="p-4">{staff.mobile}</td>
                  <td className="table-money">{staff.entryCount}</td>
                  <td className="p-4">
                    <span
                      className={`status-badge ${staff.isActive ? 'status-badge-positive' : 'status-badge-muted'}`}
                    >
                      {staff.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      className="text-sm font-semibold text-brand-800 hover:underline"
                      onClick={() =>
                        void setStaffStatus({ id: staff.id, isActive: !staff.isActive })
                      }
                    >
                      {staff.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={data?.pagination.total ?? 0}
          totalPages={data?.pagination.totalPages ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};
