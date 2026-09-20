import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SeedInvoice } from './SeedInvoice';

type Receipt = {
  billNumber: number;
  customer: { name: string; mobile: string; village: string; address: string | null };
  subtotalAmount: string; gstRate: string; gstAmount: string; netAmount: string;
  paidAmount: string; dueAmount: string; serviceDate: string;
  items: Array<{ id: string; product: { name: string }; enteredQuantity: string; enteredUnit: string; ratePerKg: string; netAmount: string }>;
};

export const PublicSeedReceiptPage = () => {
  const { token = '' } = useParams();
  const [receipt, setReceipt] = useState<Receipt>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/seed-bills/public/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Invoice unavailable');
        return (await response.json()) as { bill: Receipt };
      })
      .then((data) => setReceipt(data.bill))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true);
      });
    return () => controller.abort();
  }, [token]);
  if (failed) return <main className="grid min-h-screen place-items-center bg-stone-100 p-5"><p className="font-semibold text-red-700">This invoice link is invalid or unavailable.</p></main>;
  if (!receipt) return <main className="grid min-h-screen place-items-center bg-stone-100"><p>Loading invoice…</p></main>;
  return <main className="min-h-screen bg-stone-200 p-3 sm:p-8"><article className="print-receipt mx-auto max-w-4xl bg-white shadow-xl"><SeedInvoice invoice={{ number: `SEED-${String(receipt.billNumber).padStart(6, '0')}`, customer: receipt.customer, serviceDate: receipt.serviceDate, items: receipt.items.map((item) => ({ key: item.id, name: item.product.name, quantity: item.enteredQuantity, unit: item.enteredUnit.toLowerCase(), ratePerKg: item.ratePerKg, amount: item.netAmount })), subtotal: receipt.subtotalAmount, gstRate: receipt.gstRate, gstAmount: receipt.gstAmount, grandTotal: receipt.netAmount, paid: receipt.paidAmount, due: receipt.dueAmount }} />
    <div className="p-6 pt-0"><button className="primary-button w-full print:hidden" onClick={() => window.print()}>Print invoice</button></div>
  </article></main>;
};
