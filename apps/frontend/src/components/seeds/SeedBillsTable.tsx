import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCancelSeedBillMutation, useGetSeedBillsQuery } from '@/services/api/seed-billing-api';
import { TablePagination } from '../table/TablePagination';
import { PrintReceiptButton } from '../receipts/PrintReceiptButton';
import { EntryCancellationDialog } from '../entries/EntryCancellationDialog';
import { EntryDateFilters } from '../entries/EntryDateFilters';
import { DeleteIcon, EditIcon, HistoryIcon } from '../table/TableActions';
import { tableIconActionClass } from '../table/table-action-styles';
export const SeedBillsTable = ({
  customerId,
  readOnly = false,
  canEdit = false,
}: {
  customerId?: string;
  readOnly?: boolean;
  canEdit?: boolean;
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, isError } = useGetSeedBillsQuery(
    {
      status: 'all',
      ...(customerId ? { customerId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      page,
      pageSize,
    },
    { skip: Boolean(from && to && from > to) },
  );
  const [billToDelete, setBillToDelete] = useState<{ id: string; label: string }>();
  const [cancel, cancelState] = useCancelSeedBillMutation();
  return (
    <>
      {!readOnly && (
        <section className="card mt-5">
          <EntryDateFilters
            from={from}
            to={to}
            onFromChange={(value) => {
              setFrom(value);
              setPage(1);
            }}
            onToChange={(value) => {
              setTo(value);
              setPage(1);
            }}
          />
        </section>
      )}
      <div className={`table-panel ${readOnly ? 'mt-5' : 'mt-4'}`}>
        <table className="data-table min-w-[1200px]">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Service date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Waived</th>
              <th>Due</th>
              <th>By</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {from && to && from > to ? (
              <tr>
                <td className="p-5 text-red-700" colSpan={11}>
                  Choose a valid service-date range.
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={11}>Loading seed bills…</td>
              </tr>
            ) : isError ? (
              <tr>
                <td className="p-5 text-red-700" colSpan={11}>
                  Seed bills could not be loaded.
                </td>
              </tr>
            ) : !data?.bills.length ? (
              <tr>
                <td className="p-5 text-stone-500" colSpan={11}>
                  No seed bills match these filters.
                </td>
              </tr>
            ) : (
              data?.bills.map((b) => (
                <tr key={b.id}>
                  <td className="table-id">SEED-{String(b.billNumber).padStart(6, '0')}</td>
                  <td className="whitespace-nowrap">
                    <time dateTime={b.serviceDate}>{b.serviceDate}</time>
                    <span className="block text-xs text-stone-500">
                      Recorded {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    </span>
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
                  <td className="table-money">₹{b.waivedAmount}</td>
                  <td className="table-due">₹{b.dueAmount}</td>
                  <td>{b.createdBy.name}</td>
                  <td>
                    <span
                      className={`status-badge ${b.status === 'ACTIVE' ? 'status-badge-positive' : 'status-badge-warning'}`}
                    >
                      {b.status === 'ACTIVE' ? 'Active' : 'Deleted'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-nowrap items-center gap-1.5">
                      <PrintReceiptButton kind="seed" record={b} iconOnly />
                      {canEdit && b.status === 'ACTIVE' && (
                        <Link
                          className={tableIconActionClass('brand')}
                          to={`/staff/seed-bills/${b.id}/edit`}
                          aria-label={`Edit SEED-${String(b.billNumber).padStart(6, '0')}`}
                          title="Edit seed bill"
                        >
                          <EditIcon />
                        </Link>
                      )}
                      {!readOnly && (
                        <Link
                          className={tableIconActionClass('neutral')}
                          to={`${canEdit ? '/staff' : '/admin'}/seed-bills/${b.id}/history`}
                          aria-label={`View history for SEED-${String(b.billNumber).padStart(6, '0')}`}
                          title="View history"
                        >
                          <HistoryIcon />
                        </Link>
                      )}
                      {!readOnly && b.status === 'ACTIVE' && (
                        <button
                          className={tableIconActionClass('danger')}
                          aria-label={`Delete SEED-${String(b.billNumber).padStart(6, '0')}`}
                          title="Delete seed bill"
                          onClick={() =>
                            setBillToDelete({
                              id: b.id,
                              label: `SEED-${String(b.billNumber).padStart(6, '0')}`,
                            })
                          }
                        >
                          <DeleteIcon />
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
        {billToDelete && (
          <EntryCancellationDialog
            entryLabel={billToDelete.label}
            isLoading={cancelState.isLoading}
            onCancel={() => setBillToDelete(undefined)}
            onConfirm={async (reason) => {
              await cancel({ id: billToDelete.id, reason }).unwrap();
              setBillToDelete(undefined);
            }}
          />
        )}
      </div>
    </>
  );
};
