import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<'input'>, 'type'>;

const moneyInputPattern = /^\d*(?:\.\d{0,2})?$/;

export const MoneyInput = ({ onChange, ...props }: Props) => (
  <input
    {...props}
    type="text"
    inputMode="decimal"
    onChange={(event) => {
      if (moneyInputPattern.test(event.target.value)) onChange?.(event);
    }}
  />
);
