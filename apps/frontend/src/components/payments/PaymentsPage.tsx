import { useDeferredValue, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import { useGetPaymentsQuery, useReversePaymentMutation } from '@/services/api/payment-api';
import { CustomerPaymentsPanel } from './CustomerPaymentsPanel';
import { TablePagination } from '../table/TablePagination';
import { PrintReceiptButton } from '../receipts/PrintReceiptButton';
import { PaymentReversalDialog } from './PaymentReversalDialog';
import { ReverseIcon } from '../table/TableActions';
import { tableActionClass } from '../table/table-action-styles';
export const PaymentsPage = ({ admin = false }: { admin?: boolean }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRecorder = searchParams.get('recordedBy');
  const [recordedBy, setRecordedBy] = useState<'all' | 'admin' | 'staff'>(
    admin && (initialRecorder === 'admin' || initialRecorder === 'staff') ? initialRecorder : 'all',
  );
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
    ...(admin ? { recordedBy } : {}),
    page,
    pageSize,
  });
  const [paymentToReverse, setPaymentToReverse] = useState<{
    id: string;
    customerId: string;
    receiptLabel: string;
    amount: string;
  }>();
  const [reverse, reverseState] = useReversePaymentMutation();
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
      <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">
          {admin ? 'Recorded payments' : 'Payments recorded by you'}
        </h2>
        {!admin && (
          <p className="rounded-xl bg-brand-50 px-4 py-3 font-bold text-brand-900">
            Total payment recorded: ₹{payments?.totalAmount ?? '0.00'}
          </p>
        )}
        {admin && (
          <label className="field-label min-w-48">
            Recorded by
            <select
              className="compact-field mt-1"
              value={recordedBy}
              onChange={(event) => {
                const value = event.target.value as 'all' | 'admin' | 'staff';
                setRecordedBy(value);
                setPage(1);
                setSearchParams(value === 'all' ? {} : { recordedBy: value });
              }}
            >
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        )}
      </div>
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
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td className="p-5" colSpan={7}>
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
                    <Link className="hover:underline" to={`/customers/${payment.customer.id}`}>
                      {payment.customer.name}
                    </Link>
                    <span className="block text-xs">{payment.customer.mobile}</span>
                  </td>
                  <td className="table-money text-emerald-700">₹{payment.amount}</td>
                  <td className="p-4">
                    {payment.paymentMethod === 'CASH' ? 'Cash' : 'Online'}
                    {payment.paymentAccount && (
                      <span className="block text-xs text-stone-500">
                        {payment.paymentAccount.name}
                      </span>
                    )}
                  </td>
                  <td className="p-4">{payment.recordedBy.name}</td>
                  <td className="p-4">
                    <span
                      className={`status-badge ${payment.status === 'ACTIVE' ? 'status-badge-positive' : 'status-badge-warning'}`}
                    >
                      {payment.status === 'ACTIVE' ? 'Active' : 'Reversed'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-nowrap items-center gap-1.5">
                      <PrintReceiptButton kind="payment" record={payment} />
                      {payment.status === 'ACTIVE' && (
                        <button
                          className={tableActionClass('danger')}
                          onClick={() =>
                            setPaymentToReverse({
                              id: payment.id,
                              customerId: payment.customer.id,
                              receiptLabel: `RCPT-${String(payment.receiptNumber).padStart(6, '0')}`,
                              amount: payment.amount,
                            })
                          }
                        >
                          <ReverseIcon />
                          Reverse
                        </button>
                      )}
                    </div>
                  </td>
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
      {paymentToReverse && (
        <PaymentReversalDialog
          receiptLabel={paymentToReverse.receiptLabel}
          amount={paymentToReverse.amount}
          isLoading={reverseState.isLoading}
          onCancel={() => setPaymentToReverse(undefined)}
          onConfirm={async (reason) => {
            await reverse({
              id: paymentToReverse.id,
              customerId: paymentToReverse.customerId,
              reason,
            }).unwrap();
            setPaymentToReverse(undefined);
          }}
        />
      )}
    </div>
  );
};
