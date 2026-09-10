import { useDeferredValue, useMemo, useState, type FormEvent } from 'react';
import {
  CreateCustomerSchema,
  CreateSeedBillSchema,
  type CreateSeedBillInput,
  type Customer,
} from '@dhakad/shared';
import {
  useCreateCustomerMutation,
  useGetCustomerGradingDueQuery,
  useGetCustomersQuery,
} from '@/services/api/customer-api';
import { MobileNumberInput } from '@/components/form/MobileNumberInput';
import { useGetSeedProductsQuery } from '@/services/api/seed-management-api';
import { useCreateSeedBillMutation } from '@/services/api/seed-billing-api';

type Unit = 'GRAM' | 'KILOGRAM' | 'QUINTAL';
type Discount = 'NONE' | 'FIXED' | 'PERCENTAGE';
type Line = {
  productId: string;
  quantity: string;
  unit: Unit;
  ratePerKg: string;
  discountType: Discount;
  discountValue: string;
};

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
const money = (value: number | string) => Number(value || 0).toFixed(2);
const blank = (): Line => ({
  productId: '',
  quantity: '',
  unit: 'KILOGRAM',
  ratePerKg: '0',
  discountType: 'NONE',
  discountValue: '0',
});
const lineTotals = (line: Line) => {
  const multiplier = line.unit === 'GRAM' ? 0.001 : line.unit === 'QUINTAL' ? 100 : 1;
  const gross = (Number(line.quantity) || 0) * multiplier * (Number(line.ratePerKg) || 0);
  const discount =
    line.discountType === 'NONE'
      ? 0
      : line.discountType === 'PERCENTAGE'
        ? (gross * (Number(line.discountValue) || 0)) / 100
        : Number(line.discountValue) || 0;
  return { gross, discount, net: Math.max(0, gross - discount) };
};

