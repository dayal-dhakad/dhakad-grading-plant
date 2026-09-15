import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCancelGradingEntryMutation,
  useGetGradingEntriesQuery,
} from '@/services/api/grading-api';
import { EntryCancellationDialog } from '../entries/EntryCancellationDialog';
import { DeleteIcon, HistoryIcon } from '../table/TableActions';
import { tableActionClass } from '../table/table-action-styles';
import { TablePagination } from '../table/TablePagination';
import { SeedBillsTable } from '../seeds/SeedBillsTable';
import { PrintReceiptButton } from '../receipts/PrintReceiptButton';
export const AdminEntriesPage = () => {
  const [tab, setTab] = useState<'grading' | 'seeds'>('grading');
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; label: string }>();
  const [cancelEntry, cancelState] = useCancelGradingEntryMutation();
  const { data, isLoading } = useGetGradingEntriesQuery({
    ...(deferred ? { search: deferred } : {}),
    status: 'all',
    page,
    pageSize,
  });
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-700">Business activity</p>
      <h1 className="mt-1 text-3xl font-bold">Entries</h1>
      <div className="mt-6 flex gap-2 border-b">
        <button
          className={`px-5 py-3 font-bold ${tab === 'grading' ? 'border-b-2 border-brand-700 text-brand-800' : ''}`}
          onClick={() => setTab('grading')}
        >
          Grading
        </button>
        <button
          className={`px-5 py-3 font-bold ${tab === 'seeds' ? 'border-b-2 border-brand-700' : 'text-stone-500'}`}
          onClick={() => setTab('seeds')}
        >
          Seed Sale
        </button>
      </div>
      {tab === 'seeds' ? (
        <SeedBillsTable />
      ) : (
        <>
          <section className="card mt-5">
            <input
              className="field"
              type="search"
              placeholder="Search customer, mobile, or crop"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </section>
          <div className="table-panel mt-4">
            <table className="data-table min-w-[1180px]">
              <thead>
                <tr>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Staff</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Crop</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Due</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td className="p-5" colSpan={10}>
                      Loading entries…
                    </td>
                  </tr>
                ) : (
                  data?.gradingEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="table-id">
                        GR-{String(entry.entryNumber).padStart(6, '0')}
                        <span className="block text-xs text-stone-500">{entry.serviceDate}</span>
                      </td>
                      <td className="p-4">{entry.createdBy.name}</td>
                      <td className="table-primary">
                        <Link className="hover:underline" to={`/customers/${entry.customer.id}`}>
                          {entry.customer.name}
                        </Link>
                        <span className="block text-xs text-stone-500">
                          {entry.customer.mobile}
                        </span>
                      </td>
                      <td className="p-4">
                        {entry.crop.name}
                        <span className="block text-xs text-stone-500">
                          {entry.quantity} {entry.unit.symbol}
                        </span>
                      </td>
                      <td className="table-money">₹{entry.calculatedAmount}</td>
                      <td className="whitespace-nowrap font-semibold text-emerald-700">
                        ₹{entry.paidAmount}
                      </td>
                      <td className="table-due">₹{entry.dueAmount}</td>
                      <td className="p-4">
                        {entry.paymentMethod === 'CASH'
                          ? 'Cash'
                          : entry.paymentMethod === 'ONLINE'
                            ? 'Online'
                            : 'Due'}
                        {entry.paymentAccount && (
                          <span className="block text-xs text-stone-500">
                            {entry.paymentAccount.name}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`status-badge ${entry.status === 'ACTIVE' ? 'status-badge-positive' : 'status-badge-warning'}`}
                        >
                          {entry.status === 'ACTIVE' ? 'Active' : 'Deleted'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          <PrintReceiptButton kind="grading" record={entry} />
                          <Link
                            className={tableActionClass('neutral')}
                            to={`/admin/entries/${entry.id}/history`}
                          >
                            <HistoryIcon />
                            History
                          </Link>
                          {entry.status === 'ACTIVE' && (
                            <button
                              className={tableActionClass('danger')}
                              onClick={() =>
                                setEntryToDelete({
                                  id: entry.id,
                                  label: `GR-${String(entry.entryNumber).padStart(6, '0')}`,
                                })
                              }
                            >
                              <DeleteIcon />
                              Delete
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
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        </>
      )}
      {entryToDelete && (
        <EntryCancellationDialog
          entryLabel={entryToDelete.label}
          isLoading={cancelState.isLoading}
          onCancel={() => setEntryToDelete(undefined)}
          onConfirm={async (reason) => {
            await cancelEntry({ id: entryToDelete.id, reason }).unwrap();
            setEntryToDelete(undefined);
          }}
        />
      )}
    </div>
  );
};
