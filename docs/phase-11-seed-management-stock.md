# Phase 11 — Seed Management and Stock

Status: implementation and verification complete on 2026-09-10.

## Implemented scope

- Added administrator-only seed catalog and stock management.
- Extended the existing product/category foundation without deleting or resetting existing data.
- Seed names use one field that accepts Hindi, English, or both.
- Each variety is managed as its own seed product. Administrators configure its name, optional
  code, selling rate per kilogram, default fixed/percentage/no discount, and active status. Type is
  fixed to Seeds and low-stock alerts are not used.
- Optional opening stock can be recorded in the same transaction that creates a seed product.
- Stock entry supports grams, kilograms, and quintals and normalizes exactly to whole grams.
- Added append-only opening stock, stock addition, correction increase, and correction decrease
  movements with mandatory reasons and user attribution.
- Serializable transactions prevent negative stock and duplicate opening-stock history.
- Available stock is derived from signed stock movements. Low and zero stock are highlighted.
- Added searchable/filterable/paginated seed table and dedicated stock-history route.
- Preserved existing Chia and Quinoa products with zero initial stock and safe configuration
  defaults. Seed commands remain idempotent.

## API

- `GET /api/v1/seed-management`
- `POST /api/v1/seed-management/categories`
- `POST /api/v1/seed-management`
- `GET /api/v1/seed-management/:id`
- `PATCH /api/v1/seed-management/:id`
- `PATCH /api/v1/seed-management/:id/status`
- `POST /api/v1/seed-management/:id/stock`

All routes require the `ADMIN` role. Mutation boundaries use strict shared Zod contracts.

## Database

- Added `SeedDiscountType`, `SeedQuantityUnit`, and `SeedStockMovementType` enums.
- Added rate, discount, and low-stock configuration to `products`.
- Added append-only `seed_stock_movements` with database checks, indexes, and restrictive foreign
  keys.
- Migration `20260910220000_seed_management_stock` applied without resetting existing data.

## Verification

- Prisma schema validation and client generation: passed.
- Migration deployment and idempotent reference seed: passed.
- Formatter, lint, and strict repository typecheck: passed.
- Tests: 34 backend, 4 frontend, and 29 shared tests passed.
- Repository build: passed for shared, backend, frontend/PWA, and Electron.
- Database-backed admin list smoke test: passed and returned preserved Chia/Quinoa records.
- Staff authorization smoke test: passed with `403 Forbidden`.

## Known issue

- The frontend production bundle reports a non-blocking chunk-size warning just above 500 kB.
  Route-level code splitting can be addressed during the later hardening phase.

## Deferred

- Seed sale entry, bill lines, stock deduction, payments, dues, returns, and sale reversals remain
  Phase 12.
- No supplier, vendor, purchase, or purchase-cost workflow was added.
- Payment accounts, QR, notifications, reports, and receipts remain in their owning later phases.
