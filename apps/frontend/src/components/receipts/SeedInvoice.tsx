export type SeedInvoiceData = {
  number: string;
  statusLabel?: string;
  customer: { name: string; mobile: string; village: string; address?: string | null };
  serviceDate: string;
  items: Array<{ key: string; name: string; quantity: string; unit: string; ratePerKg: string; amount: string }>;
  subtotal: string;
  gstRate: string;
  gstAmount: string;
  grandTotal: string;
  paid: string;
  due: string;
};

export const SeedInvoice = ({ invoice }: { invoice: SeedInvoiceData }) => (
  <article className="seed-invoice bg-white text-stone-950">
    <header className="bg-stone-700 p-6 text-center">
      <img className="mx-auto h-24 w-auto" src="/icons/rcp-exim-logo.png" alt="RCP EXIM" />
    </header>
    <section className="grid gap-6 p-6 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
      <div><h1 className="text-xl font-black">RCP EXIM PRIVATE LIMITED</h1><p className="mt-2 text-sm">Opposite Police Line, Police Colony<br />Mandsaur, Madhya Pradesh 458001</p><p className="mt-2 font-bold">IEC: AAPCR6909P</p><p className="text-sm font-semibold">Support: +91 99819 80308</p></div>
      <div className="text-center"><h2 className="text-4xl font-black tracking-[0.2em]">INVOICE</h2><p className="mt-2 text-xs font-bold">{invoice.number}</p>{invoice.statusLabel && <p className="text-xs text-stone-500">{invoice.statusLabel}</p>}</div>
      <div className="sm:text-right"><strong>To:</strong><p>{invoice.customer.name}</p>{invoice.customer.address && <p>{invoice.customer.address}</p>}<p>{invoice.customer.village}</p><p>{invoice.customer.mobile}</p><p className="mt-4"><strong>Date:</strong> {invoice.serviceDate}</p></div>
    </section>
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-sm"><thead className="bg-stone-700 text-white"><tr><th className="p-3 text-left">DESCRIPTION</th><th className="p-3 text-right">PRICE/KG</th><th className="p-3 text-right">QTY.</th><th className="p-3 text-right">AMOUNT</th></tr></thead><tbody>{invoice.items.map((item) => <tr className="border-b" key={item.key}><td className="p-4 font-semibold">{item.name}</td><td className="p-4 text-right">₹{item.ratePerKg}</td><td className="p-4 text-right">{item.quantity} {item.unit}</td><td className="p-4 text-right">₹{item.amount}</td></tr>)}</tbody></table></div>
    <section className="ml-auto grid max-w-sm grid-cols-2 gap-2 p-6 text-sm"><span>Subtotal</span><strong className="text-right">₹{invoice.subtotal}</strong><span>GST ({invoice.gstRate}%)</span><strong className="text-right">₹{invoice.gstAmount}</strong><span className="border-t pt-2 text-lg font-black">Grand Total</span><strong className="border-t pt-2 text-right text-lg">₹{invoice.grandTotal}</strong><span>Paid</span><strong className="text-right">₹{invoice.paid}</strong><span>Due</span><strong className="text-right">₹{invoice.due}</strong></section>
    <footer className="grid gap-6 border-t p-6 text-sm sm:grid-cols-2"><div><h3 className="text-lg font-black">NOTES</h3><p className="mt-2">Seeds orders are processed against advance payment. Courier and documentation charges, when applicable, are payable before dispatch.</p></div><div><h3 className="text-lg font-black">BANK INFORMATION</h3><p className="mt-2">Bank: <strong>AXIS BANK</strong><br />Account holder: <strong>RCP EXIM PRIVATE LIMITED</strong><br />Account: <strong>926020021208765</strong><br />IFSC: <strong>UTIB0004883</strong></p></div></footer>
  </article>
);
