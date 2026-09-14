import { useState, type FormEvent } from 'react';
import type { PaymentAccount } from '@dhakad/shared';
import QRCode from 'qrcode';
import { ApiErrorResponseSchema } from '@/services/api/auth-api';
import {
  useCreatePaymentAccountMutation,
  useCreatePaymentQrMutation,
  useGetPaymentAccountsQuery,
  useSetPaymentAccountStatusMutation,
  useUpdatePaymentAccountMutation,
} from '@/services/api/payment-account-api';

export const PaymentAccountsPage = () => {
  const { data: accounts = [], isLoading } = useGetPaymentAccountsQuery('all');
  const [editing, setEditing] = useState<PaymentAccount>();
  const [showForm, setShowForm] = useState(false);
  const [qrAccount, setQrAccount] = useState<PaymentAccount>();
  const [setStatus] = useSetPaymentAccountStatusMutation();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-label">Configuration</p>
          <h1 className="mt-1 text-3xl font-bold">Payment accounts</h1>
          <p className="mt-2 text-sm text-stone-600">
            Manage UPI accounts used to receive online payments.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          Add account
        </button>
      </header>
      {showForm && (
        <AccountForm
          {...(editing ? { account: editing } : {})}
          onClose={() => setShowForm(false)}
        />
      )}
      {qrAccount && <QrPreview account={qrAccount} onClose={() => setQrAccount(undefined)} />}
      <section className="table-panel">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>Account</th>
              <th>Account holder</th>
              <th>UPI ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="font-bold">
                  {account.name}
                  {account.isDefault && (
                    <span className="ml-2 rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-800">
                      Default
                    </span>
                  )}
                </td>
                <td>{account.accountHolderName}</td>
                <td className="font-mono">{account.upiId}</td>
                <td>{account.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="secondary-button min-h-0 px-3 py-2"
                      onClick={() => {
                        setEditing(account);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    {account.isActive && (
                      <button
                        className="secondary-button min-h-0 px-3 py-2"
                        onClick={() => setQrAccount(account)}
                      >
                        QR
                      </button>
                    )}
                    <button
                      className="secondary-button min-h-0 px-3 py-2"
                      disabled={account.isDefault}
                      onClick={() =>
                        void setStatus({ id: account.id, isActive: !account.isActive })
                      }
                    >
                      {account.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && accounts.length === 0 && (
          <p className="p-5 text-sm text-stone-600">No payment accounts configured.</p>
        )}
      </section>
    </div>
  );
};

const AccountForm = ({ account, onClose }: { account?: PaymentAccount; onClose: () => void }) => {
  const [name, setName] = useState(account?.name ?? '');
  const [holder, setHolder] = useState(account?.accountHolderName ?? '');
  const [upiId, setUpiId] = useState(account?.upiId ?? '');
  const [isDefault, setDefault] = useState(account?.isDefault ?? false);
  const [message, setMessage] = useState('');
  const [create, createState] = useCreatePaymentAccountMutation();
  const [update, updateState] = useUpdatePaymentAccountMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      const input = { name, accountHolderName: holder, upiId, isDefault };
      if (account) await update({ id: account.id, input }).unwrap();
      else await create(input).unwrap();
      onClose();
    } catch (error) {
      const parsed = ApiErrorResponseSchema.safeParse(error);
      setMessage(
        parsed.success
          ? (parsed.data.data.error.details?.[0]?.message ?? parsed.data.data.error.message)
          : 'Unable to save the payment account. Please try again.',
      );
    }
  };
  return (
    <section className="card">
      <div className="flex justify-between">
        <div>
          <p className="card-label">{account ? 'Edit' : 'New'} receiving account</p>
          <h2 className="mt-1 text-xl font-bold">UPI details</h2>
        </div>
        <button className="secondary-button min-h-0" onClick={onClose}>
          Close
        </button>
      </div>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
        <label className="field-label">
          Account name *
          <input
            className="field mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main counter"
          />
        </label>
        <label className="field-label">
          Account holder name *
          <input
            className="field mt-2"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
          />
        </label>
        <label className="field-label">
          UPI ID *
          <input
            className="field mt-2"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="name@bank"
          />
        </label>
        <label className="flex items-center gap-3 self-end rounded-xl border p-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setDefault(e.target.checked)}
          />
          Use as default account
        </label>
        {message && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{message}</p>}
        <button
          className="primary-button sm:col-span-2"
          disabled={createState.isLoading || updateState.isLoading}
        >
          Save account
        </button>
      </form>
    </section>
  );
};

const QrPreview = ({ account, onClose }: { account: PaymentAccount; onClose: () => void }) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [image, setImage] = useState('');
  const [message, setMessage] = useState('');
  const [createQr, state] = useCreatePaymentQrMutation();
  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = await createQr({
        id: account.id,
        amount,
        ...(reference ? { reference } : {}),
      }).unwrap();
      setImage(await QRCode.toDataURL(payload.upiUri, { width: 320, margin: 2 }));
    } catch {
      setMessage('Enter a valid amount greater than zero.');
    }
  };
  return (
    <section className="card">
      <div className="flex justify-between">
        <div>
          <p className="card-label">Dynamic QR</p>
          <h2 className="mt-1 text-xl font-bold">{account.name}</h2>
          <p className="mt-1 text-sm text-stone-600">{account.upiId}</p>
        </div>
        <button className="secondary-button min-h-0" onClick={onClose}>
          Close
        </button>
      </div>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => void generate(e)}
      >
        <label className="field-label">
          Amount *
          <input
            className="field mt-2"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setImage('');
            }}
          />
        </label>
        <label className="field-label">
          Reference
          <input
            className="field mt-2"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setImage('');
            }}
            placeholder="Receipt or customer"
          />
        </label>
        <button className="primary-button self-end" disabled={state.isLoading}>
          Generate QR
        </button>
      </form>
      {message && <p className="mt-3 text-sm font-semibold text-red-700">{message}</p>}
      {image && (
        <div className="mt-5 grid justify-items-center rounded-xl border bg-white p-5">
          <img src={image} alt={`UPI QR for ${account.name}`} className="w-64" />
          <p className="mt-2 text-lg font-bold">₹{Number(amount).toFixed(2)}</p>
          <p className="text-sm text-stone-600">Scan with any UPI app</p>
        </div>
      )}
    </section>
  );
};
