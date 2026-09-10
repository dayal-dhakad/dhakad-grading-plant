import { useRef, useState } from 'react';

type MobileNumberInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | undefined;
  autoComplete?: 'tel-national' | 'username';
  compact?: boolean;
};

const MOBILE_DIGITS = 10;

export const MobileNumberInput = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete = 'tel-national',
  compact = false,
}: MobileNumberInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="mt-2">
        <div
          className="relative grid min-w-0 cursor-text grid-cols-10 gap-1 sm:gap-3"
          onClick={() => inputRef.current?.focus()}
        >
          {Array.from({ length: MOBILE_DIGITS }, (_, index) => {
            const digit = value[index];
            const active = focused && index === Math.min(value.length, MOBILE_DIGITS - 1);

            return (
              <span
                aria-hidden="true"
                className={`grid min-w-0 place-items-center border-b-2 font-bold transition-colors ${compact ? 'h-9 text-base' : 'h-11 text-xl'} ${
                  active
                    ? error
                      ? 'border-red-600 text-stone-900'
                      : 'border-brand-700 text-stone-900'
                    : digit
                      ? error
                        ? 'border-red-500 text-stone-900'
                        : 'border-brand-500 text-stone-900'
                      : error
                        ? 'border-red-400 text-stone-400'
                        : 'border-stone-400 text-stone-400'
                }`}
                key={index}
              >
                {digit ?? ''}
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={id}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
            type="tel"
            inputMode="numeric"
            autoComplete={autoComplete}
            maxLength={MOBILE_DIGITS}
            value={value}
            onChange={(event) =>
              onChange(event.target.value.replace(/\D/g, '').slice(0, MOBILE_DIGITS))
            }
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur();
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
          />
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className={`${compact ? 'mt-1' : 'mt-2'} text-xs text-stone-500`}>
          Enter your 10-digit mobile number
        </p>
      )}
    </div>
  );
};
