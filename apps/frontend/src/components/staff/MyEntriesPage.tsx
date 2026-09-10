import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetGradingEntriesQuery } from '@/services/api/grading-api';
import { TablePagination } from '../table/TablePagination';
import { SeedBillsTable } from '../seeds/SeedBillsTable';
export const MyEntriesPage = () => {
  const [tab, setTab] = useState<'grading' | 'seeds'>('grading');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useGetGradingEntriesQuery({ status: 'all', page, pageSize });
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold text-brand-700">Your work</p>
      <h1 className="mt-1 text-3xl font-bold">My entries</h1>
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
          Seeds
        </button>
      </div>
      {tab === 'seeds' ? (
        <SeedBillsTable />
      ) : (
        <div className="table-panel mt-5">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4">Entry</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Crop / Qty.</th>
                <th className="p-4">Total</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Due</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-5" colSpan={8}>
                    Loading entries…
                  </td>
                </tr>
              ) : (
                data?.gradingEntries.map((entry) => (
                  <tr className="border-t" key={entry.id}>
                    <td className="table-id">GR-{String(entry.entryNumber).padStart(6, '0')}</td>
                    <td className="table-primary">
                      {entry.customer.name}
                      <span className="block text-xs text-stone-500">{entry.serviceDate}</span>
                    </td>
                    <td className="p-4">
                      {entry.crop.name} · {entry.quantity} {entry.unit.symbol}
                    </td>
                    <td className="table-money">₹{entry.calculatedAmount}</td>
                    <td className="whitespace-nowrap font-semibold text-emerald-700">
                      ₹{entry.paidAmount}
                    </td>
                    <td className="table-due">₹{entry.dueAmount}</td>
                    <td className="p-4">{entry.paymentMethod === 'CASH' ? 'Cash' : 'Online'}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        {entry.status === 'ACTIVE' && (
                          <Link
                            className="font-semibold text-brand-800 hover:underline"
                            to={`/staff/entries/${entry.id}/edit`}
                          >
                            Edit
                          </Link>
                        )}
                        <Link
                          className="font-semibold text-stone-600 hover:underline"
                          to={`/staff/entries/${entry.id}/history`}
                        >
                          History
                        </Link>
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
      )}
    </div>
  );
};
