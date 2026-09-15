import { useState, type FormEvent } from 'react';

export const PaymentReversalDialog = ({
  receiptLabel,
  amount,
  isLoading,
  onCancel,
  onConfirm,
}: {
  receiptLabel: string;
  amount: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setMessage('Enter a reason of at least 3 characters.');
      return;
    }
    setMessage('');
    try {
      await onConfirm(trimmedReason);
    } catch {
      setMessage('Unable to reverse this payment. It may already be reversed or unavailable.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reverse-payment-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={(event) => void submit(event)}
      >
        <p className="card-label text-red-700">Confirm reversal</p>
        <h2 id="reverse-payment-title" className="mt-1 text-xl font-bold text-stone-950">
          Reverse {receiptLabel}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          The payment of <strong className="text-stone-900">₹{amount}</strong> will be reversed and
          added back to the customer’s dues. The original payment remains in the audit history.
        </p>
        <label className="field-label mt-4 block" htmlFor="payment-reversal-reason">
          Reversal reason *
          <textarea
            id="payment-reversal-reason"
            className="field mt-2 min-h-24"
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: Wrong amount entered"
          />
        </label>
        {message && (
          <p
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button
            type="button"
            className="secondary-button"
            disabled={isLoading}
            onClick={onCancel}
          >
            Keep payment
          </button>
          <button
            type="submit"
            className="rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Reversing…' : 'Reverse payment'}
          </button>
        </div>
      </form>
    </div>
  );
};
