import { frontendEnv } from '@/app/config/env';
import { useGetExportsQuery } from '@/services/api/export-api';
export const ExportsPage = () => {
  const {
    data = [],
    isLoading,
    isError,
  } = useGetExportsQuery(undefined, { pollingInterval: 3000 });
  return (
    <div className="space-y-5">
      <header>
        <p className="card-label">Generated files</p>
        <h1 className="mt-1 text-3xl font-bold">Exports</h1>
        <p className="mt-2 text-sm text-stone-600">
          Large exports are prepared in the background. This page refreshes automatically.
        </p>
      </header>
      <section className="table-panel">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Export</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Records</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {data.map((job) => (
              <tr key={job.id}>
                <td>
                  <span className="font-bold">
                    {job.type === 'CUSTOMERS'
                      ? 'Customer directory'
                      : job.type === 'GRADING_ENTRIES'
                        ? 'Grading entries'
                        : 'Business report'}
                  </span>
                  <div className="text-xs text-stone-500">
                    PDF ·{' '}
                    {'status' in job.filters
                      ? `${job.filters.status}${job.filters.search ? ` · ${job.filters.search}` : ''}`
                      : `${job.filters.from} to ${job.filters.to}`}
                  </div>
                </td>
                <td>{new Date(job.createdAt).toLocaleString('en-IN')}</td>
                <td className="font-semibold">
                  {job.status === 'PENDING'
                    ? 'Waiting'
                    : job.status === 'PROCESSING'
                      ? 'Preparing'
                      : job.status === 'READY'
                        ? 'Ready'
                        : 'Failed'}
                </td>
                <td>{job.recordCount ?? '—'}</td>
                <td>
                  {job.status === 'READY' ? (
                    <a
                      className="primary-button inline-flex min-h-0 px-3 py-2"
                      href={`${frontendEnv.VITE_API_BASE_URL}/exports/${job.id}/download`}
                    >
                      Download PDF
                    </a>
                  ) : job.error ? (
                    <span className="text-sm text-red-700">{job.error}</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <p className="p-5">Loading exports…</p>}
        {isError && <p className="p-5 text-red-700">Exports could not be loaded.</p>}
        {!isLoading && !data.length && (
          <p className="p-5 text-stone-600">No exports requested yet.</p>
        )}
      </section>
    </div>
  );
};
