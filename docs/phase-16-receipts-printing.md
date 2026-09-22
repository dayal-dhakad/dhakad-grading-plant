# Phase 16 — Receipts and Printing

## Implemented scope

- Shared receipt preview for grading entries, seed-sale bills, and customer payments.
- Print actions in administrator, staff, customer-history, seed-bill, and payment tables.
- A4 and 80mm thermal paper previews.
- Receipt identifiers, customer details, dates, transaction details, totals, paid/due values,
  payment mode, receiving account, and transaction status.
- Print-only CSS that removes application navigation and controls from printed output.
- Browser print support, including the browser's Save as PDF facility.

## Decisions

- Receipts use authoritative API response values and do not recalculate financial totals.
- Printing remains browser-native so the same React UI works on web, PWA, and Electron.
- Server-generated PDFs and direct printer drivers are deferred; they are not required for the
  confirmed browser-print workflow.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: backend 37, frontend 4, shared 44 (85 total).
- `npm run build` passed for shared, backend, frontend/PWA, and desktop.
- Vite reports a non-blocking JavaScript chunk-size warning.

## Maintenance fixes

- Entry-table shortcut printing keeps its temporary receipt mounted until the browser fires
  `afterprint`. This prevents blank output in browsers where `window.print()` returns before the
  print renderer captures the page.
