export type GradingInvoiceData = {
  number: string;
  statusLabel?: string;
  customer: { name: string; mobile: string; village?: string };
  serviceDate: string;
  crop: string;
  quantity: string;
  rate: string;
  amount: string;
  paid: string;
  due: string;
  paymentMode: string;
  notes?: string | null;
};

export const GradingInvoice = ({ invoice }: { invoice: GradingInvoiceData }) => (
  <article className="grading-invoice bg-white text-stone-950">
    <header className="border-b-2 border-stone-900 p-6 text-center">
      <img className="mx-auto mb-3 h-24 w-24 object-contain" src="/icons/dhakad-logo.png" alt="Dhakad Grading Plant" />
      <h1 className="text-2xl font-black">Dhakad Grading Plant</h1>
      <p className="mt-1 text-sm font-semibold">Support: +91 99819 80308</p>
      <p className="mt-3 text-lg font-bold">GRADING RECEIPT</p>
      <p className="text-sm">{invoice.number}</p>
      {invoice.statusLabel && <p className="text-xs text-stone-500">{invoice.statusLabel}</p>}
    </header>
    <section className="grid gap-4 p-6 text-sm sm:grid-cols-2">
      <div><p className="text-stone-500">Customer</p><p className="font-bold">{invoice.customer.name}</p><p>{invoice.customer.mobile}{invoice.customer.village ? ` · ${invoice.customer.village}` : ''}</p></div>
      <div className="sm:text-right"><p><strong>Service date:</strong> {invoice.serviceDate}</p><p><strong>Payment mode:</strong> {invoice.paymentMode}</p></div>
    </section>
    <section className="mx-6 border-y border-stone-300 py-4"><div className="grid grid-cols-2 gap-3 text-sm"><span>Crop</span><strong className="text-right">{invoice.crop}</strong><span>Quantity</span><strong className="text-right">{invoice.quantity}</strong><span>Rate per quintal</span><strong className="text-right">₹{invoice.rate}</strong></div></section>
    <section className="ml-auto grid max-w-sm grid-cols-2 gap-2 p-6 text-sm"><span>Grading amount</span><strong className="text-right">₹{invoice.amount}</strong><span>Paid</span><strong className="text-right">₹{invoice.paid}</strong><span className="border-t pt-2 font-black">Due</span><strong className="border-t pt-2 text-right">₹{invoice.due}</strong></section>
    {invoice.notes && <section className="mx-6 border-t py-4 text-sm"><strong>Notes</strong><p className="mt-1">{invoice.notes}</p></section>}
    <footer className="border-t border-dashed border-stone-500 p-6 text-center text-xs">Thank you for choosing Dhakad Grading Plant.</footer>
  </article>
);
