import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CreateCustomerSchema,
  CreateGradingEntrySchema,
  type CreateGradingEntryInput,
  type Customer,
} from '@dhakad/shared';
import {
  useCreateCustomerMutation,
  useGetCustomerGradingDueQuery,
  useGetCustomersQuery,
} from '@/services/api/customer-api';
import { MobileNumberInput } from '@/components/form/MobileNumberInput';
import {
  useCreateGradingEntryMutation,
  useGetGradingReferencesQuery,
} from '@/services/api/grading-api';
import { SeedSalePage } from '../seeds/SeedSalePage';

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
const displayDecimal = (value: string | number) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1')
    : '';
};
const useDebounced = (value: string) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced;
};

export const StaffEntryPage = () => {
  const [tab, setTab] = useState<'grading' | 'seeds'>('grading');
  const [mobile, setMobile] = useState('');
  const search = useDebounced(mobile.trim());
  const [customer, setCustomer] = useState<Customer>();
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerVillage, setNewCustomerVillage] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const { data: matches, isFetching: isSearching } = useGetCustomersQuery(
    { ...(search ? { search } : {}), status: 'all', page: 1, pageSize: 8 },
    { skip: search.length < 3 || Boolean(customer) },
  );
  const { data: totalDue } = useGetCustomerGradingDueQuery(customer?.id ?? '', { skip: !customer });
  const { data: references } = useGetGradingReferencesQuery();
  const [cropId, setCropId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [kilograms, setKilograms] = useState('');
  const [rate, setRate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentEdited, setPaymentEdited] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [waiveSmallBalance, setWaiveSmallBalance] = useState(false);
  const [serviceDate, setServiceDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState('');
  const [pendingEntry, setPendingEntry] = useState<CreateGradingEntryInput>();
  const [create, state] = useCreateGradingEntryMutation();
  const [createCustomer, customerState] = useCreateCustomerMutation();
  const billableQuantity = (Number(quantity) || 0) + (Number(kilograms) || 0) / 100;
  const total = useMemo(
    () => displayDecimal(billableQuantity * (Number(rate) || 0)),
    [billableQuantity, rate],
  );
  const displayedPaid = paymentEdited ? paidAmount : total;
  const remainingAmount = Math.max(0, Number(total) - Number(displayedPaid || 0));
  const canWaiveSmallBalance = remainingAmount > 0 && remainingAmount <= 10;
  const chooseCustomer = (item: Customer) => {
    if (!item.isActive) return;
    setCustomer(item);
    setMobile(item.mobile);
    setAddingCustomer(false);
    setCustomerMessage('');
  };
  const addCustomer = async () => {
    setCustomerMessage('');
    const parsed = CreateCustomerSchema.safeParse({
      mobile,
      name: newCustomerName,
      village: newCustomerVillage,
    });
    if (!parsed.success) {
      setCustomerMessage(parsed.error.issues[0]?.message ?? 'Check the customer details');
      return;
    }
    try {
      chooseCustomer(await createCustomer(parsed.data).unwrap());
      setNewCustomerName('');
      setNewCustomerVillage('');
    } catch {
      setCustomerMessage('Unable to add customer. Check the details and try again.');
    }
  };
  const reset = () => {
    setCustomer(undefined);
    setMobile('');
    setCropId('');
    setQuantity('');
    setKilograms('');
    setRate('');
    setPaidAmount('');
    setPaymentEdited(false);
    setWaiveSmallBalance(false);
    setNotes('');
    setCreated('');
    setPendingEntry(undefined);
  };
  const submit = (event: FormEvent) => {
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
    const parsed = CreateGradingEntrySchema.safeParse({
      customerId: customer?.id ?? '',
      cropId,
      quantity: billableQuantity.toFixed(2),
      quantityUnit: 'QUINTAL',
      rate,
      paidAmount: displayedPaid,
      waiveSmallBalance,
      paymentMethod,
      serviceDate,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the entry');
      return;
    }
    setPendingEntry(parsed.data);
  };
  const confirmEntry = async () => {
    if (!pendingEntry) return;
    setMessage('');
    try {
      const result = await create(pendingEntry).unwrap();
      setCreated(`GR-${String(result.entryNumber).padStart(6, '0')} saved successfully`);
      setPendingEntry(undefined);
      setCropId('');
      setQuantity('');
      setKilograms('');
      setRate('');
      setPaidAmount('');
      setPaymentEdited(false);
      setWaiveSmallBalance(false);
      setNotes('');
    } catch {
      setMessage('Unable to save entry. Check the details and try again.');
    }
  };
  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold tracking-tight">New entry</h1>
      <div className="mt-4 flex w-fit rounded-lg bg-stone-200 p-1">
        <button
          className={`min-h-9 rounded-md px-6 py-1.5 text-sm font-bold ${tab === 'grading' ? 'bg-brand-900 text-white shadow-sm' : 'text-stone-600'}`}
          type="button"
          onClick={() => setTab('grading')}
        >
          Grading
        </button>
        <button
          className={`min-h-9 rounded-md px-6 py-1.5 text-sm font-bold ${tab === 'seeds' ? 'bg-brand-900 text-white shadow-sm' : 'text-stone-500'}`}
          type="button"
          onClick={() => setTab('seeds')}
        >
          Seeds
        </button>
      </div>
      {tab === 'seeds' ? (
        <SeedSalePage />
      ) : pendingEntry && customer ? (
        <section className="card mt-4 overflow-hidden p-0">
          <div className="border-b border-stone-200 bg-brand-900 px-5 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200">
              Receipt preview
            </p>
            <div className="mt-1 flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold">Confirm grading entry</h2>
              <p className="text-xs text-green-100">Not saved yet</p>
            </div>
          </div>
          <div className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="card-label">Customer</p>
              <p className="mt-1 font-bold">{customer.name}</p>
              <p className="text-sm text-stone-600">
                {customer.mobile} · {customer.village}
              </p>
              <p className="mt-1 text-xs font-semibold text-red-700">
                Existing dues: ₹{displayDecimal(totalDue ?? '0')}
              </p>
            </div>
            <div>
              <p className="card-label">Service date</p>
              <p className="mt-1 font-bold">{serviceDate}</p>
            </div>
            <div>
              <p className="card-label">Crop</p>
              <p className="mt-1 font-bold">
                {references?.crops.find((item) => item.id === cropId)?.name}
              </p>
            </div>
            <div>
              <p className="card-label">Quantity</p>
              <p className="mt-1 font-bold">
                {quantity || '0'} quintal {kilograms || '0'} kg
              </p>
              <p className="text-xs text-stone-500">Total {billableQuantity.toFixed(2)} quintal</p>
            </div>
            <div>
              <p className="card-label">Rate</p>
              <p className="mt-1 font-bold">₹{rate} per quintal</p>
            </div>
            <div>
              <p className="card-label">Payment mode</p>
              <p className="mt-1 font-bold">{paymentMethod === 'CASH' ? 'Cash' : 'Online'}</p>
            </div>
            {notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="card-label">Notes</p>
                <p className="mt-1 text-sm text-stone-700">{notes}</p>
              </div>
            )}
          </div>
          <div className="grid border-y border-stone-200 bg-stone-50 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4">
              <p className="card-label">Calculated amount</p>
              <p className="mt-1 text-xl font-black">₹{total}</p>
            </div>
            <div className="border-stone-200 p-4 sm:border-x">
              <p className="card-label">Amount paid</p>
              <p className="mt-1 text-xl font-black text-brand-800">₹{displayedPaid}</p>
            </div>
            <div className="p-4">
              <p className="card-label">Due on this entry</p>
              <p className="mt-1 text-xl font-black text-red-700">
                ₹{displayDecimal(waiveSmallBalance ? 0 : remainingAmount)}
              </p>
            </div>
            <div className="border-stone-200 p-4 lg:border-l">
              <p className="card-label">Total dues after entry</p>
              <p className="mt-1 text-xl font-black text-red-700">
                ₹{displayDecimal(Number(totalDue ?? 0) + (waiveSmallBalance ? 0 : remainingAmount))}
              </p>
            </div>
          </div>
          {waiveSmallBalance && (
            <p className="border-b border-stone-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">
              ₹{displayDecimal(remainingAmount)} will be recorded as a small-balance waiver.
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPendingEntry(undefined)}
            >
              ← Back and edit
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={state.isLoading}
              onClick={() => void confirmEntry()}
            >
              {state.isLoading ? 'Submitting…' : 'Confirm and create entry'}
            </button>
          </div>
          {message && <p className="px-5 pb-5 text-sm font-semibold text-red-700">{message}</p>}
        </section>
      ) : (
        <form
          className="card mt-4 grid w-full gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:gap-x-6"
          onSubmit={submit}
        >
          <div className="relative">
            <MobileNumberInput
              id="customer-mobile"
              label="Customer mobile number"
              value={mobile}
              onChange={(value) => {
                setMobile(value);
                setCustomer(undefined);
                setAddingCustomer(false);
                setCustomerMessage('');
              }}
              onBlur={() => undefined}
              error={undefined}
              compact
            />
            {!customer && !addingCustomer && search.length >= 3 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl">
                {matches?.customers.length ? (
                  matches.customers.map((item) =>
                    item.isActive ? (
                      <button
                        type="button"
                        className="block min-h-0 w-full border-b px-3 py-2.5 text-left text-sm hover:bg-brand-50"
                        key={item.id}
                        onClick={() => chooseCustomer(item)}
                      >
                        <span className="font-bold">{item.mobile}</span>
                        <span className="ml-3">
                          {item.name} · {item.village}
                        </span>
                      </button>
                    ) : (
                      <div
                        className="border-b border-red-100 bg-red-50 px-3 py-2.5 text-sm"
                        key={item.id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            <span className="font-bold text-stone-800">{item.mobile}</span>
                            <span className="ml-3 text-stone-700">
                              {item.name} · {item.village}
                            </span>
                          </span>
                          <span className="status-badge status-badge-warning shrink-0">
                            Inactive
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          This customer was deactivated by an administrator and cannot be selected.
                        </p>
                      </div>
                    ),
                  )
                ) : isSearching ? (
                  <p className="p-3 text-sm text-stone-500">Searching...</p>
                ) : (
                  <div className="flex items-center justify-between gap-3 p-3">
                    <p className="text-sm text-stone-600">No matching customer</p>
                    {search.length === 10 && (
                      <button
                        type="button"
                        className="min-h-0 text-sm font-bold text-brand-800"
                        onClick={() => setAddingCustomer(true)}
                      >
                        + Add customer
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {addingCustomer && !customer && (
            <section className="rounded-lg border border-brand-200 bg-brand-50 p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-brand-200 pb-2">
                <p className="text-sm font-bold text-brand-900">New customer</p>
                <div className="rounded-md bg-white px-2.5 py-1.5 text-right shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    Mobile
                  </p>
                  <p className="text-sm font-bold text-brand-900">{mobile}</p>
                </div>
              </div>
              <div className="mt-2 grid max-w-xl gap-2">
                <label className="field-label">
                  Customer name
                  <input
                    className="compact-field mt-1"
                    autoFocus
                    placeholder="Enter customer name"
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Village name
                  <input
                    className="compact-field mt-1"
                    placeholder="Enter village name"
                    value={newCustomerVillage}
                    onChange={(event) => setNewCustomerVillage(event.target.value)}
                  />
                </label>
              </div>
              {customerMessage && (
                <p className="mt-2 text-sm font-semibold text-red-700">{customerMessage}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="primary-button min-h-10 px-4 py-2 text-sm"
                  disabled={customerState.isLoading}
                  onClick={() => void addCustomer()}
                >
                  {customerState.isLoading ? 'Adding...' : 'Add and select customer'}
                </button>
                <button
                  type="button"
                  className="secondary-button min-h-10 px-4 py-2 text-sm"
                  onClick={() => setAddingCustomer(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
          {customer && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-brand-900">{customer.name}</p>
                  <p className="mt-0.5 text-xs text-stone-600">
                    {customer.mobile} · {customer.village}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-0 text-xs font-semibold text-brand-800"
                  onClick={() => {
                    setCustomer(undefined);
                    setMobile('');
                  }}
                >
                  Change
                </button>
              </div>
              <div className="mt-2 border-t border-brand-200 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                  Existing dues
                </p>
                <p className="mt-0.5 text-base font-bold text-red-700">₹{totalDue ?? '0.00'}</p>
              </div>
            </div>
          )}
          {customer && (
            <>
              <label className="field-label order-1">
                Crop
                <select
                  className="compact-field mt-1"
                  value={cropId}
                  onChange={(e) => {
                    setCropId(e.target.value);
                    setRate(
                      displayDecimal(
                        references?.crops.find((item) => item.id === e.target.value)?.rate ?? '',
                      ),
                    );
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
              <div className="order-2">
                <span className="field-label">Quantity</span>
                <div className="mt-1 flex gap-2">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Quintals</span>
                    <input
                      className="compact-field pr-14"
                      inputMode="decimal"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        setPaymentEdited(false);
                      }}
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
                      onChange={(e) => {
                        setKilograms(e.target.value);
                        setPaymentEdited(false);
                      }}
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
                Rate (₹/quintal)
                <input
                  className="compact-field mt-1"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => {
                    setRate(e.target.value);
                    setPaymentEdited(false);
                  }}
                />
              </label>
              <div className="order-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
                <p className="card-label">Calculated amount</p>
                <p className="mt-0.5 text-2xl font-extrabold text-brand-900">₹{total}</p>
              </div>
              <label className="field-label order-7">
                Amount paid
                <span className="mt-1 flex min-h-14 items-center rounded-xl border-2 border-brand-700 bg-brand-50 px-4 shadow-sm focus-within:ring-2 focus-within:ring-brand-100">
                  <span className="text-xl font-black text-brand-900">₹</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-2 text-xl font-black text-brand-900 outline-none"
                    inputMode="decimal"
                    value={displayedPaid}
                    onChange={(e) => {
                      setPaidAmount(e.target.value);
                      setPaymentEdited(true);
                      setWaiveSmallBalance(false);
                    }}
                  />
                </span>
              </label>
              {canWaiveSmallBalance && (
                <label className="order-8 flex cursor-pointer items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={waiveSmallBalance}
                    onChange={(event) => setWaiveSmallBalance(event.target.checked)}
                  />
                  Waive the remaining ₹{displayDecimal(remainingAmount)} and mark this entry settled
                </label>
              )}
              <fieldset className="order-8">
                <legend className="field-label">Payment mode</legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(['CASH', 'ONLINE'] as const).map((item) => (
                    <label
                      className={`grid min-h-10 cursor-pointer place-items-center rounded-lg border text-sm font-bold ${paymentMethod === item ? 'border-brand-700 bg-brand-50 text-brand-800' : ''}`}
                      key={item}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        checked={paymentMethod === item}
                        onChange={() => setPaymentMethod(item)}
                      />
                      {item === 'CASH' ? 'Cash' : 'Online'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field-label order-4">
                Service date
                <input
                  className="compact-field mt-1"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </label>
              <label className="field-label order-8">
                Notes (optional)
                <textarea
                  className="compact-field mt-1 h-10 min-h-10 resize-none py-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              {message && (
                <p className="order-9 text-sm font-semibold text-red-700 sm:col-span-2">
                  {message}
                </p>
              )}
              {created && (
                <div className="order-9 rounded-xl bg-green-50 p-4 font-semibold text-green-800 sm:col-span-2">
                  {created}
                  <button type="button" className="ml-3 underline" onClick={reset}>
                    Start another customer
                  </button>
                </div>
              )}
              <button
                className="primary-button order-10 sm:col-span-2 sm:justify-self-start"
                disabled={state.isLoading}
              >
                Review receipt
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
};
