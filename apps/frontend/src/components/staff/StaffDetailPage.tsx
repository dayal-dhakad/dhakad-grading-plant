import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetGradingEntriesQuery } from '@/services/api/grading-api';
import { useGetStaffQuery } from '@/services/api/staff-api';
import { TablePagination } from '../table/TablePagination';
export const StaffDetailPage = () => {
  const { id = '' } = useParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: staff, isLoading } = useGetStaffQuery(id);
  const { data: entries } = useGetGradingEntriesQuery(
    { staffId: id, status: 'all', page, pageSize },
    { skip: !id },
  );
  if (isLoading) return <div className="card">Loading staff…</div>;
  if (!staff) return <div className="card text-red-700">Staff member could not be loaded.</div>;
  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/admin/staff" className="font-semibold text-brand-800 hover:underline">
        ← Back to staff
      </Link>
      <section className="card mt-5">
        <p className="card-label">Staff account</p>
        <h1 className="mt-2 text-3xl font-bold">{staff.name}</h1>
        <p className="mt-2 text-brand-800">{staff.mobile}</p>
        <div className="mt-5 flex gap-6">
          <div>
            <p className="card-label">Total entries</p>
            <p className="mt-1 text-2xl font-bold">{staff.entryCount}</p>
          </div>
          <div>
            <p className="card-label">Status</p>
            <p className="mt-1 font-bold">{staff.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
      </section>
      <h2 className="mt-7 text-xl font-bold">Entry history</h2>
      <div className="table-panel mt-3">
        <table className="data-table min-w-[700px]">
          <thead>
            <tr>
              <th className="p-4">Entry</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Crop</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Paid / Due</th>
            </tr>
          </thead>
          <tbody>
            {entries?.gradingEntries.map((entry) => (
              <tr className="border-t" key={entry.id}>
                <td className="table-id">GR-{String(entry.entryNumber).padStart(6, '0')}</td>
                <td className="table-primary">
                  <Link className="hover:underline" to={`/customers/${entry.customer.id}`}>
                    {entry.customer.name}
                  </Link>
                </td>
                <td className="p-4">{entry.crop.name}</td>
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
    </div>
  );
};
