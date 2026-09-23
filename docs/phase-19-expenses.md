# Phase 19 — Expenses

Status: implemented and verified locally on 2026-09-23.

## Decisions and scope

- Added a generic Expenses workspace. Administrators see the business-wide list and may edit
  expenses; staff may add expenses and see only records they personally created. The interface does
  not label expenses as grading or seed expenses, and expenses are not linked to either module.
- Expense entry captures date, amount, category, optional paid-to/name, and optional notes.
- Categories are Worker payment, Electricity bill, Machine parts, Tea / refreshments, and Other.
  Other requires a descriptive category name.
- Adding and editing use a modal. Editing requires a reason and stores append-only before/after
  revision snapshots.
- Payment method/account tracking and receipt uploads are not included.
- The list supports inclusive date and category filters, totals, and pagination.
- Admin reports and CSV export include expense totals, category totals, and an estimated grading
  margin calculated as grading charges minus expenses for the selected dates.

## API

- `GET /api/v1/expenses`
- `POST /api/v1/expenses`
- `PATCH /api/v1/expenses/:id`

All routes require authentication and validate boundaries with strict Zod schemas. Listing is
scoped to the signed-in staff member unless the user is an administrator; editing requires `ADMIN`.

## Verification

- Prisma schema validation and client generation: passed.
- Repository lint, strict typecheck, tests, and production builds: passed.

## Deferred

- Payment tracking, attachments, deletion/cancellation, custom category administration, and links
  to grading or seed records.
