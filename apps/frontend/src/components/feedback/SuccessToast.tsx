import { useEffect } from 'react';

export const SuccessToast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed right-4 top-4 z-[70] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-xl"
      role="status"
      aria-live="polite"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100">
        ✓
      </span>
      <span>{message}</span>
      <button
        type="button"
        className="min-h-0 text-lg leading-none text-stone-400 hover:text-stone-700"
        aria-label="Close notification"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
};
