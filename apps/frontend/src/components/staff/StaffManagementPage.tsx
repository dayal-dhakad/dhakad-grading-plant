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
  const [message, setMessage] = useState('');
  const { data, isLoading } = useGetStaffListQuery({
    ...(deferred ? { search: deferred } : {}),
    status,
    page,
    pageSize,
  });
  const [create, createState] = useCreateStaffMutation();
  const [setStaffStatus] = useSetStaffStatusMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = CreateStaffSchema.safeParse({ name, mobile, password });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the details');
      return;
    }
    try {
      await create(parsed.data).unwrap();
      setName('');
      setMobile('');
      setPassword('');
      setMessage('');
      setShowForm(false);
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
        <button className="primary-button" onClick={() => setShowForm((value) => !value)}>
          {showForm ? 'Close form' : '+ Create staff account'}
        </button>
      </div>
      {showForm && (
        <form
          onSubmit={(event) => void submit(event)}
          className="card mt-6 grid gap-4 sm:grid-cols-2"
        >
          <h2 className="text-xl font-bold sm:col-span-2">New staff account</h2>
          <label className="field-label">
            Name
            <input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field-label">
            Mobile number
            <input
              className="field mt-2"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </label>
          <label className="field-label sm:col-span-2">
            Temporary password
            <input
              className="field mt-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{message}</p>}
          <button
            className="primary-button sm:col-span-2 sm:justify-self-end"
            disabled={createState.isLoading}
          >
            Create account
          </button>
        </form>
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
