import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetCurrentUserQuery } from '@/services/api/auth-api';
import { useGetCustomerDuesQuery, useGetCustomerQuery } from '@/services/api/customer-api';
import { useGetGradingEntriesQuery } from '@/services/api/grading-api';
import { CustomerPaymentsPanel } from '@/components/payments/CustomerPaymentsPanel';
import { CustomerNotificationsPanel } from '@/components/notifications/CustomerNotificationsPanel';
import { SeedBillsTable } from '@/components/seeds/SeedBillsTable';
import { TablePagination } from '@/components/table/TablePagination';
import { PrintReceiptButton } from '@/components/receipts/PrintReceiptButton';

export const CustomerDetailPage = () => {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { data: user } = useGetCurrentUserQuery();
  const [transactionType, setTransactionType] = useState<'grading' | 'seeds'>('grading');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: customer, isLoading, isError } = useGetCustomerQuery(id);
  const { data: dues, isLoading: isDuesLoading } = useGetCustomerDuesQuery(id, { skip: !id });
  const { data: grading, isLoading: isGradingLoading } = useGetGradingEntriesQuery(
    { customerId: id, status: 'all', page, pageSize },
    { skip: !id },
  );
  if (isLoading) return <div className="card">Loading customer…</div>;
  if (isError || !customer)
    return <div className="card text-red-700">Customer could not be loaded.</div>;
  return (
    <div className="mx-auto max-w-6xl">
      <button
        className="font-semibold text-brand-800 hover:underline"
        onClick={() => void navigate(-1)}
      >
        ← Back
      </button>
      <section className="card mt-5">
        <p className="card-label">Customer</p>
        <h1 className="mt-2 text-3xl font-bold">{customer.name}</h1>
        <p className="mt-2 font-semibold text-brand-800">{customer.mobile}</p>
        <p className="mt-1 text-stone-600">
          {customer.village}
          {customer.address ? ` · ${customer.address}` : ''}
        </p>
        <div className="mt-5 grid gap-3 border-t border-stone-200 pt-5 sm:grid-cols-3">
          {[
            { label: 'Total dues', value: dues?.totalDue, tone: 'text-red-700 bg-red-50' },
            {
              label: 'Grading dues',
              value: dues?.gradingDue,
              tone: 'text-amber-800 bg-amber-50',
            },
            { label: 'Seed dues', value: dues?.seedDue, tone: 'text-brand-800 bg-brand-50' },
          ].map((item) => (
            <div className={`rounded-xl p-4 ${item.tone}`} key={item.label}>
              <p className="text-xs font-bold uppercase tracking-wide opacity-75">{item.label}</p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {isDuesLoading ? 'Loading…' : `₹${item.value ?? '0.00'}`}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-bold">All transactions</h2>
        <div className="mt-3 flex gap-2 border-b">
          <button
            className={`px-5 py-3 font-bold ${transactionType === 'grading' ? 'border-b-2 border-brand-700 text-brand-800' : 'text-stone-500'}`}
            onClick={() => {
              setTransactionType('grading');
              setPage(1);
            }}
          >
            Grading
          </button>
          <button
            className={`px-5 py-3 font-bold ${transactionType === 'seeds' ? 'border-b-2 border-brand-700 text-brand-800' : 'text-stone-500'}`}
            onClick={() => setTransactionType('seeds')}
          >
            Seeds
          </button>
        </div>
        {transactionType === 'seeds' ? (
          <SeedBillsTable customerId={customer.id} readOnly />
        ) : (
          <div className="table-panel mt-5">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Crop / quantity</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {isGradingLoading ? (
                  <tr>
                    <td colSpan={8}>Loading grading transactions…</td>
                  </tr>
                ) : !grading?.gradingEntries.length ? (
                  <tr>
                    <td colSpan={8}>No grading transactions yet.</td>
                  </tr>
                ) : (
                  grading.gradingEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="table-id">
                        GR-{String(entry.entryNumber).padStart(6, '0')}
                        <span className="block text-xs text-stone-500">{entry.serviceDate}</span>
                      </td>
                      <td>
                        {entry.crop.name} · {entry.quantity} {entry.unit.symbol}
                      </td>
                      <td>
                        <PrintReceiptButton kind="grading" record={entry} />
                      </td>
                      <td className="table-money">₹{entry.calculatedAmount}</td>
                      <td className="font-semibold text-emerald-700">₹{entry.paidAmount}</td>
                      <td className="table-due">₹{entry.dueAmount}</td>
                      <td>{entry.createdBy.name}</td>
                      <td>
                        <span
                          className={`status-badge ${entry.status === 'ACTIVE' ? 'status-badge-positive' : 'status-badge-warning'}`}
                        >
                          {entry.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={grading?.pagination.total ?? 0}
              totalPages={grading?.pagination.totalPages ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>
      <CustomerPaymentsPanel customerId={customer.id} />
      {user?.role === 'ADMIN' && <CustomerNotificationsPanel customer={customer} />}
    </div>
  );
};
