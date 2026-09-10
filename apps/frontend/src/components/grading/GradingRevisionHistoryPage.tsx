import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetGradingEntryQuery, useGetGradingRevisionsQuery } from '@/services/api/grading-api';
import { TablePagination } from '../table/TablePagination';
const display = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
};
export const GradingRevisionHistoryPage = ({ admin = false }: { admin?: boolean }) => {
  const { id = '' } = useParams();
  const { data: entry } = useGetGradingEntryQuery(id);
  const { data: revisions, isLoading } = useGetGradingRevisionsQuery(id);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const back = admin ? '/admin/entries' : '/staff/entries';
  return (
    <div className="mx-auto max-w-5xl">
      <Link to={back} className="font-semibold text-brand-800 hover:underline">
        ← Back to entries
      </Link>
      <h1 className="mt-4 text-3xl font-bold">
        Revision history {entry ? `· GR-${String(entry.entryNumber).padStart(6, '0')}` : ''}
      </h1>
      {isLoading ? (
        <div className="card mt-5">Loading history…</div>
      ) : !revisions?.length ? (
        <div className="card mt-5 text-stone-600">This entry has not been edited.</div>
      ) : (
        <div className="mt-5 grid gap-4">
          {revisions.slice((page - 1) * pageSize, page * pageSize).map((revision) => (
            <article className="card" key={revision.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-bold">Revision {revision.revisionNumber}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {revision.revisedBy.name} · {new Date(revision.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="rounded-xl bg-amber-50 px-4 py-2 font-semibold text-amber-900">
                  {revision.reason}
                </p>
              </div>
              <div className="table-panel mt-5">
                <table className="data-table min-w-[620px]">
                  <thead>
                    <tr>
                      <th className="p-2">Field</th>
                      <th className="p-2">Before</th>
                      <th className="p-2">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.keys(revision.after).map((field) => (
                      <tr key={field}>
                        <td className="table-primary">{field}</td>
                        <td className="p-2">{display(revision.before[field])}</td>
                        <td className="p-2">{display(revision.after[field])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
          <div className="table-panel">
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={revisions.length}
              totalPages={Math.ceil(revisions.length / pageSize)}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
