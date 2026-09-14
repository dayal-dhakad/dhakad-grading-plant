# Phase 13 — Payment Accounts and Dynamic QR

Status: implementation and verification complete on 2026-09-14.

## Implemented scope

- Administrators can create, edit, activate, and deactivate UPI receiving accounts.
- One account may be marked as the business default. Setting a new default clears the old default
  atomically, and the default account cannot be deactivated until another default is selected.
- Payment accounts are retained for history instead of being deleted.
- Active accounts are available to staff and administrators while recording online payments.
- A positive online payment requires an active receiving account. Cash payments do not store one.
- Grading entries, seed bills, grading revisions, and standalone customer payments retain the
  selected receiving account for reconciliation.
- Staff can generate a scannable, exact-amount UPI QR from grading, seed-sale, and customer-payment
  flows. Administrators can also generate an ad hoc QR from payment-account management.
- QR generation uses a standard `upi://pay` payload with payee, account-holder name, INR amount,
  and an optional reference. QR images are generated locally in the shared React application.
- This phase does not claim or infer payment success. Staff still confirms and records receipt of
  funds explicitly.

## API

- `GET /api/v1/payment-accounts`
- `POST /api/v1/payment-accounts` (administrator)
- `PATCH /api/v1/payment-accounts/:id` (administrator)
- `PATCH /api/v1/payment-accounts/:id/status` (administrator)
- `POST /api/v1/payment-accounts/:id/qr`

All routes require authentication. Mutation and query boundaries use strict Zod validation.

## Database

- Added append-safe `payment_accounts` records with UPI ID uniqueness, active state, and creator
  attribution.
- Added nullable historical payment-account links to grading entries, customer payments, and seed
  bills. Existing cash and historical online rows remain valid with a null link.
- Migration `20260914194500_payment_accounts_dynamic_qr` was applied without resetting data.

## Verification

- Prisma formatting, schema validation, client generation, and migration deployment: passed.
- Repository lint and strict typecheck: passed.
- Tests: 12 backend files / 37 tests, 1 frontend file / 4 tests, and 9 shared files / 38 tests passed.
- Production builds for shared, backend, frontend/PWA, and Electron: passed.

## Known issue

- The frontend production bundle retains the existing non-blocking chunk-size warning.

## Deferred

- Automatic payment-provider verification, webhooks, settlement imports, refunds, and bank
  reconciliation are not included.
- SMS and WhatsApp notifications remain Phase 14.
