import { useState } from 'react';
import type { GradingEntry, Payment, SeedBill } from '@dhakad/shared';
import { PrintIcon } from '../table/TableActions';
import { tableActionClass, tableIconActionClass } from '../table/table-action-styles';

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
  const receiptNumber =
    props.kind === 'grading'
      ? number('GR', props.record.entryNumber)
      : props.kind === 'seed'
        ? number('SEED', props.record.billNumber)
        : number('RCPT', props.record.receiptNumber);
  const title =
    props.kind === 'grading'
      ? 'Grading receipt'
      : props.kind === 'seed'
        ? 'Seed sale receipt'
        : 'Payment receipt';
  return (
    <>
      <button
        type="button"
        className={props.iconOnly ? tableIconActionClass('brand') : tableActionClass('brand')}
        aria-label={props.iconOnly ? `Print ${receiptNumber} receipt` : undefined}
        title={props.iconOnly ? `Print ${receiptNumber} receipt` : undefined}
        onClick={() => setOpen(true)}
      >
        <PrintIcon />
        {!props.iconOnly && 'Print'}
      </button>
      {open && (
        <div className="receipt-overlay fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 p-3 sm:p-6">
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
                <h1 className="text-2xl font-black">Dhakad Grading Plant</h1>
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
                  {props.kind === 'payment'
                    ? new Date(props.record.createdAt).toLocaleDateString('en-IN')
                    : props.record.serviceDate}
                </strong>
                <span>Status</span>
                <strong className="text-right">
                  {props.record.status === 'ACTIVE'
                    ? 'Active'
                    : props.kind === 'payment'
                      ? 'Reversed'
                      : 'Cancelled'}
                </strong>
              </div>
              {props.kind === 'grading' && (
                <div className="mt-5 border-y border-stone-300 py-3 text-sm">
                  <p className="font-bold">{props.record.crop.name}</p>
                  <p className="mt-1">
                    {props.record.quantity} {props.record.unit.symbol} × ₹{props.record.rate}
                  </p>
                </div>
              )}
              {props.kind === 'seed' && (
                <table className="mt-5 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Item</th>
                      <th>Qty.</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.record.items.map((item) => (
                      <tr className="border-b" key={item.id}>
                        <td className="py-2">{item.product.name}</td>
                        <td>
                          {item.enteredQuantity} {item.enteredUnit.toLowerCase()}
                        </td>
                        <td className="text-right">₹{item.netAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2 border-t-2 border-stone-900 pt-3">
                {props.kind !== 'payment' && (
                  <>
                    <span>Total</span>
                    <strong className="text-right">
                      ₹
                      {props.kind === 'grading'
                        ? props.record.calculatedAmount
                        : props.record.netAmount}
                    </strong>
                  </>
                )}
                <span>{props.kind === 'payment' ? 'Amount received' : 'Paid'}</span>
                <strong className="text-right">
                  ₹{props.kind === 'payment' ? props.record.amount : props.record.paidAmount}
                </strong>
                {props.kind !== 'payment' && (
                  <>
                    <span>Due</span>
                    <strong className="text-right">₹{props.record.dueAmount}</strong>
                  </>
                )}
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
