import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CreateWorkerSchema } from '@dhakad/shared';
import { TablePagination } from '@/components/table/TablePagination';
import { useCreateWorkerMutation, useGetWorkersQuery } from '@/services/api/worker-api';
import { WorkerPaymentModal } from './WorkerDetailPage';

const rupees = (v: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v));
export const WorkersPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState(false);
  const [paymentWorkerId, setPaymentWorkerId] = useState<string>();
  const { data, isLoading, isError } = useGetWorkersQuery({
    ...(search.trim() ? { search: search.trim() } : {}),
    page,
    pageSize,
  });
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-label">Workforce</p>
          <h1 className="mt-1 text-3xl font-bold">Workers</h1>
          <p className="mt-2 text-sm text-stone-600">
            Manage workers and their separate payment history.
          </p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>
          Add worker
        </button>
      </header>
      <section className="card">
        <label className="field-label block max-w-md">
          Search by name or mobile
          <input
            className="field mt-2"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search workers"
          />
        </label>
      </section>
      <section className="table-panel">
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Mobile</th>
              <th className="text-right">Payments</th>
              <th className="text-right">Total paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.workers.map((w) => (
              <tr key={w.id}>
                <td>
                  <Link
                    className="font-bold text-brand-800 hover:underline"
                    to={`/admin/workers/${w.id}`}
                  >
                    {w.name}
                  </Link>
                  <div className="text-xs text-stone-500">
                    WRK-{String(w.workerNumber).padStart(5, '0')}
                  </div>
                </td>
                <td>{w.mobile || '—'}</td>
                <td className="text-right font-semibold">{w.paymentCount}</td>
                <td className="text-right font-bold tabular-nums">{rupees(w.totalPaid)}</td>
                <td>{w.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <button
                    className="primary-button min-h-0 px-3 py-2"
                    disabled={!w.isActive}
                    onClick={() => setPaymentWorkerId(w.id)}
                  >
                    Add payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <p className="p-5">Loading workers…</p>}
        {isError && <p className="p-5 text-red-700">Workers could not be loaded.</p>}
        {!isLoading && !data?.workers.length && (
          <p className="p-5 text-stone-600">No workers found.</p>
        )}
        {data && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            totalPages={Math.ceil(data.total / pageSize)}
            onPageChange={setPage}
            onPageSizeChange={(v) => {
              setPageSize(v);
              setPage(1);
            }}
          />
        )}
      </section>
      {open && <WorkerModal onClose={() => setOpen(false)} />}
      {paymentWorkerId && (
        <WorkerPaymentModal id={paymentWorkerId} onClose={() => setPaymentWorkerId(undefined)} />
      )}
    </div>
  );
};
const WorkerModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [create, state] = useCreateWorkerMutation();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = CreateWorkerSchema.safeParse({
      name,
      mobile: mobile || null,
      notes: notes || null,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((x) => [x.path.join('.'), x.message])));
      return;
    }
    try {
      await create(parsed.data).unwrap();
      onClose();
    } catch {
      setErrors({ form: 'Unable to add worker.' });
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="card w-full max-w-xl">
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold">Add worker</h2>
          <button className="secondary-button min-h-0" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="mt-5 space-y-4" noValidate onSubmit={(e) => void submit(e)}>
          <label className="field-label block">
            Worker name *
            <input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <span className="mt-1 block text-xs text-red-700">{errors.name}</span>}
          </label>
          <label className="field-label block">
            Mobile number
            <input
              className="field mt-2"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            {errors.mobile && (
              <span className="mt-1 block text-xs text-red-700">{errors.mobile}</span>
            )}
          </label>
          <label className="field-label block">
            Notes
            <textarea
              className="field mt-2 min-h-24"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {errors.form && <p className="text-sm font-semibold text-red-700">{errors.form}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={state.isLoading}>
              Save worker
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
