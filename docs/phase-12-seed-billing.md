# Phase 12 — Seed Billing

Status: implementation and verification complete on 2026-09-10.

## Implemented scope

- Added staff seed-sale billing with one or more seed products per bill.
- Bills use the human-facing format `SEED-000001`.
- Staff can enter grams, kilograms, or quintals; the backend normalizes sold stock to whole grams.
- The configured selling rate and discount are loaded as defaults, while staff may override the
  rate and fixed/percentage/no discount for each sale line.
- The backend validates active customers/products, prevents duplicate products on a bill, checks
  available stock, and calculates all monetary totals authoritatively with decimal arithmetic.
- Bill creation atomically writes the bill, line snapshots, negative stock movements, charge,
  payment, and optional small-balance waiver ledger entries.
- Staff can record partial payment and explicitly waive only a positive remainder up to ₹10.
- Staff see the selected customer's existing total due before confirming a sale.
- Staff see only their own seed bills; administrators see all seed bills.
- Active bills can be cancelled with a mandatory reason. Cancellation restores stock and reverses
  the bill's remaining ledger effect without deleting financial or stock history.
- Added compact, paginated seed-bill tables to both staff and administrator entry workspaces.

## API

- `GET /api/v1/seed-bills`
- `POST /api/v1/seed-bills`
- `POST /api/v1/seed-bills/:id/cancel`

All routes require authentication. Staff list/cancellation access is scoped to their own bills;
administrators have business-wide access. Mutation inputs use strict shared Zod contracts.

## Database

- Added `seed_bills` and `seed_bill_items` with immutable quantity, rate, discount, and amount
  snapshots.
- Added `SALE` and `SALE_REVERSAL` append-only stock movement types.
- Added seed charge, payment, and reversal ledger entry types and bill linkage.
- Migration `20260910233000_seed_billing` was applied without resetting existing data.

## Verification

- Prisma schema validation, client generation, and migration deployment: passed.
- Formatter, lint, strict repository typecheck, tests, and production builds: passed.
- Shared billing validation covers multi-line discounts, empty bills, and unknown fields.
- Backend query validation covers pagination coercion and bounds.

## Known issue

- The frontend production bundle retains the existing non-blocking chunk-size warning.

## Deferred

- Seed returns are not included.
- GST/tax calculation is not included.
- Payment accounts and dynamic QR remain Phase 13.
- Notifications, reporting, and printable receipts remain in their later approved phases.
