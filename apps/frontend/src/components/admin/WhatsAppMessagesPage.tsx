import { useState } from 'react';
import { useGetWhatsAppReportQuery } from '@/services/api/notification-api';

const money = (value: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value));
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN');

export const WhatsAppMessagesPage = () => {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useGetWhatsAppReportQuery({
    status,
    page,
    pageSize: 20,
  });
  const count = (key: string) => data?.summary[key] ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-label">Notifications</p>
          <h1 className="mt-1 text-3xl font-bold">WhatsApp Messages</h1>
          <p className="mt-1 text-sm text-stone-600">Fast2SMS wallet and message activity</p>
        </div>
        <button className="secondary-button" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {data?.wallet ? (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-brand-600 p-5">
          <div>
            <p className="card-label">Fast2SMS wallet balance</p>
            <p className="mt-1 text-3xl font-bold">{money(data.wallet.balance)}</p>
          </div>
          {data.wallet.remainingMessages !== null && (
            <div className="text-right">
              <p className="card-label">Messages remaining</p>
              <p className="mt-1 text-2xl font-bold">{data.wallet.remainingMessages.toLocaleString('en-IN')}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="card p-5" role="status">
          <p className="font-semibold">Fast2SMS wallet balance unavailable</p>
          <p className="mt-1 text-sm text-stone-600">
            {data?.walletError ?? (isLoading ? 'Loading wallet balance…' : 'Check API configuration and try again.')}
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="WhatsApp message totals">
        {[
          ['Sent', count('SENT') + count('DELIVERED') + count('READ')],
          ['Pending', count('PENDING') + count('PROCESSING')],
          ['Failed', count('FAILED')],
          [
            'Total',
            Object.values(data?.summary ?? {}).reduce<number>((sum, value) => sum + value, 0),
          ],
        ].map(([label, value]) => (
          <div className="card p-4" key={label}>
            <p className="card-label">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 p-4">
          <div>
            <h2 className="text-lg font-bold">Message report</h2>
            <p className="text-sm text-stone-600">Messages recorded by this application</p>
          </div>
          <label className="field-label">
            Status
            <select
              className="compact-field mt-1"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent, delivered, read</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>
        {isLoading ? (
          <p className="p-5 text-stone-600">Loading messages…</p>
        ) : isError ? (
          <p className="p-5 text-red-700" role="alert">Could not load WhatsApp messages. Refresh to try again.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-stone-100 text-stone-700">
                  <tr>
                    {['Date', 'Customer', 'Mobile', 'Message', 'Status', 'Attempts', 'Created by'].map((heading) => (
                      <th className="px-3 py-2 font-semibold" key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.notifications.map((message) => (
                    <tr className="border-t border-stone-200" key={message.id}>
                      <td className="whitespace-nowrap px-3 py-2">{dateTime(message.createdAt)}</td>
                      <td className="px-3 py-2 font-medium">{message.customer.name}</td>
                      <td className="px-3 py-2">{message.customer.mobile}</td>
                      <td className="max-w-sm truncate px-3 py-2" title={message.messagePreview}>{message.messagePreview}</td>
                      <td className="px-3 py-2">{message.status}</td>
                      <td className="px-3 py-2">{message.attempts}</td>
                      <td className="px-3 py-2">{message.createdBy.name}</td>
                    </tr>
                  ))}
                  {!data?.notifications.length && (
                    <tr><td className="px-3 py-8 text-center text-stone-500" colSpan={7}>No WhatsApp messages found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-stone-200 p-3 text-sm">
              <span>{data?.pagination.total ?? 0} messages · Page {page} of {Math.max(1, data?.pagination.totalPages ?? 1)}</span>
              <div className="flex gap-2">
                <button className="secondary-button min-h-9 px-3" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="secondary-button min-h-9 px-3" disabled={page >= (data?.pagination.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
