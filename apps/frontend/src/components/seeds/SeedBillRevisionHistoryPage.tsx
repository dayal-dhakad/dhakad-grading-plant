import { Link, useParams } from 'react-router-dom';
import { SeedBillSchema } from '@dhakad/shared';
import { useGetSeedBillQuery, useGetSeedBillRevisionsQuery } from '@/services/api/seed-billing-api';

export const SeedBillRevisionHistoryPage = ({ admin = false }: { admin?: boolean }) => {
  const { id = '' } = useParams();
  const { data: bill } = useGetSeedBillQuery(id);
  const { data: revisions, isLoading, isError } = useGetSeedBillRevisionsQuery(id);
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        className="text-sm font-semibold text-brand-800 hover:underline"
        to={admin ? '/admin/entries' : '/staff/entries'}
      >
        ← Back to entries
      </Link>
      <div>
        <p className="card-label">Seed bill audit history</p>
        <h1 className="mt-1 text-2xl font-bold">
          SEED-{bill ? String(bill.billNumber).padStart(6, '0') : '…'} revisions
        </h1>
      </div>
      {isLoading && <div className="card">Loading revisions…</div>}
      {isError && <div className="card text-red-700">Revision history could not be loaded.</div>}
      {revisions && revisions.length === 0 && (
        <div className="card text-stone-600">No revisions recorded.</div>
      )}
      {revisions?.map((revision) => {
        const before = SeedBillSchema.safeParse(revision.before);
        const after = SeedBillSchema.safeParse(revision.after);
        return (
          <article className="card" key={revision.id}>
            <h2 className="font-bold">Revision {revision.revisionNumber}</h2>
            <p className="mt-1 text-sm text-stone-600">
              {revision.reason} · {revision.revisedBy.name} ·{' '}
              {new Date(revision.createdAt).toLocaleString()}
            </p>
            {before.success && after.success ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['Before', before.data],
                    ['After', after.data],
                  ] as const
                ).map(([label, snapshot]) => (
                  <section className="rounded-lg border p-3" key={label}>
                    <h3 className="font-bold text-brand-800">{label}</h3>
                    <p className="mt-2 text-sm">
                      {snapshot.customer.name} · {snapshot.serviceDate}
                    </p>
                    <p className="mt-1 text-sm">
                      Total ₹{snapshot.netAmount} · Paid ₹{snapshot.paidAmount} · Waived ₹
                      {snapshot.waivedAmount} · Due ₹{snapshot.dueAmount}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {snapshot.items.map((item) => (
                        <li key={item.id}>
                          {item.product.name}: {item.enteredQuantity}{' '}
                          {item.enteredUnit.toLowerCase()} at ₹{item.ratePerKg}/kg · ₹
                          {item.netAmount}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-red-700">
                Historical snapshot could not be displayed.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
};
