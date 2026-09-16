import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportResponse } from '@dhakad/shared';
import { useGetOverviewReportQuery } from '@/services/api/report-api';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const rupees = (value: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value));
const quantity = (value: string) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Number(value));
const downloadCsv = (report: ReportResponse) => {
  const rows: (string | number)[][] = [
    ['Dhakad Grading Plant report', `${report.period.from} to ${report.period.to}`],
    ['Metric', 'Value'],
    ['Grading entries', report.grading.count],
    ['Grading quantity (quintals)', report.grading.quantityQuintals],
    ['Grading charges', report.grading.amount],
    ['Seed bills', report.seeds.count],
    ['Seed quantity (kg)', report.seeds.quantityKg],
    ['Seed net sales', report.seeds.net],
    ['Total billed', report.totalBilled],
    ['Grading paid', report.grading.paid],
    ['Seed paid', report.seeds.paid],
    ['Standalone customer payments', report.payments.standalone.amount],
    ['Grading waived', report.grading.waived],
    ['Seed waived', report.seeds.waived],
    ['Standalone payment waived', report.payments.standaloneWaived],
    ['Total waived', report.totalWaived],
    ['Total collected', report.payments.totalCollected],
    ['Cash collected', report.payments.cash],
    ['Online collected', report.payments.online],
    ['Payment mode needs review', report.payments.unclassified],
    ['Current customer dues', report.dues.total],
    [],
    ['Payments needing mode review'],
    ['Record', 'Amount'],
    ...report.payments.unclassifiedRecords.map((row) => [
      `${row.kind === 'grading' ? 'GR' : row.kind === 'seed' ? 'SEED' : 'RCPT'}-${String(row.number).padStart(6, '0')}`,
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
    ['Staff', 'Grading', 'Seed bills', 'Payments', 'Collected'],
    ...report.staffActivity.map((row) => [
      row.name,
      row.gradingCount,
      row.seedBillCount,
      row.paymentCount,
      row.collected,
    ]),
    [],
    ['Seed stock'],
    ['Seed', 'Quantity kg'],
    ...report.stock.map((row) => [row.name, row.quantityKg]),
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
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const { data, isLoading, isError } = useGetOverviewReportQuery(
    { from, to },
    { skip: !from || !to || from > to },
  );
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
      <section className="card grid gap-4 sm:grid-cols-3">
        <label className="field-label">
          From
          <input
            className="field mt-2"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field-label">
          To
          <input
            className="field mt-2"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <p className="self-end text-sm leading-relaxed text-stone-600">
          Entry and bill totals use inclusive service dates. Standalone payments use their recorded
          date. Current dues and stock are live, all-time balances.
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
      <Metric
        label="Seed sales, after discount"
        value={rupees(r.seeds.net)}
        note={`${r.seeds.count} bills · ${quantity(r.seeds.quantityKg)} kg`}
      />
      <Metric
        label="Total billed"
        value={rupees(r.totalBilled)}
        note="Grading charges + seed sales after discount"
      />
      <Metric
        label="Total waived"
        value={rupees(r.totalWaived)}
        note="Grading, seed bills, and customer payments"
      />
      <Metric
        label="Total collected"
        value={rupees(r.payments.totalCollected)}
        note="See source and payment-mode breakdown below"
      />
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
          ['Seed bill payments', r.seeds.paid],
          [
            `Standalone customer payments (${r.payments.standalone.count})`,
            r.payments.standalone.amount,
          ],
        ]}
        total={r.payments.totalCollected}
      />
      <SummaryCard
        title="Collections by payment mode"
        rows={[
          ['Cash', r.payments.cash],
          ['Online', r.payments.online],
          ['Mode needs review', r.payments.unclassified],
        ]}
        total={r.payments.totalCollected}
      />
      <SummaryCard
        title="Waivers and discounts"
        rows={[
          ['Grading waived', r.grading.waived],
          ['Seed bills waived', r.seeds.waived],
          ['Customer payments waived', r.payments.standaloneWaived],
        ]}
        total={r.totalWaived}
        footer={`Seed discounts, already deducted from seed sales: ${rupees(r.seeds.discount)}`}
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
          Excluded: {r.grading.cancelledCount} cancelled grading entries, {r.seeds.cancelledCount}{' '}
          cancelled seed bills, and {r.payments.reversedCount} reversed standalone payments in the
          selected ranges.
        </p>
      </section>
    </section>
    {r.payments.unclassifiedRecords.length > 0 && (
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
          {r.payments.unclassifiedRecords.map((row) => (
            <Link
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-brand-800 hover:underline"
              key={row.id}
              to={
                row.kind === 'grading'
                  ? `/admin/entries/${row.id}/history`
                  : row.kind === 'seed'
                    ? `/admin/seed-bills/${row.id}/history`
                    : '/admin/payments'
              }
            >
              {row.kind === 'grading' ? 'GR' : row.kind === 'seed' ? 'SEED' : 'RCPT'}-
              {String(row.number).padStart(6, '0')} · {rupees(row.amount)}
            </Link>
          ))}
        </div>
      </section>
    )}
    <section className="space-y-5">
      <ReportTable
        title="Payment accounts"
        headers={['Account', 'Transactions', 'Amount']}
        rows={r.paymentAccounts.map((x) => [x.name, x.transactionCount, rupees(x.amount)])}
        numericColumns={[1, 2]}
      />
      <ReportTable
        title="Staff activity"
        headers={['Staff', 'Grading', 'Seeds', 'Payments', 'Collected']}
        rows={r.staffActivity.map((x) => [
          x.name,
          x.gradingCount,
          x.seedBillCount,
          x.paymentCount,
          rupees(x.collected),
        ])}
        numericColumns={[1, 2, 3, 4]}
      />
    </section>
    <section className="space-y-5">
      <ReportTable
        title="Current customer dues · all customers"
        headers={['Customer', 'Mobile', 'Village', 'Due']}
        rows={r.dues.customers.map((x) => [x.name, x.mobile, x.village, rupees(x.amount)])}
        numericColumns={[3]}
      />
      <ReportTable
        title="Current seed stock"
        headers={['Seed', 'Quantity']}
        rows={r.stock.map((x) => [x.name, `${quantity(x.quantityKg)} kg`])}
        numericColumns={[1]}
      />
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