export const SeedSalePage = () => {
  const [mobile, setMobile] = useState('');
  const search = useDeferredValue(mobile.trim());
  const [customer, setCustomer] = useState<Customer>();
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerVillage, setNewCustomerVillage] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const { data: matches, isFetching: isSearching } = useGetCustomersQuery(
    { ...(search ? { search } : {}), status: 'all', page: 1, pageSize: 8 },
    { skip: search.length < 3 || Boolean(customer) },
  );
  const { data: existingDue } = useGetCustomerGradingDueQuery(customer?.id ?? '', {
    skip: !customer,
  });
  const [createCustomer, customerState] = useCreateCustomerMutation();
  const { data: catalog } = useGetSeedProductsQuery({ status: 'active', page: 1, pageSize: 50 });
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentEdited, setPaymentEdited] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [waiveSmallBalance, setWaiveSmallBalance] = useState(false);
  const [serviceDate, setServiceDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState('');
  const [pendingBill, setPendingBill] = useState<CreateSeedBillInput>();
  const [createBill, billState] = useCreateSeedBillMutation();

  const totals = useMemo(
    () =>
      lines.reduce(
        (sum, line) => {
          const value = lineTotals(line);
          return {
            gross: sum.gross + value.gross,
            discount: sum.discount + value.discount,
            net: sum.net + value.net,
          };
        },
        { gross: 0, discount: 0, net: 0 },
      ),
    [lines],
  );
  const displayedPaid = paymentEdited ? paidAmount : money(totals.net);
  const remaining = Math.max(0, totals.net - Number(displayedPaid || 0));
  const canWaive = remaining > 0 && remaining <= 10;
  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  const chooseCustomer = (value: Customer) => {
    if (!value.isActive) return;
    setCustomer(value);
    setMobile(value.mobile);
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
  const review = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const parsed = CreateSeedBillSchema.safeParse({
      customerId: customer?.id ?? '',
      items: lines,
      paidAmount: displayedPaid,
      paymentMethod,
      waiveSmallBalance,
      serviceDate,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the seed bill details');
      return;
    }
    setPendingBill(parsed.data);
  };
  const confirm = async () => {
    if (!pendingBill) return;
    setMessage('');
    try {
      const bill = await createBill(pendingBill).unwrap();
      setCreated(`SEED-${String(bill.billNumber).padStart(6, '0')} saved successfully`);
      setPendingBill(undefined);
      setLines([blank()]);
      setPaidAmount('');
      setPaymentEdited(false);
      setWaiveSmallBalance(false);
      setNotes('');
    } catch {
      setMessage('Unable to save bill. Check stock, quantities, rates, and discounts.');
    }
  };

  if (pendingBill && customer) {
    return (
      <section className="card mt-4 overflow-hidden p-0">
        <div className="border-b border-stone-200 bg-brand-900 px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-200">
            Receipt preview
          </p>
          <div className="mt-1 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold">Confirm seed bill</h2>
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
              Existing dues: ₹{money(existingDue ?? 0)}
            </p>
          </div>
          <div>
            <p className="card-label">Service date</p>
            <p className="mt-1 font-bold">{serviceDate}</p>
          </div>
          <div>
            <p className="card-label">Payment mode</p>
            <p className="mt-1 font-bold">{paymentMethod === 'CASH' ? 'Cash' : 'Online'}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="card-label">Seed items</p>
            <div className="mt-2 divide-y rounded-lg border">
              {lines.map((line, index) => (
                <div
                  className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto]"
                  key={index}
                >
                  <strong>
                    {catalog?.products.find((item) => item.id === line.productId)?.name}
                  </strong>
                  <span>
                    {line.quantity}{' '}
                    {line.unit === 'GRAM' ? 'g' : line.unit === 'KILOGRAM' ? 'kg' : 'quintal'}
                  </span>
                  <strong className="text-brand-800">₹{money(lineTotals(line).net)}</strong>
                </div>
              ))}
            </div>
          </div>
          {notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="card-label">Notes</p>
              <p className="mt-1 text-sm">{notes}</p>
            </div>
          )}
        </div>
        <div className="grid border-y border-stone-200 bg-stone-50 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4">
            <p className="card-label">Gross amount</p>
            <p className="mt-1 text-xl font-black">₹{money(totals.gross)}</p>
          </div>
          <div className="border-stone-200 p-4 sm:border-x">
            <p className="card-label">Discount</p>
            <p className="mt-1 text-xl font-black text-amber-700">− ₹{money(totals.discount)}</p>
          </div>
          <div className="p-4">
            <p className="card-label">Amount paid</p>
            <p className="mt-1 text-xl font-black text-brand-800">₹{money(displayedPaid)}</p>
          </div>
          <div className="border-stone-200 p-4 lg:border-l">
            <p className="card-label">Due after bill</p>
            <p className="mt-1 text-xl font-black text-red-700">
              ₹{money(Number(existingDue ?? 0) + (waiveSmallBalance ? 0 : remaining))}
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPendingBill(undefined)}
          >
            ← Back and edit
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={billState.isLoading}
            onClick={() => void confirm()}
          >
            {billState.isLoading ? 'Submitting…' : 'Confirm and create bill'}
          </button>
        </div>
        {message && <p className="px-5 pb-5 text-sm font-semibold text-red-700">{message}</p>}
      </section>
    );
  }

  return (
    <form
      className="card mt-4 grid w-full gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:gap-x-6"
      onSubmit={review}
    >
      <div className="relative">
        <MobileNumberInput
          id="seed-customer-mobile"
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
                        <b>{item.mobile}</b>
                        <span className="ml-3">
                          {item.name} · {item.village}
                        </span>
                      </span>
                      <span className="status-badge status-badge-warning">Inactive</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      This customer cannot be selected.
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
            <p className="card-label">Existing dues</p>
            <p className="mt-0.5 text-base font-bold text-red-700">₹{existingDue ?? '0.00'}</p>
          </div>
        </div>
      )}
      {addingCustomer && !customer && (
        <section className="rounded-lg border border-brand-200 bg-brand-50 p-3 sm:col-span-2">
          <div className="flex items-center justify-between border-b border-brand-200 pb-2">
            <p className="text-sm font-bold text-brand-900">New customer</p>
            <b>{mobile}</b>
          </div>
          <div className="mt-2 grid max-w-xl gap-2">
            <label className="field-label">
              Customer name
              <input
                className="compact-field mt-1"
                autoFocus
                value={newCustomerName}
                onChange={(event) => setNewCustomerName(event.target.value)}
              />
            </label>
            <label className="field-label">
              Village name
              <input
                className="compact-field mt-1"
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
              Add and select customer
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
        <>
          <section className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="field-label">Seed items</p>
              <button
                type="button"
                className="secondary-button min-h-9 px-3 py-1.5 text-sm"
                onClick={() => setLines((value) => [...value, blank()])}
              >
                + Add seed
              </button>
            </div>
            <div className="grid gap-2">
              {lines.map((line, index) => {
                const current = lineTotals(line);
                return (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5" key={index}>
                    <div className="grid gap-2 md:grid-cols-[minmax(160px,1.7fr)_minmax(90px,0.8fr)_110px_minmax(100px,0.8fr)_minmax(170px,1.25fr)_90px]">
                      <label className="field-label">
                        Seed
                        <select
                          className="compact-field mt-1"
                          value={line.productId}
                          onChange={(event) => {
                            const product = catalog?.products.find(
                              (item) => item.id === event.target.value,
                            );
                            updateLine(index, {
                              productId: event.target.value,
                              ratePerKg: product?.sellingRatePerKg ?? '0',
                              discountType: product?.discountType ?? 'NONE',
                              discountValue: product?.discountValue ?? '0',
                            });
                            setPaymentEdited(false);
                          }}
                        >
                          <option value="">Select seed</option>
                          {catalog?.products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} · {Number(product.stockGrams) / 1000} kg
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-label">
                        Quantity
                        <input
                          className="compact-field mt-1"
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(event) => {
                            updateLine(index, { quantity: event.target.value });
                            setPaymentEdited(false);
                          }}
                        />
                      </label>
                      <label className="field-label">
                        Unit
                        <select
                          className="compact-field mt-1"
                          value={line.unit}
                          onChange={(event) => {
                            updateLine(index, { unit: event.target.value as Unit });
                            setPaymentEdited(false);
                          }}
                        >
                          <option value="GRAM">Gram</option>
                          <option value="KILOGRAM">Kilogram</option>
                          <option value="QUINTAL">Quintal</option>
                        </select>
                      </label>
                      <label className="field-label">
                        Rate (₹/kg)
                        <input
                          className="compact-field mt-1"
                          inputMode="decimal"
                          value={line.ratePerKg}
                          onChange={(event) => {
                            updateLine(index, { ratePerKg: event.target.value });
                            setPaymentEdited(false);
                          }}
                        />
                      </label>
                      <div>
                        <span className="field-label">Discount</span>
                        <div className="mt-1 flex gap-2">
                          <select
                            className="compact-field w-28"
                            value={line.discountType}
                            onChange={(event) => {
                              updateLine(index, { discountType: event.target.value as Discount });
                              setPaymentEdited(false);
                            }}
                          >
                            <option value="NONE">None</option>
                            <option value="FIXED">₹</option>
                            <option value="PERCENTAGE">%</option>
                          </select>
                          <input
                            className="compact-field min-w-0"
                            inputMode="decimal"
                            disabled={line.discountType === 'NONE'}
                            value={line.discountValue}
                            onChange={(event) => {
                              updateLine(index, { discountValue: event.target.value });
                              setPaymentEdited(false);
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-2 lg:block">
                        <div className="rounded-lg bg-brand-50 px-3 py-2 text-right">
                          <p className="card-label">Line total</p>
                          <p className="font-black text-brand-900">₹{money(current.net)}</p>
                        </div>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            className="mt-1 min-h-0 text-xs font-semibold text-red-700"
                            onClick={() =>
                              setLines((value) =>
                                value.filter((_, lineIndex) => lineIndex !== index),
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <label className="field-label">
            Service date
            <input
              className="compact-field mt-1"
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
            />
          </label>
          <label className="field-label">
            Notes (optional)
            <textarea
              className="compact-field mt-1 h-10 min-h-10 resize-none py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="card-label">Bill amount</p>
            <p className="mt-0.5 text-2xl font-extrabold text-brand-900">₹{money(totals.net)}</p>
            <p className="text-xs text-stone-500">
              Gross ₹{money(totals.gross)} · Discount ₹{money(totals.discount)}
            </p>
          </div>
          <label className="field-label">
            Amount paid
            <span className="mt-1 flex min-h-14 items-center rounded-xl border-2 border-brand-700 bg-brand-50 px-4 shadow-sm">
              <span className="text-xl font-black text-brand-900">₹</span>
              <input
                className="min-w-0 flex-1 bg-transparent px-2 text-xl font-black text-brand-900 outline-none"
                inputMode="decimal"
                value={displayedPaid}
                onChange={(event) => {
                  setPaidAmount(event.target.value);
                  setPaymentEdited(true);
                  setWaiveSmallBalance(false);
                }}
              />
            </span>
          </label>
          {canWaive && (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 sm:col-span-2">
              <input
                type="checkbox"
                checked={waiveSmallBalance}
                onChange={(event) => setWaiveSmallBalance(event.target.checked)}
              />
              Waive the remaining ₹{money(remaining)} and mark this bill settled
            </label>
          )}
          <fieldset>
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
          <div className="flex items-end">
            <button className="primary-button w-full sm:w-auto" disabled={billState.isLoading}>
              Review receipt
            </button>
          </div>
          {message && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{message}</p>}
          {created && (
            <div className="rounded-xl bg-green-50 p-4 font-semibold text-green-800 sm:col-span-2">
              {created}
              <button
                type="button"
                className="ml-3 underline"
                onClick={() => {
                  setCustomer(undefined);
                  setMobile('');
                  setCreated('');
                }}
              >
                Start another customer
              </button>
            </div>
          )}
        </>
      )}
    </form>
  );
};
