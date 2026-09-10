# Phase 3 — Authentication and Authorization

Status: implementation and verification complete. The migration and database-backed login smoke test passed on 2026-09-08.

## Scope and decisions

- Users authenticate with their canonical 10-digit mobile number and a password.
- Passwords are hashed with Argon2id. No default password or credential is committed.
- Sessions are opaque random tokens. Only a SHA-256 digest is stored in PostgreSQL.
- The browser receives the token in an `HttpOnly`, `SameSite=Strict` cookie; production cookies are also `Secure`.
- Sessions expire after 12 hours by default (configurable from 1 to 168 hours), are explicitly revoked on logout, and reject inactive users.
- Failed login responses do not reveal whether a mobile number exists. Repeated failures are rate-limited.
- `requireAuth` and `requireRole` are the backend authorization boundaries for later modules.
- Phase 3 provides `/api/v1/auth/login`, `/api/v1/auth/logout`, and `/api/v1/auth/me`. Login UI and staff administration remain in their owning later phases.

## Initial administrator

Create the first administrator without putting credentials in source files:

```powershell
$env:BOOTSTRAP_ADMIN_MOBILE='9876543210'
$env:BOOTSTRAP_ADMIN_NAME='Administrator'
$env:BOOTSTRAP_ADMIN_PASSWORD='replace-with-a-strong-password'
npm run user:create-admin -w @dhakad/backend
```

The command refuses to overwrite an existing user.

## Development staff account

Create a staff user without storing plaintext credentials in source files:

```powershell
$env:BOOTSTRAP_STAFF_MOBILE='9876543211'
$env:BOOTSTRAP_STAFF_NAME='Staff User'
$env:BOOTSTRAP_STAFF_PASSWORD='replace-with-a-strong-password'
npm run user:create-staff -w @dhakad/backend
```

The command assigns the `STAFF` role and refuses to overwrite an existing user. Routine staff administration remains deferred to its owning phase.

## Verification

- Prisma schema validation: passed
- Repository lint: passed
- Repository typecheck: passed
- Tests: passed (10 backend and 6 shared)
- Repository build: passed
- Migration application: passed against Docker PostgreSQL
- Database-backed administrator login smoke test: passed
