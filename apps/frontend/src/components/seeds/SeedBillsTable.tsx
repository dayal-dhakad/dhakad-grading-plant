import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCancelSeedBillMutation, useGetSeedBillsQuery } from '@/services/api/seed-billing-api';
import { TablePagination } from '../table/TablePagination';
import { PrintReceiptButton } from '../receipts/PrintReceiptButton';
export const SeedBillsTable = ({
  customerId,
  readOnly = false,
}: {
  customerId?: string;
  readOnly?: boolean;
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useGetSeedBillsQuery({
    status: 'all',
    ...(customerId ? { customerId } : {}),
    page,
    pageSize,
  });
  const [cancel] = useCancelSeedBillMutation();
  const cancelOne = (id: string) => {
    const reason = window.prompt('Reason for cancelling this seed bill');
    if (reason?.trim()) void cancel({ id, reason: reason.trim() });
  };
  return (
    <div className="table-panel mt-5">
      <table className="data-table min-w-[900px]">
        <thead>
          <tr>
            <th>Bill</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Due</th>
            <th>By</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={9}>Loading seed bills…</td>
            </tr>
          ) : (
            data?.bills.map((b) => (
              <tr key={b.id}>
                <td className="table-id">
                  SEED-{String(b.billNumber).padStart(6, '0')}
                  <span className="block text-xs text-stone-500">{b.serviceDate}</span>
                </td>
                <td className="table-primary">
                  <Link className="hover:underline" to={`/customers/${b.customer.id}`}>
                    {b.customer.name}
                  </Link>
                  <span className="block text-xs text-stone-500">{b.customer.mobile}</span>
                </td>
                <td>{b.items.map((i) => i.product.name).join(', ')}</td>
                <td className="table-money">₹{b.netAmount}</td>
                <td className="font-bold text-emerald-700">
                  ₹{b.paidAmount}
                  {b.paymentAccount && (
                    <span className="block text-xs font-normal text-stone-500">
                      Online · {b.paymentAccount.name}
                    </span>
                  )}
                </td>
                <td className="table-due">₹{b.dueAmount}</td>
                <td>{b.createdBy.name}</td>
                <td>
                  <span
                    className={`status-badge ${b.status === 'ACTIVE' ? 'status-badge-positive' : 'status-badge-warning'}`}
                  >
                    {b.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-3">
                    <PrintReceiptButton kind="seed" record={b} />
                    {!readOnly && b.status === 'ACTIVE' && (
                      <button
                        className="font-semibold text-red-700 hover:underline"
                        onClick={() => cancelOne(b.id)}
                      >
                        Cancel
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
        total={data?.pagination.total ?? 0}
        totalPages={data?.pagination.totalPages ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(v) => {
          setPageSize(v);
          setPage(1);
        }}
      />
    </div>
  );
};
