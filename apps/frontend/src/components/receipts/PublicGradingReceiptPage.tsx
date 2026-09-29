import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { GradingEntry } from '@dhakad/shared';
import { GradingInvoice } from './GradingInvoice';

const paymentMode = (value: string) =>
  value === 'CASH' ? 'Cash' : value === 'ONLINE' ? 'Online' : 'Due';

export const PublicGradingReceiptPage = () => {
  const { token = '' } = useParams();
  const [receipt, setReceipt] = useState<GradingEntry>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/grading/public/${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Receipt unavailable');
        return (await response.json()) as { gradingEntry: GradingEntry };
      })
      .then((data) => setReceipt(data.gradingEntry))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true);
      });
    return () => controller.abort();
  }, [token]);

  if (failed)
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 p-5">
        <p className="font-semibold text-red-700">This receipt link is invalid or unavailable.</p>
      </main>
    );
  if (!receipt)
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100">
        <p>Loading receipt…</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-stone-200 p-3 sm:p-8">
      <article className="print-receipt mx-auto max-w-3xl bg-white shadow-xl">
        <GradingInvoice
          invoice={{
            number: `GR-${String(receipt.entryNumber).padStart(6, '0')}`,
            customer: receipt.customer,
            serviceDate: receipt.serviceDate,
            crop: receipt.crop.name,
            quantity: `${receipt.quantity} ${receipt.unit.symbol}`,
            rate: receipt.rate,
            amount: receipt.calculatedAmount,
            paid: receipt.paidAmount,
            due: receipt.dueAmount,
            paymentMode: paymentMode(receipt.paymentMethod),
            notes: receipt.notes,
          }}
        />
        <div className="p-6 pt-0">
          <button className="primary-button w-full print:hidden" onClick={() => window.print()}>
            Print receipt
          </button>
        </div>
      </article>
    </main>
  );
};
