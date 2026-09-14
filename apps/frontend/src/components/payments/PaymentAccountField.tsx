import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  useCreatePaymentQrMutation,
  useGetPaymentAccountsQuery,
} from '@/services/api/payment-account-api';

export const PaymentAccountField = ({
  value,
  onChange,
  amount,
  reference,
}: {
  value: string;
  onChange: (id: string) => void;
  amount: string;
  reference?: string | undefined;
}) => {
  const { data: accounts = [] } = useGetPaymentAccountsQuery('active');
  const [createQr, qrState] = useCreatePaymentQrMutation();
  const [qrImage, setQrImage] = useState<{ key: string; url: string }>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!value && accounts.length)
      onChange((accounts.find((item) => item.isDefault) ?? accounts[0]!).id);
  }, [accounts, onChange, value]);
  useEffect(() => {
    if (!value || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void createQr({ id: value, amount, ...(reference ? { reference } : {}) })
        .unwrap()
        .then(async (payload) => {
          const url = await QRCode.toDataURL(payload.upiUri, { width: 260, margin: 2 });
          if (!cancelled) {
            setMessage('');
            setQrImage({ key: `${value}|${amount}`, url });
          }
        })
        .catch(() => {
          if (!cancelled) setMessage('Unable to generate the payment QR.');
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [amount, createQr, reference, value]);
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <label className="field-label">
            Receiving account *
            <select
              className="field mt-2 bg-white"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name} · {account.upiId}
                  {account.isDefault ? ' · Default' : ''}
                </option>
              ))}
            </select>
          </label>
          {accounts.length === 0 && (
            <p className="mt-2 text-sm font-semibold text-red-700">
              Ask an administrator to configure an active payment account.
            </p>
          )}
          {qrState.isLoading && <p className="mt-2 text-xs text-stone-500">Generating QR…</p>}
          {message && <p className="mt-2 text-sm font-semibold text-red-700">{message}</p>}
        </div>
        {qrImage?.key === `${value}|${amount}` && (
          <div className="grid justify-items-center rounded-xl bg-white p-3">
            <img className="w-52 sm:w-56" src={qrImage.url} alt="UPI payment QR" />
            <p className="mt-1 font-bold">₹{Number(amount).toFixed(2)}</p>
          </div>
        )}
        {accounts.length > 0 && qrImage?.key !== `${value}|${amount}` && (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-brand-200 bg-white p-3 text-center text-sm text-stone-500 sm:w-56">
            Enter a payment amount to show the QR.
          </div>
        )}
      </div>
    </div>
  );
};
