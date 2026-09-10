import { useDeferredValue, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReviseGradingEntrySchema, type GradingEntry } from '@dhakad/shared';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import {
  useGetGradingEntryQuery,
  useGetGradingReferencesQuery,
  useReviseGradingEntryMutation,
} from '@/services/api/grading-api';

const EditForm = ({ entry }: { entry: GradingEntry }) => {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState(entry.customer.id);
  const [customerLabel, setCustomerLabel] = useState(
    `${entry.customer.name} · ${entry.customer.mobile}`,
  );
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const { data: customers } = useGetCustomersQuery(
    { ...(deferred ? { search: deferred } : {}), status: 'active', page: 1, pageSize: 8 },
    { skip: deferred.length < 3 },
  );
  const { data: references } = useGetGradingReferencesQuery();
  const [cropId, setCropId] = useState(entry.crop.id);
  const [quantity, setQuantity] = useState(entry.quantity);
  const [paidAmount, setPaidAmount] = useState(entry.initialPaidAmount);
  const [waiveSmallBalance, setWaiveSmallBalance] = useState(Number(entry.waivedAmount) > 0);
  const [paymentMethod, setPaymentMethod] = useState(entry.paymentMethod);
  const [serviceDate, setServiceDate] = useState(entry.serviceDate);
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [revise, state] = useReviseGradingEntryMutation();
  const selectedCrop = references?.crops.find((crop) => crop.id === cropId);
  const rate = cropId === entry.crop.id ? Number(entry.rate) : Number(selectedCrop?.rate ?? 0);
  const total = useMemo(() => ((Number(quantity) || 0) * rate).toFixed(2), [quantity, rate]);
  const remainder = Number(total) - Number(paidAmount || 0);
  const canWaiveSmallBalance = remainder > 0 && remainder <= 10;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = ReviseGradingEntrySchema.safeParse({
      customerId,
      cropId,
      quantity,
      paidAmount,
      waiveSmallBalance,
      paymentMethod,
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
    <form className="card mt-5 grid gap-5 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
      <div className="sm:col-span-2">
        <p className="card-label">Selected customer</p>
        <p className="mt-1 font-bold">{customerLabel}</p>
        <input
          className="field mt-3"
          placeholder="Search a different mobile or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {deferred.length >= 3 && (
          <div className="mt-1 overflow-hidden rounded-xl border">
            {customers?.customers.map((customer) => (
              <button
                className="block w-full border-b p-3 text-left hover:bg-brand-50"
                type="button"
                key={customer.id}
                onClick={() => {
                  setCustomerId(customer.id);
                  setCustomerLabel(`${customer.name} · ${customer.mobile}`);
                  setSearch('');
                }}
              >
                {customer.name} · {customer.mobile} · {customer.village}
              </button>
            ))}
          </div>
        )}
      </div>
      <label className="field-label">
        Crop
        <select className="field mt-2" value={cropId} onChange={(e) => setCropId(e.target.value)}>
          {!references?.crops.some((crop) => crop.id === entry.crop.id) && (
            <option value={entry.crop.id}>{entry.crop.name} (disabled)</option>
          )}
          {references?.crops.map((crop) => (
            <option key={crop.id} value={crop.id}>
              {crop.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Quantity
        <input
          className="field mt-2"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      <div className="rounded-xl bg-stone-100 p-4">
        <p className="card-label">Recalculated total</p>
        <p className="mt-1 text-2xl font-bold">₹{total}</p>
      </div>
      <label className="field-label">
        Amount paid
        <input
          className="field mt-2"
          value={paidAmount}
          onChange={(e) => {
            setPaidAmount(e.target.value);
            setWaiveSmallBalance(false);
          }}
        />
      </label>
      {canWaiveSmallBalance && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 sm:col-span-2">
          <input
            type="checkbox"
            checked={waiveSmallBalance}
            onChange={(event) => setWaiveSmallBalance(event.target.checked)}
          />
          Waive the remaining ₹{remainder.toFixed(2)} and mark this entry settled
        </label>
      )}
      <label className="field-label">
        Payment mode
        <select
          className="field mt-2"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'ONLINE')}
        >
          <option value="CASH">Cash</option>
          <option value="ONLINE">Online</option>
        </select>
      </label>
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
        Notes
        <input className="field mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label className="field-label sm:col-span-2">
        Reason for editing
        <input
          className="field mt-2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required — explain what is being corrected"
        />
      </label>
      {message && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{message}</p>}
      <div className="flex gap-3 sm:col-span-2 sm:justify-end">
        <Link className="secondary-button" to="/staff/entries">
          Cancel
        </Link>
        <button className="primary-button" disabled={state.isLoading}>
          Save revision
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
    <div className="mx-auto max-w-4xl">
      <Link to="/staff/entries" className="font-semibold text-brand-800 hover:underline">
        ← Back to my entries
      </Link>
      <h1 className="mt-4 text-3xl font-bold">
        Edit GR-{String(data.entryNumber).padStart(6, '0')}
      </h1>
      <p className="mt-2 text-stone-600">
        Your reason and the before/after values will be saved permanently.
      </p>
      <EditForm entry={data} />
    </div>
  );
};
