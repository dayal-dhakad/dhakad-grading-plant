import { useDeferredValue, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReviseSeedBillSchema, type SeedBill } from '@dhakad/shared';
import { MoneyInput } from '@/components/form/MoneyInput';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import { useGetSeedProductsQuery } from '@/services/api/seed-management-api';
import { useGetSeedBillQuery, useGetSeedBillingConfigQuery, useReviseSeedBillMutation } from '@/services/api/seed-billing-api';
import { PaymentAccountField } from '../payments/PaymentAccountField';

type Line = {
  productId: string;
  quantity: string;
  unit: 'GRAM' | 'KILOGRAM' | 'QUINTAL';
  ratePerKg: string;
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: string;
};
const blank = (): Line => ({
  productId: '',
  quantity: '',
  unit: 'KILOGRAM',
  ratePerKg: '',
  discountType: 'NONE',
  discountValue: '0',
});
const initialLines = (bill: SeedBill): Line[] =>
  bill.items.map((item) => ({
    productId: item.product.id,
    quantity: item.enteredQuantity,
    unit: item.enteredUnit,
    ratePerKg: item.ratePerKg,
    discountType: item.discountType,
    discountValue: item.discountValue,
  }));

const EditForm = ({ bill }: { bill: SeedBill }) => {
  const { data: billingConfig } = useGetSeedBillingConfigQuery();
  const gstRate = Number(billingConfig?.gstRate ?? 5);
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState(bill.customer.id);
  const [customerLabel, setCustomerLabel] = useState(
    `${bill.customer.name} · ${bill.customer.mobile}`,
  );
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const { data: customers, isFetching: isSearching } = useGetCustomersQuery(
    { ...(deferred ? { search: deferred } : {}), status: 'active', page: 1, pageSize: 8 },
    { skip: deferred.length < 3 },
  );
  const { data: catalog } = useGetSeedProductsQuery({ status: 'active', page: 1, pageSize: 50 });
  const [lines, setLines] = useState<Line[]>(initialLines(bill));
  const [paidAmount, setPaidAmount] = useState(bill.paidAmount);
  const paymentBeforeDue = useRef<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(bill.paymentMethod);
  const [paymentAccountId, setPaymentAccountId] = useState(bill.paymentAccount?.id ?? '');
  const [waiveSmallBalance, setWaiveSmallBalance] = useState(Number(bill.waivedAmount) > 0);
  const [serviceDate, setServiceDate] = useState(bill.serviceDate);
  const [notes, setNotes] = useState(bill.notes ?? '');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [revise, state] = useReviseSeedBillMutation();
  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const approximateSubtotal = lines.reduce((total, line) => {
    const kg =
      Number(line.quantity || 0) *
      (line.unit === 'GRAM' ? 0.001 : line.unit === 'QUINTAL' ? 100 : 1);
    const gross = kg * Number(line.ratePerKg || 0);
    const discount =
      line.discountType === 'NONE'
        ? 0
        : line.discountType === 'PERCENTAGE'
          ? (gross * Number(line.discountValue || 0)) / 100
          : Number(line.discountValue || 0);
    return total + Math.max(0, gross - discount);
  }, 0);
  const approximateGst = (approximateSubtotal * gstRate) / 100;
  const approximateTotal = approximateSubtotal + approximateGst;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const parsed = ReviseSeedBillSchema.safeParse({
      customerId,
      items: lines,
      paidAmount,
      paymentMethod,
      paymentAccountId: paymentMethod === 'ONLINE' ? paymentAccountId : null,
      waiveSmallBalance,
      serviceDate,
      notes: notes || undefined,
      reason,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the bill details');
      return;
    }
    try {
      await revise({
        id: bill.id,
        input: parsed.data,
        previousCustomerId: bill.customer.id,
      }).unwrap();
      void navigate('/staff/entries');
    } catch {
      setMessage('Unable to revise this bill. Check stock, amounts, and account details.');
    }
  };
  return (
    <form className="card mt-4 space-y-5" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
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
                    type="button"
                    className="block w-full border-b px-3 py-2.5 text-left text-sm hover:bg-brand-50"
                    key={customer.id}
                    onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerLabel(`${customer.name} · ${customer.mobile}`);
                      setSearch('');
                    }}
                  >
                    {customer.mobile} · {customer.name}
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
          <p className="card-label">Selected customer</p>
          <p className="mt-1 font-bold">{customerLabel}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Seed items</h2>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setLines((current) => [...current, blank()])}
            disabled={lines.length >= 50}
          >
            + Add seed
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {lines.map((line, index) => (
            <div className="rounded-lg border p-3" key={index}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="field-label">
                  Seed *
                  <select
                    className="compact-field mt-1"
                    value={line.productId}
                    onChange={(event) => {
                      const product = catalog?.products.find(
                        (item) => item.id === event.target.value,
                      );
                      updateLine(index, {
                        productId: event.target.value,
                        ...(product ? { ratePerKg: product.sellingRatePerKg } : {}),
                      });
                    }}
                  >
                    <option value="">Select seed</option>
                    {!catalog?.products.some((item) => item.id === line.productId) &&
                      line.productId && (
                        <option value={line.productId}>
                          {bill.items.find((item) => item.product.id === line.productId)?.product
                            .name ?? 'Current seed'}{' '}
                          (inactive)
                        </option>
                      )}
                    {catalog?.products.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Quantity *
                  <input
                    className="compact-field mt-1"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  />
                </label>
                <label className="field-label">
                  Unit *
                  <select
                    className="compact-field mt-1"
                    value={line.unit}
                    onChange={(event) =>
                      updateLine(index, { unit: event.target.value as Line['unit'] })
                    }
                  >
                    <option value="GRAM">Gram</option>
                    <option value="KILOGRAM">Kilogram</option>
                    <option value="QUINTAL">Quintal</option>
                  </select>
                </label>
                <label className="field-label">
                  Rate / kg *
                  <MoneyInput
                    className="compact-field mt-1"
                    inputMode="decimal"
                    value={line.ratePerKg}
                    onChange={(event) => updateLine(index, { ratePerKg: event.target.value })}
                  />
                </label>
                <label className="field-label">
                  Discount type
                  <select
                    className="compact-field mt-1"
                    value={line.discountType}
                    onChange={(event) =>
                      updateLine(index, {
                        discountType: event.target.value as Line['discountType'],
                        discountValue: '0',
                      })
                    }
                  >
                    <option value="NONE">None</option>
                    <option value="FIXED">Fixed amount</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </select>
                </label>
                <label className="field-label">
                  Discount value
                  <MoneyInput
                    className="compact-field mt-1"
                    inputMode="decimal"
                    value={line.discountValue}
                    onChange={(event) => updateLine(index, { discountValue: event.target.value })}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="text-sm font-bold text-red-700"
                    disabled={lines.length === 1}
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove line
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="card-label">Estimated bill total</p>
          <p className="mt-1 text-2xl font-bold">₹{approximateTotal.toFixed(2)}</p>
          <p className="text-xs text-stone-500">Subtotal ₹{approximateSubtotal.toFixed(2)} · GST ({gstRate}%) ₹{approximateGst.toFixed(2)}</p>
        </div>
        <label className="field-label">
          Service date *
          <input
            className="compact-field mt-1"
            type="date"
            value={serviceDate}
            onChange={(event) => setServiceDate(event.target.value)}
          />
        </label>
        <label className="field-label">
          Amount paid *
          <MoneyInput
            className="compact-field mt-1 disabled:cursor-not-allowed disabled:bg-stone-100"
            inputMode="decimal"
            disabled={paymentMethod === 'DUE'}
            value={paymentMethod === 'DUE' ? '0.00' : paidAmount}
            onChange={(event) => {
              setPaidAmount(event.target.value);
              setWaiveSmallBalance(false);
            }}
          />
        </label>
        <fieldset>
          <legend className="field-label">Payment mode *</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(['CASH', 'ONLINE', 'DUE'] as const).map((mode) => (
              <label
                className={`grid min-h-10 cursor-pointer place-items-center rounded-lg border text-sm font-bold transition ${paymentMethod === mode ? 'border-brand-800 bg-brand-800 text-white shadow-sm ring-2 ring-brand-200' : 'border-stone-300 bg-white text-stone-700 hover:border-brand-400 hover:bg-brand-50'}`}
                key={mode}
              >
                <input
                  className="sr-only"
                  type="radio"
                  checked={paymentMethod === mode}
                  onChange={() => {
                    if (mode === paymentMethod) return;
                    if (mode === 'DUE') {
                      paymentBeforeDue.current = paidAmount;
                    } else if (paymentMethod === 'DUE') {
                      setPaidAmount(paymentBeforeDue.current ?? approximateTotal.toFixed(2));
                    }
                    setPaymentMethod(mode);
                    if (mode === 'DUE') {
                      setPaidAmount('0');
                      setPaymentAccountId('');
                    }
                  }}
                />
                {mode === 'CASH' ? 'Cash' : mode === 'ONLINE' ? 'Online' : 'Due'}
              </label>
            ))}
          </div>
        </fieldset>
        {paymentMethod === 'ONLINE' && (
          <PaymentAccountField
            value={paymentAccountId}
            onChange={setPaymentAccountId}
            amount={paidAmount}
            reference={`SEED-${String(bill.billNumber).padStart(6, '0')}`}
          />
        )}
        <label className="field-label">
          Notes (optional)
          <textarea
            className="compact-field mt-1"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input
            type="checkbox"
            checked={waiveSmallBalance}
            onChange={(event) => setWaiveSmallBalance(event.target.checked)}
          />
          Waive the remaining bill balance
        </label>
        <label className="field-label sm:col-span-2">
          Reason for editing *
          <input
            className="compact-field mt-1"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain what is being corrected"
          />
        </label>
      </div>
      {message && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
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

export const EditSeedBillPage = () => {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useGetSeedBillQuery(id);
  if (isLoading) return <div className="card">Loading seed bill…</div>;
  if (isError || !data || data.status !== 'ACTIVE')
    return <div className="card text-red-700">This bill is not available for editing.</div>;
  return (
    <div className="w-full">
      <Link className="text-sm font-semibold text-brand-800 hover:underline" to="/staff/entries">
        ← Back to my entries
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="card-label">Seed bill</p>
          <h1 className="text-2xl font-bold">
            Edit SEED-{String(data.billNumber).padStart(6, '0')}
          </h1>
        </div>
        <p className="text-xs text-stone-500">Changes and reason are saved permanently.</p>
      </div>
      <EditForm bill={data} />
    </div>
  );
};
