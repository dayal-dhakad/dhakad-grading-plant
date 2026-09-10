# Phase 6 — Grading and Cleaning

Status: implementation and verification complete on 2026-09-08.

## Scope and decisions

- Both authenticated roles can create, list, search, and cancel grading/cleaning entries.
- Each entry records an active customer, crop, service date, quantity in the crop's configured rate unit, the snapshotted cleaning rate, calculated total, amount paid, and cash or online payment method.
- The UI calculates `quantity × crop rate`, rounds to two decimal places, and initially fills Amount paid with the calculated total. Staff may reduce it to zero or any amount up to the total.
- The backend independently recalculates the total with decimal arithmetic and rejects overpayment. Client calculations are only immediate feedback.
- The unpaid difference is returned and displayed as the entry's due amount. Customer ledger posting and later payments remain deferred to Phase 9.
- Online payment records only the method. Payment-account selection and reconciliation remain deferred to Phase 10.
- Entries are immutable after creation. Corrections use cancellation with a required reason and retain the original amounts.
- Human-facing numbers use `GR-` plus a zero-padded database sequence; internal relationships use UUIDs.
- Added dedicated customer detail routes with grading history and browser back navigation to the customer list.

## API

- `GET /api/v1/grading/references`
- `GET /api/v1/grading`
- `POST /api/v1/grading`
- `POST /api/v1/grading/:id/cancel`

All routes require an authenticated server session.

## Verification

- Prisma schema validation: passed
- Formatter check: passed
- Repository lint: passed
- Repository typecheck: passed
- Tests: passed (backend, frontend, and shared)
- Repository build: passed, including backend, web/PWA, and Electron
- Append-only migration `20260908093000_grading_cleaning`: applied successfully to Docker PostgreSQL
- Database-backed insert and calculation smoke test: passed inside a transaction and rolled back

## Deferred decisions

- Ledger entries, later/extra payments, settlement, and consolidated customer balances remain in Phase 9.
- Online receiving accounts, dynamic QR, and reconciliation remain in Phase 10.
- Crop/rate administration remains deferred to the appropriate administration phase.
- Grading receipts and printing remain deferred to Phase 13.
