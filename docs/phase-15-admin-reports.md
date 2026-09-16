# Phase 15 — Admin Reports

Status: implementation and verification complete on 2026-09-14.

Phase 14 live MSG91 verification was explicitly deferred because credentials and approved
templates are not currently available. Its delivery smoke test remains a production prerequisite.

## Implemented scope

- Added an administrator-only Reports workspace with inclusive service-date filters.
- Grading reporting includes active entry count, quantity in quintals, charges, payments, waivers,
  and a separate cancellation count.
- Seed reporting includes active bill count, quantity in kilograms, gross sales, discounts, net
  sales, payments, and a separate cancellation count.
- Collection reporting combines payments captured with grading entries, seed bills, and standalone
  customer payments without counting reversed or cancelled transactions as active collections.
- The overview and CSV export show total waived across active grading entries, active seed bills,
  and active standalone customer payments. Grading and seed waivers follow the selected service
  dates; standalone payment waivers follow the selected UTC creation dates.
- Collections are split by cash, online, receiving account, and staff member.
- Collections with a positive paid amount but a `DUE` payment method are shown separately as
  "mode needs review", with links to the affected records. They remain in total collected but
  are not guessed into cash or online. New grading and seed inputs reject this combination.
- The report shows collected-by-source and collected-by-mode breakdowns, along with grading,
  seed, and standalone-payment waiver components. Total billed is grading charges plus seed net
  sales for the selected service dates. Current customer dues use the authoritative
  append-oriented customer ledger and show every positive balance.
- Current dues and stock are all-time balances, while grading and seed activity uses selected
  service dates and standalone payments use selected UTC creation dates. These totals are not
  expected to reconcile by subtracting only the selected-period activity.
- Current seed stock is derived from append-oriented stock movements.
- Reports can be exported as UTF-8 CSV from the validated API response.

## API

- `GET /api/v1/reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`

The route requires the `ADMIN` role. Query and response contracts use strict shared Zod schemas.

## Verification

- Repository lint and strict typecheck: passed.
- Tests: 12 backend files / 37 tests, 1 frontend file / 4 tests, and 11 shared files / 42 tests.
- Production builds for shared, backend, frontend/PWA, and Electron: passed.
- The report service ran against local PostgreSQL and its result passed the shared response schema.

## Known issue

- The frontend production bundle retains the existing non-blocking chunk-size warning.

## Deferred

- PDF and printer-ready reports remain part of Phase 16 receipts and printing.
- Business timezone/day cutoff remains to be confirmed. Service-date reports currently use the
  stored business date; standalone payment timestamps use UTC date boundaries.
