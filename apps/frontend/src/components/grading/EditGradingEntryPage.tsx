import { useDeferredValue, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReviseGradingEntrySchema, type GradingEntry } from '@dhakad/shared';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import {
  useGetGradingEntryQuery,
  useGetGradingReferencesQuery,
  useReviseGradingEntryMutation,
} from '@/services/api/grading-api';
import { PaymentAccountField } from '../payments/PaymentAccountField';

const displayDecimal = (value: string | number) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1')
    : '';
};

const EditForm = ({ entry }: { entry: GradingEntry }) => {
  const navigate = useNavigate();
  const initialQuantity = Number(entry.quantity);
  const [customerId, setCustomerId] = useState(entry.customer.id);
  const [customerLabel, setCustomerLabel] = useState(
    `${entry.customer.name} · ${entry.customer.mobile}`,
  );
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const { data: customers, isFetching: isSearching } = useGetCustomersQuery(
    { ...(deferred ? { search: deferred } : {}), status: 'active', page: 1, pageSize: 8 },
    { skip: deferred.length < 3 },
  );
  const { data: references } = useGetGradingReferencesQuery();
  const [cropId, setCropId] = useState(entry.crop.id);
  const [quantity, setQuantity] = useState(String(Math.trunc(initialQuantity)));
  const [kilograms, setKilograms] = useState(
    displayDecimal((initialQuantity - Math.trunc(initialQuantity)) * 100),
  );
  const [rate, setRate] = useState(displayDecimal(entry.rate));
  const [paidAmount, setPaidAmount] = useState(displayDecimal(entry.initialPaidAmount));
  const [waiveSmallBalance, setWaiveSmallBalance] = useState(Number(entry.waivedAmount) > 0);
  const [paymentMethod, setPaymentMethod] = useState(entry.paymentMethod);
  const [paymentAccountId, setPaymentAccountId] = useState(entry.paymentAccount?.id ?? '');
  const [serviceDate, setServiceDate] = useState(entry.serviceDate);
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [revise, state] = useReviseGradingEntryMutation();
  const billableQuantity = (Number(quantity) || 0) + (Number(kilograms) || 0) / 100;
  const total = useMemo(
    () => displayDecimal(billableQuantity * (Number(rate) || 0)),
    [billableQuantity, rate],
  );
  const remainder = Math.max(0, Number(total) - Number(paidAmount || 0));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const quantityPattern = /^\d+(\.\d{1,2})?$/;
    if (
      (quantity && !quantityPattern.test(quantity)) ||
      (kilograms && (!quantityPattern.test(kilograms) || Number(kilograms) >= 100)) ||
      billableQuantity <= 0
    ) {
      setMessage('Enter a valid quantity. Kilograms must be less than 100.');
      return;
    }
    const parsed = ReviseGradingEntrySchema.safeParse({
      customerId,
      cropId,
      quantity: billableQuantity.toFixed(2),
      quantityUnit: 'QUINTAL',
      rate,
      paidAmount,
      waiveSmallBalance,
      paymentMethod,
      paymentAccountId: paymentMethod === 'ONLINE' ? paymentAccountId : null,
      serviceDate,
      notes: notes || undefined,
      reason,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the changes');
      return;
    }
    try {
      await revise({ id: entry.id, input: parsed.data }).unwrap();
      void navigate('/staff/entries');
    } catch {
      setMessage('Unable to revise this entry. Check the amounts and try again.');
    }
  };

  return (
    <form
      className="card mt-4 grid w-full gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:gap-x-6"
      onSubmit={(event) => void submit(event)}
    >
      <div className="relative">
        <label className="field-label">
          Customer mobile or name *
          <input
            className="compact-field mt-1"
            placeholder="Search a different customer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {deferred.length >= 3 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl">
            {customers?.customers.length ? (
              customers.customers.map((customer) => (
                <button
                  className="block min-h-0 w-full border-b px-3 py-2.5 text-left text-sm hover:bg-brand-50"
                  type="button"
                  key={customer.id}
                  onClick={() => {
                    setCustomerId(customer.id);
                    setCustomerLabel(`${customer.name} · ${customer.mobile}`);
                    setSearch('');
                  }}
                >
                  <span className="font-bold">{customer.mobile}</span>
                  <span className="ml-3">
                    {customer.name} · {customer.village}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-3 text-sm text-stone-500">
                {isSearching ? 'Searching…' : 'No active customer found'}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Selected customer
        </p>
        <p className="mt-1 text-sm font-bold text-brand-900">{customerLabel}</p>
      </div>

      <label className="field-label order-1">
        Crop *
        <select
          className="compact-field mt-1"
          value={cropId}
          onChange={(event) => {
            const id = event.target.value;
            setCropId(id);
            setRate(
              displayDecimal(references?.crops.find((item) => item.id === id)?.rate ?? entry.rate),
            );
          }}
        >
          {!references?.crops.some((crop) => crop.id === entry.crop.id) && (
            <option value={entry.crop.id}>{entry.crop.name} (disabled)</option>
          )}
          {references?.crops.map((crop) => (
            <option key={crop.id} value={crop.id}>
              {crop.name} · ₹{crop.rate}/{crop.unit.symbol}
            </option>
          ))}
        </select>
      </label>

      <div className="order-2">
        <span className="field-label">Quantity *</span>
        <div className="mt-1 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Quintals</span>
            <input
              className="compact-field pr-14"
              inputMode="decimal"
              placeholder="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs font-bold text-stone-500">
              Quintal
            </span>
          </label>
          <label className="relative w-32">
            <span className="sr-only">Kilograms</span>
            <input
              className="compact-field pr-10"
              inputMode="decimal"
              placeholder="0"
              value={kilograms}
              onChange={(event) => setKilograms(event.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs font-bold text-stone-500">
              kg
            </span>
          </label>
        </div>
        <p className="mt-1 text-[11px] text-stone-500">
          Total: {billableQuantity.toFixed(2)} quintal
        </p>
      </div>

      <label className="field-label order-3">
        Rate (₹/quintal) *
        <input
          className="compact-field mt-1"
          inputMode="decimal"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
        />
      </label>
      <label className="field-label order-4">
        Service date *
        <input
          className="compact-field mt-1"
          type="date"
          value={serviceDate}
          onChange={(event) => setServiceDate(event.target.value)}
        />
      </label>
      <div className="order-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
        <p className="card-label">Calculated amount</p>
        <p className="mt-0.5 text-2xl font-extrabold text-brand-900">₹{total}</p>
      </div>
      <label className="field-label order-7">
        Amount paid *
        <span className="mt-1 flex min-h-14 items-center rounded-xl border-2 border-brand-700 bg-brand-50 px-4 shadow-sm focus-within:ring-2 focus-within:ring-brand-100">
          <span className="text-xl font-black text-brand-900">₹</span>
          <input
            className="min-w-0 flex-1 bg-transparent px-2 text-xl font-black text-brand-900 outline-none"
            inputMode="decimal"
            value={paidAmount}
            onChange={(event) => {
              setPaidAmount(event.target.value);
              setWaiveSmallBalance(false);
            }}
          />
        </span>
      </label>
      <label className="order-8 flex cursor-pointer items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 sm:col-span-2">
        <input
          type="checkbox"
          checked={waiveSmallBalance}
          onChange={(event) => setWaiveSmallBalance(event.target.checked)}
        />
        {remainder > 0
          ? `Waive the remaining ₹${displayDecimal(remainder)} and mark this entry settled`
          : 'Waive any remaining balance'}
      </label>
      <fieldset className="order-8">
        <legend className="field-label">Payment mode *</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(['CASH', 'ONLINE', 'DUE'] as const).map((item) => (
            <label
              className={`grid min-h-10 cursor-pointer place-items-center rounded-lg border text-sm font-bold ${paymentMethod === item ? 'border-brand-700 bg-brand-50 text-brand-800' : ''}`}
              key={item}
            >
              <input
                className="sr-only"
                type="radio"
                checked={paymentMethod === item}
                onChange={() => {
                  setPaymentMethod(item);
                  if (item === 'DUE') {
                    setPaidAmount('0.00');
                    setWaiveSmallBalance(false);
                    setPaymentAccountId('');
                  }
                }}
              />
              {item === 'CASH' ? 'Cash' : item === 'ONLINE' ? 'Online' : 'Due'}
            </label>
          ))}
        </div>
      </fieldset>
      {paymentMethod === 'ONLINE' && (
        <div className="order-8">
          <PaymentAccountField
            value={paymentAccountId}
            onChange={setPaymentAccountId}
            amount={paidAmount}
            reference={`GR-${String(entry.entryNumber).padStart(6, '0')}`}
          />
        </div>
      )}
      <label className="field-label order-8">
        Notes (optional)
        <textarea
          className="compact-field mt-1 h-10 min-h-10 resize-none py-2"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <label className="field-label order-9 sm:col-span-2">
        Reason for editing *
        <input
          className="compact-field mt-1"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain what is being corrected"
        />
      </label>
      {message && (
        <p
          className="order-10 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2"
          role="alert"
        >
          {message}
        </p>
      )}
      <div className="order-11 flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
        <Link className="secondary-button" to="/staff/entries">
          Cancel
        </Link>
        <button className="primary-button" disabled={state.isLoading}>
          {state.isLoading ? 'Saving…' : 'Save revision'}
        </button>
      </div>
    </form>
  );
};

export const EditGradingEntryPage = () => {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useGetGradingEntryQuery(id);
  if (isLoading) return <div className="card">Loading entry…</div>;
  if (isError || !data)
    return <div className="card text-red-700">This entry is not available for editing.</div>;
  return (
    <div className="w-full">
      <Link to="/staff/entries" className="text-sm font-semibold text-brand-800 hover:underline">
        ← Back to my entries
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Grading entry</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit GR-{String(data.entryNumber).padStart(6, '0')}
          </h1>
        </div>
        <p className="text-xs text-stone-500">Changes and reason are saved permanently.</p>
      </div>
      <EditForm entry={data} />
    </div>
  );
};
