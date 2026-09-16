import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCancelGradingEntryMutation,
  useGetGradingEntriesQuery,
} from '@/services/api/grading-api';
import { EntryCancellationDialog } from '../entries/EntryCancellationDialog';
import { EntryDateFilters } from '../entries/EntryDateFilters';
import { DeleteIcon, EditIcon, HistoryIcon } from '../table/TableActions';
import { tableIconActionClass } from '../table/table-action-styles';
import { TablePagination } from '../table/TablePagination';
import { SeedBillsTable } from '../seeds/SeedBillsTable';
import { PrintReceiptButton } from '../receipts/PrintReceiptButton';
export const MyEntriesPage = () => {
  const [tab, setTab] = useState<'grading' | 'seeds'>('grading');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; label: string }>();
  const [cancelEntry, cancelState] = useCancelGradingEntryMutation();
  const { data, isLoading, isError } = useGetGradingEntriesQuery(
    { status: 'all', ...(from ? { from } : {}), ...(to ? { to } : {}), page, pageSize },
    { skip: Boolean(from && to && from > to) },
  );
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold text-brand-700">Your work</p>
      <h1 className="mt-1 text-3xl font-bold">My entries</h1>
      <div
        className="mt-5 inline-flex gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1"
        role="group"
        aria-label="Entry type"
      >
        <button
          type="button"
          aria-pressed={tab === 'grading'}
          className={`min-w-20 rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${tab === 'grading' ? 'bg-brand-700 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'}`}
          onClick={() => setTab('grading')}
        >
          Grading
        </button>
        <button
          type="button"
          aria-pressed={tab === 'seeds'}
          className={`min-w-20 rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${tab === 'seeds' ? 'bg-brand-700 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'}`}
          onClick={() => setTab('seeds')}
        >
          Seeds
        </button>
      </div>
      {tab === 'seeds' ? (
        <SeedBillsTable canEdit />
      ) : (
        <>
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
          <div className="table-panel mt-4">
            <table className="data-table min-w-[1240px]">
              <thead>
                <tr>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Service date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Crop / Qty.</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Waived</th>
                  <th className="p-4">Due</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
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
                    <td className="p-5" colSpan={11}>
                      Loading entries…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td className="p-5 text-red-700" colSpan={11}>
                      Entries could not be loaded.
                    </td>
                  </tr>
                ) : !data?.gradingEntries.length ? (
                  <tr>
                    <td className="p-5 text-stone-500" colSpan={11}>
                      No entries match these filters.
                    </td>
                  </tr>
                ) : (
                  data?.gradingEntries.map((entry) => (
                    <tr className="border-t" key={entry.id}>
                      <td className="table-id">GR-{String(entry.entryNumber).padStart(6, '0')}</td>
                      <td className="whitespace-nowrap p-4">
                        <time dateTime={entry.serviceDate}>{entry.serviceDate}</time>
                        <span className="block text-xs text-stone-500">
                          Recorded {new Date(entry.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="table-primary">
                        <Link className="hover:underline" to={`/customers/${entry.customer.id}`}>
                          {entry.customer.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        {entry.crop.name} · {entry.quantity} {entry.unit.symbol}
                      </td>
                      <td className="table-money">₹{entry.calculatedAmount}</td>
                      <td className="whitespace-nowrap font-semibold text-emerald-700">
                        ₹{entry.paidAmount}
                      </td>
                      <td className="table-money">₹{entry.waivedAmount}</td>
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
                          <PrintReceiptButton kind="grading" record={entry} iconOnly />
                          {entry.status === 'ACTIVE' && (
                            <Link
                              className={tableIconActionClass('brand')}
                              to={`/staff/entries/${entry.id}/edit`}
                              aria-label={`Edit GR-${String(entry.entryNumber).padStart(6, '0')}`}
                              title="Edit entry"
                            >
                              <EditIcon />
                            </Link>
                          )}
                          <Link
                            className={tableIconActionClass('neutral')}
                            to={`/staff/entries/${entry.id}/history`}
                            aria-label={`View history for GR-${String(entry.entryNumber).padStart(6, '0')}`}
                            title="View history"
                          >
                            <HistoryIcon />
                          </Link>
                          {entry.status === 'ACTIVE' && (
                            <button
                              className={tableIconActionClass('danger')}
                              aria-label={`Delete GR-${String(entry.entryNumber).padStart(6, '0')}`}
                              title="Delete entry"
                              onClick={() =>
                                setEntryToDelete({
                                  id: entry.id,
                                  label: `GR-${String(entry.entryNumber).padStart(6, '0')}`,
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
