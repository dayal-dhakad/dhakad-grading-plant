import { useState, type FormEvent } from 'react';

export const EntryCancellationDialog = ({
  entryLabel,
  isLoading,
  onCancel,
  onConfirm,
}: {
  entryLabel: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setMessage('Enter a reason for deleting this entry.');
      return;
    }
    setMessage('');
    try {
      await onConfirm(trimmedReason);
    } catch {
      setMessage(
        'Unable to delete this entry. It may have linked payments that must be reversed first.',
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-entry-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={(event) => void submit(event)}
      >
        <p className="card-label text-red-700">Confirm deletion</p>
        <h2 id="delete-entry-title" className="mt-1 text-xl font-bold text-stone-950">
          Delete {entryLabel}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          This entry will be cancelled and removed from active records. Its history will be kept,
          and related dues or stock will be reversed safely.
        </p>
        <label className="field-label mt-4 block" htmlFor="entry-deletion-reason">
          Reason *
          <textarea
            id="entry-deletion-reason"
            className="field mt-2 min-h-24"
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this entry being deleted?"
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
            Keep entry
          </button>
          <button
            type="submit"
            className="rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Deleting…' : 'Delete entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
