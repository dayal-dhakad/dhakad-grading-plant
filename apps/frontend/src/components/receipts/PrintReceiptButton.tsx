import { useEffect, useState } from 'react';
import type { GradingEntry, Payment, SeedBill } from '@dhakad/shared';
import { PrintIcon } from '../table/TableActions';
import { tableActionClass, tableIconActionClass } from '../table/table-action-styles';
import { SeedInvoice } from './SeedInvoice';
import { GradingInvoice } from './GradingInvoice';

type Props = (
  | { kind: 'grading'; record: GradingEntry }
  | { kind: 'seed'; record: SeedBill }
  | { kind: 'payment'; record: Payment }
) & { iconOnly?: boolean };

const number = (prefix: string, value: number) => `${prefix}-${String(value).padStart(6, '0')}`;
const mode = (value: string) => (value === 'CASH' ? 'Cash' : value === 'ONLINE' ? 'Online' : 'Due');

export const PrintReceiptButton = (props: Props) => {
  const [open, setOpen] = useState(false);
  const [paper, setPaper] = useState<'a4' | 'thermal'>('a4');

  useEffect(() => {
    if (!open || !props.iconOnly) return;

    const closeAfterPrint = () => setOpen(false);
    let printFrame = 0;
    const renderFrame = requestAnimationFrame(() => {
      printFrame = requestAnimationFrame(() => window.print());
    });

    window.addEventListener('afterprint', closeAfterPrint, { once: true });
    return () => {
      cancelAnimationFrame(renderFrame);
      cancelAnimationFrame(printFrame);
      window.removeEventListener('afterprint', closeAfterPrint);
    };
  }, [open, props.iconOnly]);

  const openPrint = () => setOpen(true);
  if (props.kind === 'seed') {
    const receiptNumber = number('SEED', props.record.billNumber);
    return (
      <>
        <button
          type="button"
          className={props.iconOnly ? tableIconActionClass('brand') : tableActionClass('brand')}
          aria-label={props.iconOnly ? `Print ${receiptNumber} invoice` : undefined}
          title={props.iconOnly ? `Print ${receiptNumber} invoice` : undefined}
          onClick={openPrint}
        >
          <PrintIcon />
          {!props.iconOnly && 'Print'}
        </button>
        {open && (
          <div
            className={
              props.iconOnly
                ? 'receipt-overlay pointer-events-none fixed inset-0 opacity-0 print:pointer-events-auto print:opacity-100'
                : 'receipt-overlay fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 p-3 sm:p-6'
            }
          >
            <div className="mx-auto max-w-4xl">
              <div className="no-print mb-3 flex justify-end gap-2 rounded-xl bg-white p-3">
                <button className="secondary-button" onClick={() => setOpen(false)}>
                  Close
                </button>
                <button className="primary-button" onClick={() => window.print()}>
                  Print invoice
                </button>
              </div>
              <div className="print-receipt receipt-a4">
                <SeedInvoice
                  invoice={{
                    number: receiptNumber,
                    customer: props.record.customer,
                    serviceDate: props.record.serviceDate,
                    items: props.record.items.map((item) => ({
                      key: item.id,
                      name: item.product.name,
                      quantity: item.enteredQuantity,
                      unit: item.enteredUnit.toLowerCase(),
                      ratePerKg: item.ratePerKg,
                      amount: item.netAmount,
                    })),
                    subtotal: props.record.subtotalAmount,
                    gstRate: props.record.gstRate,
                    gstAmount: props.record.gstAmount,
                    grandTotal: props.record.netAmount,
                    paid: props.record.paidAmount,
                    due: props.record.dueAmount,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  if (props.kind === 'grading') {
    const receiptNumber = number('GR', props.record.entryNumber);
    return (
      <>
        <button
          type="button"
          className={props.iconOnly ? tableIconActionClass('brand') : tableActionClass('brand')}
          aria-label={props.iconOnly ? `Print ${receiptNumber} receipt` : undefined}
          title={props.iconOnly ? `Print ${receiptNumber} receipt` : undefined}
          onClick={openPrint}
        >
          <PrintIcon />
          {!props.iconOnly && 'Print'}
        </button>
        {open && (
          <div
            className={
              props.iconOnly
                ? 'receipt-overlay pointer-events-none fixed inset-0 opacity-0 print:pointer-events-auto print:opacity-100'
                : 'receipt-overlay fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 p-3 sm:p-6'
            }
          >
            <div className="mx-auto max-w-3xl">
              <div className="no-print mb-3 flex justify-end gap-2 rounded-xl bg-white p-3">
                <button className="secondary-button" onClick={() => setOpen(false)}>
                  Close
                </button>
                <button className="primary-button" onClick={() => window.print()}>
                  Print receipt
                </button>
              </div>
              <div className="print-receipt receipt-a4">
                <GradingInvoice
                  invoice={{
                    number: receiptNumber,
                    customer: props.record.customer,
                    serviceDate: props.record.serviceDate,
                    crop: props.record.crop.name,
                    quantity: `${props.record.quantity} ${props.record.unit.symbol}`,
                    rate: props.record.rate,
                    amount: props.record.calculatedAmount,
                    paid: props.record.paidAmount,
                    due: props.record.dueAmount,
                    paymentMode: mode(props.record.paymentMethod),
                    notes: props.record.notes,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  const receiptNumber = number('RCPT', props.record.receiptNumber);
  const title = 'Payment receipt';
  return (
    <>
      <button
        type="button"
        className={props.iconOnly ? tableIconActionClass('brand') : tableActionClass('brand')}
        aria-label={props.iconOnly ? `Print ${receiptNumber} receipt` : undefined}
        title={props.iconOnly ? `Print ${receiptNumber} receipt` : undefined}
        onClick={openPrint}
      >
        <PrintIcon />
        {!props.iconOnly && 'Print'}
      </button>
      {open && (
        <div
          className={
            props.iconOnly
              ? 'receipt-overlay pointer-events-none fixed inset-0 opacity-0 print:pointer-events-auto print:opacity-100'
              : 'receipt-overlay fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 p-3 sm:p-6'
          }
        >
          <div className="mx-auto max-w-3xl">
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                Paper
                <select
                  className="compact-field"
                  value={paper}
                  onChange={(event) => setPaper(event.target.value as 'a4' | 'thermal')}
                >
                  <option value="a4">A4</option>
                  <option value="thermal">80mm thermal</option>
                </select>
              </label>
              <div className="flex gap-2">
                <button className="secondary-button" onClick={() => setOpen(false)}>
                  Close
                </button>
                <button className="primary-button" onClick={() => window.print()}>
                  Print receipt
                </button>
              </div>
            </div>
            <article
              className={`print-receipt bg-white text-stone-950 ${paper === 'thermal' ? 'receipt-thermal' : 'receipt-a4'}`}
            >
              <header className="border-b-2 border-stone-900 pb-4 text-center">
                <img
                  className="mx-auto mb-2 h-16 w-16 object-contain"
                  src="/icons/dhakad-logo.png"
                  alt="Dhakad Grading Plant"
                />
                <h1 className="text-2xl font-black">Dhakad Grading Plant</h1>
                <p className="mt-1 text-xs">Support: +91 99819 80308</p>
                <p className="mt-1 font-bold">{title}</p>
                <p className="mt-1 text-sm">{receiptNumber}</p>
              </header>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span>Customer</span>
                <strong className="text-right">{props.record.customer.name}</strong>
                <span>Mobile</span>
                <strong className="text-right">{props.record.customer.mobile}</strong>
                <span>Date</span>
                <strong className="text-right">
                  {new Date(props.record.createdAt).toLocaleDateString('en-IN')}
                </strong>
                <span>Status</span>
                <strong className="text-right">
                  {props.record.status === 'ACTIVE' ? 'Active' : 'Reversed'}
                </strong>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 border-t-2 border-stone-900 pt-3">
                <span>Amount received</span>
                <strong className="text-right">₹{props.record.amount}</strong>
                <span>Payment mode</span>
                <strong className="text-right">{mode(props.record.paymentMethod)}</strong>
                {props.record.paymentAccount && (
                  <>
                    <span>Receiving account</span>
                    <strong className="text-right">{props.record.paymentAccount.name}</strong>
                  </>
                )}
              </div>
              <footer className="mt-10 border-t border-dashed border-stone-500 pt-4 text-center text-xs">
                Thank you for your business.
              </footer>
            </article>
          </div>
        </div>
      )}
    </>
  );
};
