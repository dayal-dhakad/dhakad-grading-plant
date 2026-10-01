import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportResponse } from '@dhakad/shared';
import { useGetOverviewReportQuery } from '@/services/api/report-api';

type DatePreset = 'today' | 'month' | 'year' | 'custom';
const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const rupees = (value: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value));
const quantity = (value: string) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Number(value));
const sumMoney = (...values: string[]) =>
  values.reduce((total, value) => total + Number(value), 0).toFixed(2);
const downloadCsv = (report: ReportResponse) => {
  const rows: (string | number)[][] = [
    ['Dhakad Grading Plant report', `${report.period.from} to ${report.period.to}`],
    ['Metric', 'Value'],
    ['Grading entries', report.grading.count],
    ['Grading quantity (quintals)', report.grading.quantityQuintals],
    ['Grading charges', report.grading.amount],
    ['Grading expenses', report.expenses.grading.amount],
    ['Admin personal expenses', report.expenses.adminPersonal.amount],
    ['Estimated grading margin', report.expenses.gradingMargin],
    ['Grading paid', report.grading.paid],
    ['Standalone customer payments', report.payments.standalone.amount],
    ['Grading waived', report.grading.waived],
    ['Standalone payment waived', report.payments.standaloneWaived],
    ['Current customer dues', report.dues.total],
    [],
    ['Expenses by category'],
    ['Category', 'Entries', 'Amount'],
    ...report.expenses.categories.map((row) => [row.label, row.count, row.amount]),
    [],
    ['Payments needing mode review'],
    ['Record', 'Amount'],
    ...report.payments.unclassifiedRecords.filter((row) => row.kind !== 'seed').map((row) => [
      `${row.kind === 'grading' ? 'GR' : 'RCPT'}-${String(row.number).padStart(6, '0')}`,
      row.amount,
    ]),
    [],
    ['Customer dues'],
    ['Name', 'Mobile', 'Village', 'Amount'],
    ...report.dues.customers.map((row) => [row.name, row.mobile, row.village, row.amount]),
    [],
    ['Payment accounts'],
    ['Account', 'Transactions', 'Amount'],
    ...report.paymentAccounts.map((row) => [row.name, row.transactionCount, row.amount]),
    [],
    ['Staff activity'],
    ['Staff', 'Grading', 'Payments'],
    ...report.staffActivity.map((row) => [
      row.name,
      row.gradingCount,
      row.paymentCount,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `dhakad-report-${report.period.from}-${report.period.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
export const ReportsPage = () => {
  const current = new Date();
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [from, setFrom] = useState(
    localDate(new Date(current.getFullYear(), current.getMonth(), 1)),
  );
  const [to, setTo] = useState(localDate(current));
  const { data, isLoading, isError } = useGetOverviewReportQuery(
    { from, to },
    { skip: !from || !to || from > to },
  );
  const selectDatePreset = (preset: Exclude<DatePreset, 'custom'>) => {
    const date = new Date();
    const end = localDate(date);
    const start =
      preset === 'today'
        ? end
        : preset === 'month'
          ? localDate(new Date(date.getFullYear(), date.getMonth(), 1))
          : localDate(new Date(date.getFullYear(), 0, 1));
    setDatePreset(preset);
    setFrom(start);
    setTo(end);
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="card-label">Business intelligence</p>
          <h1 className="mt-1 text-3xl font-bold">Reports</h1>
        </div>
        {data && (
          <button className="secondary-button" onClick={() => downloadCsv(data)}>
            Export CSV
          </button>
        )}
      </header>
      <section className="card p-4 sm:p-5" aria-label="Report date filter">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field-label min-w-44">
            Report period
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
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label className="field-label">
                To
                <input
                  className="compact-field mt-1"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </div>
          )}
          <p className="ml-auto text-sm font-semibold text-stone-600">
            {from === to ? from : `${from} to ${to}`}
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Entry totals use inclusive service dates. Standalone payments use their recorded date.
          Current dues are live, all-time balances.
        </p>
      </section>
      {from > to && (
        <div className="card text-red-700">End date must be on or after start date.</div>
      )}
      {isLoading && <div className="card">Calculating report…</div>}
      {isError && <div className="card text-red-700">Report could not be loaded.</div>}
      {data && <ReportBody report={data} />}
    </div>
  );
};
const ReportBody = ({ report: r }: { report: ReportResponse }) => (
  <>
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <Metric
        label="Grading charges"
        value={rupees(r.grading.amount)}
        note={`${r.grading.count} entries · ${quantity(r.grading.quantityQuintals)} q`}
      />
      {false && <Metric
        label="Seed sales, after discount"
        value={rupees(r.seeds.net)}
        note={`${r.seeds.count} bills · ${quantity(r.seeds.quantityKg)} kg`}
      />}
      {false && <Metric
        label="Total billed"
        value={rupees(r.totalBilled)}
        note="Grading charges + seed sales after discount"
      />}
      <Metric
        label="Total waived"
        value={rupees(sumMoney(r.grading.waived, r.payments.standaloneWaived))}
        note="Grading and customer payments"
      />
      <Metric
        label="Total collected"
        value={rupees(sumMoney(r.grading.paid, r.payments.standalone.amount))}
        note="Grading and standalone customer payments"
      />
      {false && <Metric
        label="Total expenses"
        value={rupees(r.expenses.total)}
        note={`${r.expenses.count} expense entries`}
      />}
      <Metric
        label="Grading expenses"
        value={rupees(r.expenses.grading.amount)}
        note={`${r.expenses.grading.count} expense entries`}
      />
      {false && <Metric
        label="Seed expenses"
        value={rupees(r.expenses.seeds.amount)}
        note={`${r.expenses.seeds.count} expense entries`}
      />}
      <Metric
        label="Admin personal expenses"
        value={rupees(r.expenses.adminPersonal.amount)}
        note={`${r.expenses.adminPersonal.count} expense entries`}
      />
      <Metric
        label="Estimated grading margin"
        value={rupees(r.expenses.gradingMargin)}
        note="Grading charges minus grading expenses for the selected dates"
      />
      {false && <Metric
        label="Estimated seed margin"
        value={rupees(r.expenses.seedMargin)}
        note="Seed sales minus seed expenses for the selected dates"
      />}
      <Metric
        label="Current dues · all time"
        value={rupees(r.dues.total)}
        note={`${r.dues.customers.length} customers with a positive balance`}
        danger
      />
    </section>
    <section className="grid gap-4 xl:grid-cols-2">
      <SummaryCard
        title="Collections by source"
        rows={[
          ['Grading payments', r.grading.paid],
          [
            `Standalone customer payments (${r.payments.standalone.count})`,
            r.payments.standalone.amount,
          ],
        ]}
        total={sumMoney(r.grading.paid, r.payments.standalone.amount)}
      />
      {false && <SummaryCard
        title="Collections by payment mode"
        rows={[
          ['Cash', r.payments.cash],
          ['Online', r.payments.online],
          ['Mode needs review', r.payments.unclassified],
        ]}
        total={r.payments.totalCollected}
      />}
      <SummaryCard
        title="Waivers and discounts"
        rows={[
          ['Grading waived', r.grading.waived],
          ['Customer payments waived', r.payments.standaloneWaived],
        ]}
        total={sumMoney(r.grading.waived, r.payments.standaloneWaived)}
      />
      <section className="card text-sm text-stone-700">
        <h2 className="text-lg font-bold text-stone-900">How to read these totals</h2>
        <p className="mt-3 leading-relaxed">
          Collections are money received, not the same as charges: a grading payment may also settle
          older dues. Waivers and discounts are not cash received.
        </p>
        <p className="mt-3 leading-relaxed">
          Current dues comes from the complete customer ledger, including activity outside the
          selected dates. It will not generally equal selected charges minus selected collections
          and waivers.
        </p>
        <p className="mt-3 text-stone-500">
          Excluded: {r.grading.cancelledCount} cancelled grading entries and{' '}
          {r.payments.reversedCount} reversed standalone payments in the selected ranges.
        </p>
      </section>
    </section>
    {r.payments.unclassifiedRecords.some((row) => row.kind !== 'seed') && (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-amber-950">
          Payment mode needs review · {rupees(r.payments.unclassified)}
        </h2>
        <p className="mt-1 text-sm text-amber-900">
          These active records have a paid amount but are marked “Due.” The amount is included in
          Total collected but cannot safely be labelled Cash or Online. Historical records have not
          been changed.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.payments.unclassifiedRecords.filter((row) => row.kind !== 'seed').map((row) => (
            <Link
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-brand-800 hover:underline"
              key={row.id}
              to={row.kind === 'grading' ? `/admin/entries/${row.id}/history` : '/admin/payments'}
            >
              {row.kind === 'grading' ? 'GR' : 'RCPT'}-
              {String(row.number).padStart(6, '0')} · {rupees(row.amount)}
            </Link>
          ))}
        </div>
      </section>
    )}
    <section className="space-y-5">
      <ReportTable
        title="Expenses by category"
        headers={['Category', 'Entries', 'Amount']}
        rows={r.expenses.categories.map((x) => [x.label, x.count, rupees(x.amount)])}
        numericColumns={[1, 2]}
      />
      <ReportTable
        title="Payment accounts"
        headers={['Account', 'Transactions', 'Amount']}
        rows={r.paymentAccounts.map((x) => [x.name, x.transactionCount, rupees(x.amount)])}
        numericColumns={[1, 2]}
      />
      <ReportTable
        title="Staff activity"
        headers={['Staff', 'Grading', 'Payments']}
        rows={r.staffActivity.map((x) => [
          x.name,
          x.gradingCount,
          x.paymentCount,
        ])}
        numericColumns={[1, 2]}
      />
    </section>
    <section className="space-y-5">
      <ReportTable
        title="Current customer dues · all customers"
        headers={['Customer', 'Mobile', 'Village', 'Due']}
        rows={r.dues.customers.map((x) => [x.name, x.mobile, x.village, rupees(x.amount)])}
        numericColumns={[3]}
      />
      {false && <ReportTable
        title="Current seed stock"
        headers={['Seed', 'Quantity']}
        rows={r.stock.map((x) => [x.name, `${quantity(x.quantityKg)} kg`])}
        numericColumns={[1]}
      />}
    </section>
  </>
);
const Metric = ({
  label,
  value,
  note,
  danger = false,
}: {
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}) => (
  <article className="card min-w-0">
    <p className="card-label">{label}</p>
    <p
      className={`mt-3 break-words text-2xl font-extrabold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-3xl ${danger ? 'text-red-700' : 'text-stone-900'}`}
    >
      {value}
    </p>
    <p className="mt-3 text-sm leading-relaxed text-stone-600">{note}</p>
  </article>
);
const SummaryCard = ({
  title,
  rows,
  total,
  footer,
}: {
  title: string;
  rows: [string, string][];
  total: string;
  footer?: string;
}) => (
  <section className="card min-w-0">
    <h2 className="text-lg font-bold">{title}</h2>
    <dl className="mt-3 divide-y divide-stone-100 text-sm">
      {rows.map(([label, value]) => (
        <div className="flex items-baseline justify-between gap-4 py-2" key={label}>
          <dt className="min-w-0 text-stone-600">{label}</dt>
          <dd className="shrink-0 font-semibold tabular-nums">{rupees(value)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t border-stone-300 py-3 font-bold">
        <dt>Total</dt>
        <dd className="text-right tabular-nums text-brand-800">{rupees(total)}</dd>
      </div>
    </dl>
    {footer && <p className="mt-1 text-xs leading-relaxed text-stone-500">{footer}</p>}
  </section>
);
const ReportTable = ({
  title,
  headers,
  rows,
  numericColumns = [],
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  numericColumns?: number[];
}) => (
  <section className="min-w-0">
    <h2 className="mb-2 text-xl font-bold">{title}</h2>
    <div className="table-panel">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h, index) => (
              <th className={numericColumns.includes(index) ? 'text-right' : ''} key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  className={`${j === 0 ? 'font-bold' : ''} ${numericColumns.includes(j) ? 'whitespace-nowrap text-right tabular-nums' : ''}`}
                  key={j}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-4 text-sm text-stone-500">No data for this report.</p>}
    </div>
  </section>
);
