import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetCurrentUserQuery } from '@/services/api/auth-api';
import { useGetCustomersQuery } from '@/services/api/customer-api';
import { useGetGradingEntriesQuery } from '@/services/api/grading-api';
import { useGetSeedBillsQuery } from '@/services/api/seed-billing-api';
import { useGetStaffListQuery } from '@/services/api/staff-api';
import { useGetOverviewReportQuery } from '@/services/api/report-api';
import { TablePagination } from './table/TablePagination';

type DatePreset = 'today' | 'month' | 'year' | 'custom';

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DashboardPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const today = localDate();
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const { data: user } = useGetCurrentUserQuery();
  const { data: staff } = useGetStaffListQuery({ status: 'active', page: 1 });
  const { data: customers } = useGetCustomersQuery({ status: 'active', page: 1 });
  const { data: entries } = useGetGradingEntriesQuery({ status: 'active', page, pageSize });
  const { data: seedEntries } = useGetSeedBillsQuery({ status: 'active', page: 1, pageSize: 10 });
  const isReportRangeValid = Boolean(reportFrom && reportTo && reportFrom <= reportTo);
  const {
    data: report,
    isLoading: isReportLoading,
    isError: isReportError,
  } = useGetOverviewReportQuery({ from: reportFrom, to: reportTo }, { skip: !isReportRangeValid });

  const selectDatePreset = (preset: Exclude<DatePreset, 'custom'>) => {
    const current = new Date();
    const end = localDate(current);
    const start =
      preset === 'today'
        ? end
        : preset === 'month'
          ? localDate(new Date(current.getFullYear(), current.getMonth(), 1))
          : localDate(new Date(current.getFullYear(), 0, 1));
    setDatePreset(preset);
    setReportFrom(start);
    setReportTo(end);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-700">Admin dashboard</p>
      <h1 className="mt-1 text-2xl font-bold">Welcome, {user?.name}</h1>
      <section className="card mt-6 p-4 sm:p-5" aria-label="Dashboard date filter">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field-label min-w-44">
            Payment and due period
            <select
              className="compact-field mt-1"
              value={datePreset}
              onChange={(event) => {
                const preset = event.target.value as DatePreset;
                if (preset === 'custom') setDatePreset('custom');
                else selectDatePreset(preset);
              }}
            >
              <option value="today">Today</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="custom">Custom date</option>
            </select>
          </label>
          {datePreset === 'custom' && (
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
              <label className="field-label">
                From
                <input
                  className="compact-field mt-1"
                  type="date"
                  value={reportFrom}
                  onChange={(event) => setReportFrom(event.target.value)}
                />
              </label>
              <label className="field-label">
                To
                <input
                  className="compact-field mt-1"
                  type="date"
                  value={reportTo}
                  onChange={(event) => setReportTo(event.target.value)}
                />
              </label>
            </div>
          )}
          <p className="ml-auto text-sm font-semibold text-stone-600">
            {reportFrom === reportTo ? reportFrom : `${reportFrom} to ${reportTo}`}
          </p>
        </div>
        {!isReportRangeValid && (
          <p className="mt-3 text-sm font-semibold text-red-700">
            Select a valid date range with the end date on or after the start date.
          </p>
        )}
      </section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          className="card block transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/staff"
        >
          <p className="card-label">Active staff</p>
          <p className="mt-3 text-3xl font-bold">{staff?.pagination.total ?? '—'}</p>
        </Link>
        <Link
          className="card block transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/customers"
        >
          <p className="card-label">Active customers</p>
          <p className="mt-3 text-3xl font-bold">{customers?.pagination.total ?? '—'}</p>
        </Link>
        <Link
          className="card block transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/entries?tab=grading"
        >
          <p className="card-label">Active grading entries</p>
          <p className="mt-3 text-3xl font-bold">{entries?.pagination.total ?? '—'}</p>
        </Link>
        <Link
          className="card block transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/entries?tab=seeds"
        >
          <p className="card-label">Active seed entries</p>
          <p className="mt-3 text-3xl font-bold">{seedEntries?.pagination.total ?? '—'}</p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/entries?tab=grading"
        >
          <p className="card-label">Grading payments</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-emerald-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.grading.paid ?? '0.00'}`}
          </p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/entries?tab=seeds"
        >
          <p className="card-label">Seed payments</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-emerald-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.seeds.paid ?? '0.00'}`}
          </p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/entries?tab=grading"
        >
          <p className="card-label">Grading dues</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-red-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.grading.due ?? '0.00'}`}
          </p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/entries?tab=seeds"
        >
          <p className="card-label">Seed dues</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-red-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.seeds.due ?? '0.00'}`}
          </p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/expenses?area=GRADING"
        >
          <p className="card-label">Grading expenses</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-amber-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.expenses.grading.amount ?? '0.00'}`}
          </p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          to="/admin/expenses?area=SEEDS"
        >
          <p className="card-label">Seed expenses</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-amber-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.expenses.seeds.amount ?? '0.00'}`}
          </p>
        </Link>
        <Link
          className="card min-w-0 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md sm:col-span-2"
          to="/admin/expenses?area=ADMIN_PERSONAL"
        >
          <p className="card-label">Admin personal expenses</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-amber-700 sm:text-3xl">
            {isReportLoading
              ? '—'
              : isReportError
                ? 'Unavailable'
                : `₹${report?.expenses.adminPersonal.amount ?? '0.00'}`}
          </p>
        </Link>
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
