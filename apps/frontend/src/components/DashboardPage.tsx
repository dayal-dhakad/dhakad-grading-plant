import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetCurrentUserQuery } from '@/services/api/auth-api';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import { useGetGradingEntriesQuery } from '@/services/api/grading-api';
import { useGetSeedBillsQuery } from '@/services/api/seed-billing-api';
import { useGetStaffListQuery } from '@/services/api/staff-api';
import { useGetOverviewReportQuery } from '@/services/api/report-api';
import { TablePagination } from './table/TablePagination';

export const DashboardPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: user } = useGetCurrentUserQuery();
  const { data: staff } = useGetStaffListQuery({ status: 'active', page: 1 });
  const { data: customers } = useGetCustomersQuery({ status: 'active', page: 1 });
  const { data: entries } = useGetGradingEntriesQuery({ status: 'active', page, pageSize });
  const { data: seedEntries } = useGetSeedBillsQuery({ status: 'active', page: 1, pageSize: 10 });
  const reportDate = new Date().toISOString().slice(0, 10);
  const {
    data: report,
    isLoading: isReportLoading,
    isError: isReportError,
  } = useGetOverviewReportQuery({ from: reportDate, to: reportDate });
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-700">Admin dashboard</p>
      <h1 className="mt-1 text-3xl font-bold">Welcome, {user?.name}</h1>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card">
          <p className="card-label">Active staff</p>
          <p className="mt-3 text-3xl font-bold">{staff?.pagination.total ?? '—'}</p>
        </article>
        <article className="card">
          <p className="card-label">Active customers</p>
          <p className="mt-3 text-3xl font-bold">{customers?.pagination.total ?? '—'}</p>
        </article>
        <article className="card">
          <p className="card-label">Active grading entries</p>
          <p className="mt-3 text-3xl font-bold">{entries?.pagination.total ?? '—'}</p>
        </article>
        <article className="card">
          <p className="card-label">Active seed entries</p>
          <p className="mt-3 text-3xl font-bold">{seedEntries?.pagination.total ?? '—'}</p>
        </article>
        <article className="card min-w-0 sm:col-span-2 xl:col-span-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div>
              <p className="card-label">Total customer dues</p>
              <p className="mt-1 text-xs text-stone-500">
                Current balance from the full customer ledger
              </p>
            </div>
            <p className="min-w-0 max-w-full text-2xl font-bold tabular-nums text-red-700 [overflow-wrap:anywhere] sm:text-3xl">
              {isReportLoading
                ? '—'
                : isReportError
                  ? 'Unavailable'
                  : `₹${report?.dues.total ?? '0.00'}`}
            </p>
          </div>
        </article>
      </section>
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent grading entries</h2>
          <Link className="font-semibold text-brand-800 hover:underline" to="/admin/entries">
            View all
          </Link>
        </div>
        <div className="table-panel mt-3">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th className="p-4">Entry</th>
                <th className="p-4">Staff</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Paid / Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries?.gradingEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="table-id">GR-{String(entry.entryNumber).padStart(6, '0')}</td>
                  <td className="p-4">{entry.createdBy.name}</td>
                  <td className="table-primary">
                    <Link className="hover:underline" to={`/customers/${entry.customer.id}`}>
                      {entry.customer.name}
                    </Link>
                  </td>
                  <td className="table-money">₹{entry.calculatedAmount}</td>
                  <td className="p-4">
                    <span className="font-semibold text-emerald-700">₹{entry.paidAmount}</span>
                    {' / '}
                    <span className="table-due">₹{entry.dueAmount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={entries?.pagination.total ?? 0}
            totalPages={entries?.pagination.totalPages ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </div>
      </section>
    </div>
  );
};
