export const tableActionClass = (tone: 'brand' | 'neutral' | 'danger' = 'brand') =>
  `inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 focus-visible:ring-red-300'
      : tone === 'neutral'
        ? 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-100 focus-visible:ring-stone-300'
        : 'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300 hover:bg-brand-100 focus-visible:ring-brand-300'
  }`;

export const tableIconActionClass = (tone: 'brand' | 'neutral' | 'danger' = 'brand') =>
  `inline-flex size-9 min-w-9 items-center justify-center rounded-lg border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 focus-visible:ring-red-300'
      : tone === 'neutral'
        ? 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-100 focus-visible:ring-stone-300'
        : 'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300 hover:bg-brand-100 focus-visible:ring-brand-300'
  }`;
