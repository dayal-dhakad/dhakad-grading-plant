import { useDeferredValue, useState } from 'react';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import { useGetPaymentsQuery, useReversePaymentMutation } from '@/services/api/payment-api';
import { CustomerPaymentsPanel } from './CustomerPaymentsPanel';
import { TablePagination } from '../table/TablePagination';
export const PaymentsPage = ({ admin = false }: { admin?: boolean }) => {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const [customerId, setCustomerId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: customers } = useGetCustomersQuery(
    { ...(deferred ? { search: deferred } : {}), status: 'active', page: 1, pageSize: 8 },
    { skip: deferred.length < 3 || Boolean(customerId) },
  );
  const { data: payments, isLoading } = useGetPaymentsQuery({
    status: 'all',
    page,
    pageSize,
  });
  const [reverse] = useReversePaymentMutation();
  const reverseOne = (id: string, customer: string) => {
    const reason = window.prompt('Reason for reversing this payment');
    if (reason?.trim()) void reverse({ id, customerId: customer, reason: reason.trim() });
  };
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold text-brand-700">Customer dues</p>
      <h1 className="mt-1 text-3xl font-bold">Payments</h1>
      <section className="card mt-6">
        <label className="field-label">
          Find customer by mobile number or name
          <input
            className="field mt-2"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCustomerId('');
            }}
            placeholder="Type at least 3 characters"
          />
        </label>
        {!customerId && deferred.length >= 3 && (
          <div className="mt-2 overflow-hidden rounded-xl border">
            {customers?.customers.map((customer) => (
              <button
                type="button"
                className="block w-full border-b p-3 text-left hover:bg-brand-50"
                key={customer.id}
                onClick={() => {
                  setCustomerId(customer.id);
                  setSearch(`${customer.name} · ${customer.mobile}`);
                }}
              >
                {customer.name} · {customer.mobile} · {customer.village}
              </button>
            ))}
          </div>
        )}
      </section>
      {customerId && <CustomerPaymentsPanel customerId={customerId} />}
      <h2 className="mt-7 text-xl font-bold">
        {admin ? 'All payments' : 'Payments recorded by you'}
      </h2>
      <div className="table-panel mt-3">
        <table className="data-table min-w-[850px]">
          <thead>
            <tr>
              <th className="p-4">Receipt</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Mode</th>
              <th className="p-4">Recorded by</th>
              <th className="p-4">Status</th>
              {admin && <th className="p-4">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td className="p-5" colSpan={admin ? 7 : 6}>
                  Loading payments…
                </td>
              </tr>
            ) : (
              payments?.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="table-id">
                    RCPT-{String(payment.receiptNumber).padStart(6, '0')}
                    <span className="block text-xs text-stone-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="table-primary">
                    {payment.customer.name}
                    <span className="block text-xs">{payment.customer.mobile}</span>
                  </td>
                  <td className="table-money text-emerald-700">₹{payment.amount}</td>
                  <td className="p-4">{payment.paymentMethod === 'CASH' ? 'Cash' : 'Online'}</td>
                  <td className="p-4">{payment.recordedBy.name}</td>
                  <td className="p-4">
                    <span
                      className={`status-badge ${payment.status === 'ACTIVE' ? 'status-badge-positive' : 'status-badge-warning'}`}
                    >
                      {payment.status === 'ACTIVE' ? 'Active' : 'Reversed'}
                    </span>
                  </td>
                  {admin && (
                    <td className="p-4">
                      {payment.status === 'ACTIVE' && (
                        <button
                          className="font-semibold text-red-700 hover:underline"
                          onClick={() => reverseOne(payment.id, payment.customer.id)}
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={payments?.pagination.total ?? 0}
          totalPages={payments?.pagination.totalPages ?? 0}
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
