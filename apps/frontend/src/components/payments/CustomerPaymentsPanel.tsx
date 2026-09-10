import { useState, type FormEvent } from 'react';
import { useCreatePaymentMutation, useGetCustomerLedgerQuery } from '@/services/api/payment-api';
import { TablePagination } from '../table/TablePagination';
export const CustomerPaymentsPanel = ({ customerId }: { customerId: string }) => {
  const { data: ledger } = useGetCustomerLedgerQuery(customerId);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [waiveSmallBalance, setWaiveSmallBalance] = useState(false);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [create, state] = useCreatePaymentMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      const payment = await create({
        customerId,
        amount,
        paymentMethod,
        waiveSmallBalance,
      }).unwrap();
      setAmount('');
      setWaiveSmallBalance(false);
      setMessage(
        `Receipt RCPT-${String(payment.receiptNumber).padStart(6, '0')} recorded${Number(payment.waivedAmount) > 0 ? `; ₹${payment.waivedAmount} waived` : ''}`,
      );
    } catch {
      setMessage('Unable to record payment. Amount cannot exceed the current due.');
    }
  };
  const remainder = Number(ledger?.balance ?? 0) - Number(amount || 0);
  const canWaiveSmallBalance = remainder > 0 && remainder <= 10;
  return (
    <section className="card mt-5">
      <div>
        <p className="card-label">Current ledger balance</p>
        <p className="mt-1 text-3xl font-bold text-red-700">₹{ledger?.balance ?? '0.00'}</p>
      </div>
      <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={(event) => void submit(event)}>
        <label className="field-label">
          Payment amount
          <input
            className="field mt-2"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setWaiveSmallBalance(false);
            }}
          />
        </label>
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
        <button className="primary-button self-end" disabled={state.isLoading}>
          Receive payment
        </button>
        {canWaiveSmallBalance && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 sm:col-span-3">
            <input
              type="checkbox"
              checked={waiveSmallBalance}
              onChange={(event) => setWaiveSmallBalance(event.target.checked)}
            />
            Waive the remaining ₹{remainder.toFixed(2)} and clear this customer&apos;s dues
          </label>
        )}
        {message && (
          <p
            className={`text-sm font-semibold sm:col-span-3 ${message.startsWith('Receipt') ? 'text-green-700' : 'text-red-700'}`}
          >
            {message}
          </p>
        )}
      </form>
      <h3 className="mt-7 font-bold">Ledger history</h3>
      <div className="table-panel mt-2">
        <table className="data-table min-w-[620px]">
          <thead>
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2">Amount</th>
              <th className="p-2">By</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ledger?.entries.slice((page - 1) * pageSize, page * pageSize).map((entry) => (
              <tr key={entry.id}>
                <td className="p-2">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="p-2">{entry.description}</td>
                <td
                  className={`p-2 font-semibold ${Number(entry.amount) < 0 ? 'text-green-700' : 'text-red-700'}`}
                >
                  {Number(entry.amount) < 0 ? '-' : '+'}₹{Math.abs(Number(entry.amount)).toFixed(2)}
                </td>
                <td className="p-2">{entry.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={ledger?.entries.length ?? 0}
          totalPages={Math.ceil((ledger?.entries.length ?? 0) / pageSize)}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>
    </section>
  );
};
