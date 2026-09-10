import { Link, useParams } from 'react-router-dom';
import { useGetCustomerQuery } from '@/services/api/customer-api';
import { useGetGradingEntriesQuery } from '@/services/api/grading-api';
import { CustomerPaymentsPanel } from '@/components/payments/CustomerPaymentsPanel';

export const CustomerDetailPage = () => {
  const { id = '' } = useParams();
  const { data: customer, isLoading, isError } = useGetCustomerQuery(id);
  const { data: grading } = useGetGradingEntriesQuery(
    { customerId: id, status: 'all', page: 1 },
    { skip: !id },
  );
  if (isLoading) return <div className="card">Loading customer…</div>;
  if (isError || !customer)
    return <div className="card text-red-700">Customer could not be loaded.</div>;
  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/admin/customers" className="font-semibold text-brand-800 hover:underline">
        ← Back to customers
      </Link>
      <section className="card mt-5">
        <p className="card-label">Customer</p>
        <h1 className="mt-2 text-3xl font-bold">{customer.name}</h1>
        <p className="mt-2 font-semibold text-brand-800">{customer.mobile}</p>
        <p className="mt-1 text-stone-600">
          {customer.village}
          {customer.address ? ` · ${customer.address}` : ''}
        </p>
      </section>
      <CustomerPaymentsPanel customerId={customer.id} />
      <section className="mt-6">
        <h2 className="text-xl font-bold">Grading history</h2>
        <div className="mt-3 grid gap-3">
          {!grading?.gradingEntries.length ? (
            <div className="card text-stone-600">No grading entries yet.</div>
          ) : (
            grading.gradingEntries.map((entry) => (
              <article className="card" key={entry.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      GR-{String(entry.entryNumber).padStart(6, '0')} · {entry.crop.name}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {entry.serviceDate} · {entry.quantity} {entry.unit.symbol}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{entry.calculatedAmount}</p>
                    <p className="text-sm text-stone-600">
                      Paid ₹{entry.paidAmount} · Due ₹{entry.dueAmount}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
