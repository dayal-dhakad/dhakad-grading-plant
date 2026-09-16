export const EntryDateFilters = ({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) => (
  <div className="flex flex-wrap items-end gap-2">
    <label className="field-label w-[9.5rem] max-w-full text-xs">
      From date
      <input
        className="compact-field mt-1 min-h-9 px-2"
        type="date"
        value={from}
        max={to || undefined}
        onChange={(event) => onFromChange(event.target.value)}
      />
    </label>
    <label className="field-label w-[9.5rem] max-w-full text-xs">
      To date
      <input
        className="compact-field mt-1 min-h-9 px-2"
        type="date"
        value={to}
        min={from || undefined}
        onChange={(event) => onToChange(event.target.value)}
      />
    </label>
    {(from || to) && (
      <button
        type="button"
        className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        onClick={() => {
          onFromChange('');
          onToChange('');
        }}
      >
        Clear
      </button>
    )}
    {from && to && from > to && (
      <p className="w-full text-sm font-semibold text-red-700" role="alert">
        End date must be on or after start date.
      </p>
    )}
  </div>
);
