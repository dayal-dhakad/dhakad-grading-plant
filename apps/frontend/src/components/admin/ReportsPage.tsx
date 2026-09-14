import { useState } from 'react';
import type { ReportResponse } from '@dhakad/shared';
import { useGetOverviewReportQuery } from '@/services/api/report-api';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
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
    ['Total collected', report.payments.totalCollected],
    ['Cash collected', report.payments.cash],
    ['Online collected', report.payments.online],
    ['Current customer dues', report.dues.total],
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
        <div className="self-end text-sm text-stone-600">Service dates are inclusive.</div>
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
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Grading charges"
        value={`₹${r.grading.amount}`}
        note={`${r.grading.count} entries · ${r.grading.quantityQuintals} q`}
      />
      <Metric
        label="Seed sales"
        value={`₹${r.seeds.net}`}
        note={`${r.seeds.count} bills · ${r.seeds.quantityKg} kg`}
      />
      <Metric
        label="Total collected"
        value={`₹${r.payments.totalCollected}`}
        note={`Cash ₹${r.payments.cash} · Online ₹${r.payments.online}`}
      />
      <Metric
        label="Current dues"
        value={`₹${r.dues.total}`}
        note={`${r.dues.customers.length} customers shown`}
        danger
      />
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <ReportTable
        title="Payment accounts"
        headers={['Account', 'Transactions', 'Amount']}
        rows={r.paymentAccounts.map((x) => [x.name, x.transactionCount, `₹${x.amount}`])}
      />
      <ReportTable
        title="Staff activity"
        headers={['Staff', 'Grading', 'Seeds', 'Payments', 'Collected']}
        rows={r.staffActivity.map((x) => [
          x.name,
          x.gradingCount,
          x.seedBillCount,
          x.paymentCount,
          `₹${x.collected}`,
        ])}
      />
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <ReportTable
        title="Highest customer dues"
        headers={['Customer', 'Mobile', 'Village', 'Due']}
        rows={r.dues.customers.map((x) => [x.name, x.mobile, x.village, `₹${x.amount}`])}
      />
      <ReportTable
        title="Current seed stock"
        headers={['Seed', 'Quantity']}
        rows={r.stock.map((x) => [x.name, `${x.quantityKg} kg`])}
      />
    </section>
    <section className="card text-sm text-stone-600">
      Cancelled in period: {r.grading.cancelledCount} grading entries and {r.seeds.cancelledCount}{' '}
      seed bills. Reversed standalone payments: {r.payments.reversedCount}. Discounts: ₹
      {r.seeds.discount}; waivers on active grading entries: ₹{r.grading.waived}.
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
  <article className="card">
    <p className="card-label">{label}</p>
    <p className={`mt-2 text-3xl font-bold ${danger ? 'text-red-700' : ''}`}>{value}</p>
    <p className="mt-2 text-xs text-stone-500">{note}</p>
  </article>
);
const ReportTable = ({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) => (
  <section>
    <h2 className="mb-2 text-xl font-bold">{title}</h2>
    <div className="table-panel">
      <table className="data-table min-w-[520px]">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td className={j === 0 ? 'font-bold' : ''} key={j}>
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
