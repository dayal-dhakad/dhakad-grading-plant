# Phase 7 — Role Workspaces and Staff Management

Status: implementation and verification complete on 2026-09-08.

## Implemented scope

- Added separate, backend-protected administrator and staff route trees in the shared React application.
- Administrators land on an admin dashboard with staff, customer, grading-entry, due, and recent-entry summaries.
- The administrator sidebar now contains Dashboard, Staff, Customers, Grading Settings, and Entries. Grading Settings is visibly deferred to Phase 8.
- Added administrator-only staff list, search, pagination, account creation, activation/deactivation, and dedicated staff detail pages with entry counts and history.
- Deactivating staff revokes their active sessions. Password hashes never cross the API boundary.
- Changed the administrator customer directory to a table-style view while retaining search, status filtering, pagination, account actions, and dedicated details.
- Added an administrator Entries workspace with Grading and Seed Sale tabs and a detailed grading table. Seed Sale remains an unavailable placeholder.
- Staff now land on New Entry and see only New Entry and My Entries in their sidebar.
- Added an inline staff grading form with 300 ms mobile-number search, customer suggestions, selected customer details, derived existing grading dues, crop/quantity calculation, editable amount paid, and cash/online payment mode.
- My Entries is scoped on the backend to the authenticated staff user. A caller cannot select another staff ID to bypass this rule.
- Added shared Zod staff contracts and response validation.

## API

- `GET /api/v1/staff`
- `GET /api/v1/staff/:id`
- `POST /api/v1/staff`
- `PATCH /api/v1/staff/:id/status`
- `GET /api/v1/customers/:id/grading-due`
- `GET /api/v1/grading` now supports administrator staff filtering and enforces staff self-scoping.

Staff-management routes require `ADMIN`. Customer mutation routes are now administrator-only; authenticated staff retain customer search/read access for entry creation.

## Verification

- Formatter and lint: passed
- Repository typecheck: passed
- Tests: passed (24 backend, 4 frontend, and 16 shared)
- Repository build: passed for backend, web/PWA, and Electron
- Database migration: not required
- Database-backed role smoke test: admin and staff login passed; admin staff-list access returned 200; staff access to the admin staff API returned 403; staff self-scoped grading list returned 200

## Deferred

- Grading settings and auditable, reason-required entry revisions remain Phase 8.
- The ledger remains the future authoritative customer balance in Phase 9. Current displayed dues are derived from active grading entries.
- Seed behavior remains deferred until its requirements review.
