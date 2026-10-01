import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CreateWorkerPaymentSchema, type WorkerPaymentMethod } from '@dhakad/shared';
import { MoneyInput } from '@/components/form/MoneyInput';
import { TablePagination } from '@/components/table/TablePagination';
import {
  useCreateWorkerPaymentMutation,
  useGetWorkerPaymentsQuery,
  useGetWorkerQuery,
} from '@/services/api/worker-api';
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const rupees = (v: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v));
export const WorkerDetailPage = () => {
  const { id = '' } = useParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState(false);
  const worker = useGetWorkerQuery(id);
  const payments = useGetWorkerPaymentsQuery({ id, page, pageSize }, { skip: !id });
  if (worker.isLoading) return <p>Loading worker…</p>;
  if (!worker.data) return <p className="text-red-700">Worker could not be loaded.</p>;
  const w = worker.data;
  return (
    <div className="space-y-5">
      <header>
        <Link to="/admin/workers" className="text-sm font-semibold text-brand-800 hover:underline">
          ← Back to workers
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="card-label">WRK-{String(w.workerNumber).padStart(5, '0')}</p>
            <h1 className="mt-1 text-3xl font-bold">{w.name}</h1>
            <p className="mt-2 text-sm text-stone-600">
              {w.mobile || 'No mobile number'}
              {w.notes ? ` · ${w.notes}` : ''}
            </p>
          </div>
          <button className="primary-button" disabled={!w.isActive} onClick={() => setOpen(true)}>
            Add payment
          </button>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="card">
          <p className="card-label">Payments recorded</p>
          <p className="mt-2 text-2xl font-bold">{payments.data?.total ?? w.paymentCount}</p>
        </article>
        <article className="card">
          <p className="card-label">Total paid</p>
          <p className="mt-2 text-2xl font-bold text-brand-800">
            {rupees(payments.data?.totalPaid ?? w.totalPaid)}
          </p>
        </article>
      </section>
      <section className="table-panel">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Payment no.</th>
              <th>Date</th>
              <th>Method</th>
              <th>Notes</th>
              <th>Recorded by</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.data?.payments.map((p) => (
              <tr key={p.id}>
                <td className="font-bold">WPM-{String(p.paymentNumber).padStart(6, '0')}</td>
                <td>{p.paymentDate}</td>
                <td>{p.paymentMethod === 'CASH' ? 'Cash' : 'Online'}</td>
                <td>{p.notes || '—'}</td>
                <td>{p.recordedByName}</td>
                <td className="text-right font-bold tabular-nums">{rupees(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.isLoading && <p className="p-5">Loading payments…</p>}
        {payments.isError && (
          <p className="p-5 text-red-700">Payment history could not be loaded.</p>
        )}
        {!payments.isLoading && !payments.data?.payments.length && (
          <p className="p-5 text-stone-600">No payments recorded for this worker.</p>
        )}
        {payments.data && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={payments.data.total}
            totalPages={Math.ceil(payments.data.total / pageSize)}
            onPageChange={setPage}
            onPageSizeChange={(v) => {
              setPageSize(v);
              setPage(1);
            }}
          />
        )}
      </section>
      {open && <WorkerPaymentModal id={id} onClose={() => setOpen(false)} />}
    </div>
  );
};
export const WorkerPaymentModal = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const [paymentDate, setDate] = useState(localDate());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setMethod] = useState<WorkerPaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [create, state] = useCreateWorkerPaymentMutation();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = CreateWorkerPaymentSchema.safeParse({
      paymentDate,
      amount,
      paymentMethod,
      notes: notes || null,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((x) => [x.path.join('.'), x.message])));
      return;
    }
    try {
      await create({ id, input: parsed.data }).unwrap();
      onClose();
    } catch {
      setErrors({ form: 'Unable to record payment.' });
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
          <h2 className="text-2xl font-bold">Add worker payment</h2>
          <button className="secondary-button min-h-0" onClick={onClose}>
            Close
          </button>
        </div>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => void submit(e)}
        >
          <label className="field-label">
            Payment date *
            <input
              type="date"
              className="field mt-2"
              value={paymentDate}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.paymentDate && <small className="text-red-700">{errors.paymentDate}</small>}
          </label>
          <label className="field-label">
            Amount *
            <MoneyInput
              className="field mt-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {errors.amount && <small className="text-red-700">{errors.amount}</small>}
          </label>
          <label className="field-label">
            Payment method *
            <select
              className="field mt-2"
              value={paymentMethod}
              onChange={(e) => setMethod(e.target.value as WorkerPaymentMethod)}
            >
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </label>
          <label className="field-label sm:col-span-2">
            Notes
            <textarea
              className="field mt-2 min-h-24"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {errors.form && (
            <p className="text-sm font-semibold text-red-700 sm:col-span-2">{errors.form}</p>
          )}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={state.isLoading}>
              Record payment
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
