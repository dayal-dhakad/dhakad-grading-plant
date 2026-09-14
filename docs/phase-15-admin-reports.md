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
- Collections are split by cash, online, receiving account, and staff member.
- Current customer dues use the authoritative append-oriented customer ledger and show the 50
  highest positive balances.
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
