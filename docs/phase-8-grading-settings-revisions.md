# Phase 8 — Grading Settings and Auditable Entry Revisions

Status: implementation and verification complete on 2026-09-08.

## Implemented scope

- Added an administrator-only Grading Settings workspace.
- Administrators can create crops, update crop names and cleaning rates, and enable or disable crops.
- Crop codes are generated once from the original name and remain stable when the display name changes.
- Existing grading entries retain their snapshotted crop, unit, and rate values when current settings change.
- Disabled crops are excluded from new-entry choices but remain available in historical entries.
- Staff can revise only active grading entries they originally created.
- A revision accepts the complete replacement entry and requires a reason of 3–300 characters.
- The backend recalculates the total with decimal arithmetic and rejects payments above the revised total.
- If a revision retains the same crop, it retains the entry's original snapshotted rate. Selecting another crop uses that crop's current rate and unit.
- Each revision is committed transactionally with a sequential revision number, actor, reason, timestamp, and JSONB before/after snapshots.
- Administrators can inspect revision history for every entry. Staff can inspect history only for their own entries.
- Staff cancellation is now also owner-scoped on the backend.

## API

- `GET /api/v1/grading-settings`
- `POST /api/v1/grading-settings`
- `PATCH /api/v1/grading-settings/:id`
- `PATCH /api/v1/grading-settings/:id/status`
- `GET /api/v1/grading/:id`
- `PUT /api/v1/grading/:id`
- `GET /api/v1/grading/:id/revisions`

Grading settings require `ADMIN`. Entry revision requires `STAFF` and backend ownership. Revision history permits administrators globally and staff for their own entries.

## Verification

- Prisma validation: passed
- Formatter and lint: passed
- Repository typecheck: passed
- Tests: passed (27 backend, 4 frontend, and 19 shared)
- Repository build: passed for backend, web/PWA, and Electron
- Append-only migration `20260908220000_grading_revisions`: applied successfully
- Database-backed revision insert/history smoke test: passed within a transaction and rolled back
- Role smoke test: administrator grading-settings access returned 200; staff access returned 403

## Deferred

- Ledger-backed payments, adjustments, and authoritative customer balances remain Phase 9.
- Seed behavior remains deferred until its requirements review.
- A general audit-log module for non-entry settings and other administrative actions remains in its later owning phase.
