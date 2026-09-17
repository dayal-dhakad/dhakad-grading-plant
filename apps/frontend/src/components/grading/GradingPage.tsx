import { useDeferredValue, useMemo, useRef, useState, type FormEvent } from 'react';
import { CreateGradingEntrySchema } from '@dhakad/shared';
import { MoneyInput } from '@/components/form/MoneyInput';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import {
  useCancelGradingEntryMutation,
  useCreateGradingEntryMutation,
  useGetGradingEntriesQuery,
  useGetGradingReferencesQuery,
} from '@/services/api/grading-api';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const money = (value: number) => value.toFixed(2);

const EntryForm = ({ close }: { close: () => void }) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const deferredSearch = useDeferredValue(customerSearch.trim());
  const { data: customers } = useGetCustomersQuery({
    ...(deferredSearch ? { search: deferredSearch } : {}),
    status: 'active',
    page: 1,
    pageSize: 20,
  });
  const { data: references } = useGetGradingReferencesQuery();
  const [customerId, setCustomerId] = useState('');
  const [cropId, setCropId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE' | 'DUE'>('CASH');
  const [serviceDate, setServiceDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [paymentEdited, setPaymentEdited] = useState(false);
  const paymentBeforeDue = useRef({ amount: '', edited: false });
  const [message, setMessage] = useState('');
  const [create, state] = useCreateGradingEntryMutation();
  const crop = references?.crops.find((item) => item.id === cropId);
  const total = useMemo(
    () => money((Number(quantity) || 0) * (Number(crop?.rate) || 0)),
    [quantity, crop?.rate],
  );
  const displayedPaidAmount = paymentEdited ? paidAmount : total;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const parsed = CreateGradingEntrySchema.safeParse({
      customerId,
      cropId,
      quantity,
      paidAmount: displayedPaidAmount,
      paymentMethod,
      serviceDate,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the entry details');
      return;
    }
    try {
      await create(parsed.data).unwrap();
      close();
    } catch {
      setMessage('Unable to save the grading entry. Check the amount and try again.');
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-stone-950/45 sm:place-items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex justify-between">
          <div>
            <p className="card-label">Grading & cleaning</p>
            <h2 className="mt-1 text-2xl font-bold">New entry</h2>
          </div>
          <button className="secondary-button" onClick={close}>
            Close
          </button>
        </div>
        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="customer-search">
              Find customer
            </label>
            <input
              id="customer-search"
              className="field mt-2"
              placeholder="Name or mobile number"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <select
              aria-label="Select customer"
              className="field mt-2"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select customer</option>
              {customers?.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.mobile} · {item.village}
                </option>
              ))}
            </select>
          </div>
          <label className="field-label">
            Crop
            <select
              className="field mt-2"
              value={cropId}
              onChange={(e) => {
                setCropId(e.target.value);
                setPaymentEdited(false);
              }}
            >
              <option value="">Select crop</option>
              {references?.crops.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · ₹{item.rate}/{item.unit.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Quantity {crop ? `(${crop.unit.symbol})` : ''}
            <input
              className="field mt-2"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setPaymentEdited(false);
              }}
            />
          </label>
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="card-label">Calculated total</p>
            <p className="mt-1 text-2xl font-bold text-brand-900">₹{total}</p>
            <p className="text-xs text-stone-600">Quantity × crop rate</p>
          </div>
          <label className="field-label">
            Amount paid
            <MoneyInput
              className="field mt-2 disabled:cursor-not-allowed disabled:bg-stone-100"
              disabled={paymentMethod === 'DUE'}
              value={paymentMethod === 'DUE' ? '0.00' : displayedPaidAmount}
              onChange={(e) => {
                setPaidAmount(e.target.value);
                setPaymentEdited(true);
              }}
            />
          </label>
          <fieldset>
            <legend className="field-label">Payment type</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['CASH', 'ONLINE', 'DUE'] as const).map((method) => (
                <label
                  key={method}
                  className={`grid min-h-12 cursor-pointer place-items-center rounded-xl border font-bold ${paymentMethod === method ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-stone-300'}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    checked={paymentMethod === method}
                    onChange={() => {
                      if (method === paymentMethod) return;
                      if (method === 'DUE') {
                        paymentBeforeDue.current = { amount: paidAmount, edited: paymentEdited };
                      } else if (paymentMethod === 'DUE') {
                        setPaidAmount(paymentBeforeDue.current.amount);
                        setPaymentEdited(paymentBeforeDue.current.edited);
                      }
                      setPaymentMethod(method);
                      if (method === 'DUE') {
                        setPaidAmount('0.00');
                        setPaymentEdited(true);
                      }
                    }}
                  />
                  {method === 'CASH' ? 'Cash' : method === 'ONLINE' ? 'Online' : 'Due'}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field-label">
            Service date
            <input
              className="field mt-2"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </label>
          <label className="field-label sm:col-span-2">
            Notes (optional)
            <textarea
              className="field mt-2 min-h-24 py-3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {message && (
            <p
              role="alert"
              className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {message}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button" onClick={close}>
              Cancel
            </button>
            <button className="primary-button" disabled={state.isLoading}>
              {state.isLoading ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export const GradingPage = () => {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const [status, setStatus] = useState<'active' | 'cancelled' | 'all'>('active');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useGetGradingEntriesQuery({
    ...(deferred ? { search: deferred } : {}),
    status,
    page,
  });
  const [cancel] = useCancelGradingEntryMutation();
  const cancelEntry = async (id: string) => {
    const reason = window.prompt('Reason for cancellation');
    if (reason?.trim()) await cancel({ id, reason: reason.trim() });
  };
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Daily services</p>
          <h1 className="mt-1 text-3xl font-bold">Grading & cleaning</h1>
          <p className="mt-2 text-stone-600">
            Record crop quantity, charges, and customer payment.
          </p>
        </div>
        <button className="primary-button" onClick={() => setCreating(true)}>
          + New grading entry
        </button>
      </div>
      <section className="card mt-7">
        <label className="field-label">
          Search
          <input
            className="field mt-2"
            placeholder="Customer, mobile number, or crop"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="mt-4 flex gap-2">
          {(['active', 'cancelled', 'all'] as const).map((item) => (
            <button
              key={item}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${status === item ? 'bg-brand-800 text-white' : 'bg-stone-100 text-stone-600'}`}
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
      <section className="mt-5 grid gap-3">
        {isLoading ? (
          <div className="card">Loading entries…</div>
        ) : isError ? (
          <div className="card">
            <p className="text-red-700">Unable to load entries.</p>
            <button className="secondary-button mt-3" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        ) : !data?.gradingEntries.length ? (
          <div className="card text-center text-stone-600">No grading entries found.</div>
        ) : (
          data.gradingEntries.map((entry) => (
            <article
              className={`card ${entry.status === 'CANCELLED' ? 'opacity-65' : ''}`}
              key={entry.id}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-brand-800">
                      GR-{String(entry.entryNumber).padStart(6, '0')}
                    </p>
                    {entry.status === 'CANCELLED' && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-lg font-bold">{entry.customer.name}</h2>
                  <p className="text-sm text-stone-600">
                    {entry.customer.mobile} · {entry.crop.name} · {entry.quantity}{' '}
                    {entry.unit.symbol} · {entry.serviceDate}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xl font-bold">₹{entry.calculatedAmount}</p>
                  <p className="text-sm text-stone-600">
                    Paid ₹{entry.paidAmount} (
                    {entry.paymentMethod === 'CASH'
                      ? 'Cash'
                      : entry.paymentMethod === 'ONLINE'
                        ? 'Online'
                        : 'Due'}
                    ) · Due ₹{entry.dueAmount}
                  </p>
                  {entry.status === 'ACTIVE' && (
                    <button
                      className="mt-3 text-sm font-semibold text-red-700 hover:underline"
                      onClick={() => void cancelEntry(entry.id)}
                    >
                      Cancel entry
                    </button>
                  )}
                </div>
              </div>
              {entry.cancellationReason && (
                <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  Reason: {entry.cancellationReason}
                </p>
              )}
            </article>
          ))
        )}
      </section>
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-5 flex justify-center gap-3">
          <button
            className="secondary-button"
            disabled={page === 1}
            onClick={() => setPage((v) => v - 1)}
          >
            Previous
          </button>
          <span className="self-center text-sm font-semibold">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((v) => v + 1)}
          >
            Next
          </button>
        </div>
      )}
      {creating && <EntryForm close={() => setCreating(false)} />}
    </div>
  );
};
