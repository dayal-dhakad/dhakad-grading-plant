# Phase 5 — Customers

Status: implementation and verification complete. Database-backed customer create/search smoke testing passed on 2026-09-08.

## Scope and decisions

- Both authenticated roles (`ADMIN` and `STAFF`) can list, search, create, view, and update customers.
- Customer search covers canonical 10-digit mobile number, name, and village with active customers shown by default.
- Results are paginated and can be filtered by active, inactive, or all customers.
- Mobile numbers remain exactly 10 ASCII digits without `+91`, spaces, or punctuation, matching the existing database constraint and shared primitive.
- Customer name and village are required. Address is optional and an empty address is persisted as `null`.
- Duplicate mobile numbers return a stable conflict code and a field-addressable message.
- Customers are never deleted. Deactivation and reactivation preserve the record for later transaction history.
- Shared Zod contracts validate customer mutation inputs and API responses. Backend-only schemas validate route parameters, query strings, and status changes.
- Added a responsive customer workspace with mobile-first search, status filters, customer cards, pagination, and create/edit dialogs with field-level validation.
- Customer names will navigate to dedicated customer detail routes as related history becomes available; customer details must not expand inline beneath the list or table.

## API

- `GET /api/v1/customers`
- `GET /api/v1/customers/:id`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/:id`
- `PATCH /api/v1/customers/:id/status`

All routes require an authenticated server session.

## Verification

- Prisma schema validation: passed
- Formatter check: passed
- Repository lint: passed
- Repository typecheck: passed
- Tests: passed (18 backend, 4 frontend, and 12 shared)
- Repository build: passed, including backend, web/PWA, and Electron
- Database migration: not required; the reviewed `customers` table was created in Phase 2
- Database-backed authenticated customer create/search smoke test: passed against Docker PostgreSQL

## Deferred decisions

- Customer balances, ledgers, payments, grading history, and billing history remain deferred to their owning phases.
- Import/export, bulk updates, customer deletion, and duplicate-record merging are outside Phase 5.
- Grading workflow and financial-day behavior remain deferred to Phase 6 and later financial phases.
