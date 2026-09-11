# Phase 9 — Payments, Dues, and Ledger

Status: implementation and verification complete on 2026-09-08; small-balance waiver follow-up added on 2026-09-10.

## Implemented scope

- Added an append-only customer ledger using signed decimal entries: charges increase dues and payments/reversals adjust them explicitly.
- Backfilled active grading charges and grading-time payments into the ledger during migration.
- New grading creation, reasoned revision, and cancellation now update the ledger in the same database transaction.
- Both authenticated roles can receive partial or full customer payments by cash or online method.
- Payments cannot be zero, negative, or greater than the authoritative customer balance.
- Payments allocate to active grading dues oldest-first and retain allocation records.
- Entry paid/due displays now include active later-payment allocations while preserving the separate grading-time payment used by revision forms.
- Staff payment listings are backend-scoped to payments recorded by the authenticated staff user.
- Administrators can view all payments and reverse a payment with a mandatory reason. Reversal restores the ledger balance and preserves the original payment and allocations.
- Active allocated payments must be reversed before their grading entry can be cancelled.
- Added customer ledger/payment panels and role-specific payment workspaces.
- Payment numbers use `RCPT-` plus a zero-padded database sequence.
- Staff can explicitly waive any positive remaining balance while creating a grading entry or receiving a customer payment. The original charge and cash received remain unchanged; the waiver is a separate append-only ledger entry.
- Waivers are attributed to the authenticated user and allocated to grading entries. Reversing a linked payment also posts an explicit waiver reversal and restores the full amount due.

## API

- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `GET /api/v1/payments/customers/:customerId/ledger`
- `POST /api/v1/payments/:id/reverse` (`ADMIN` only)

## Verification

- Prisma schema validation: passed
- Formatter, lint, and repository typecheck: passed
- Tests: passed (29 backend, 4 frontend, and 21 shared)
- Repository build: passed for backend, web/PWA, and Electron
- Append-only migration `20260908230000_payments_ledger`: applied successfully
- Database-backed API smoke test: a ₹40 grading due became ₹30 after a ₹10 online payment and returned to ₹40 after administrator reversal
- Temporary smoke-test customer, grading, payment, allocation, and ledger rows were removed after verification

### Small-balance waiver follow-up (2026-09-10)

- Added and applied the append-only `20260910120000_small_balance_waivers` migration without resetting existing data.
- Prisma schema validation, formatting, lint, repository typecheck, and all application builds passed.
- Tests passed: 32 backend, 4 frontend, and 24 shared tests.
- Focused tests cover an explicit ₹5 waiver on a ₹505 charge with ₹500 paid, the unselected behavior, and rejection above the ₹10 limit.
- No seed-management or later-phase behavior was added.

## Deferred

- Payment receiving accounts, account-specific online reconciliation, and dynamic QR remain Phase 13.
- Seed charges and payments remain deferred until seed requirements and billing phases.
- Printable receipts remain Phase 16.
