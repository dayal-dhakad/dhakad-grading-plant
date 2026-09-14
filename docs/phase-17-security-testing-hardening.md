# Phase 17 — Security and Testing Hardening

## Implemented scope

- Added Helmet security headers and retained the existing removal of Express identification headers.
- Retained strict, HTTP-only session cookies and production-only secure cookies.
- Added a global API limiter (500 requests per 15 minutes) alongside the stricter login limiter
  (10 failed attempts per 15 minutes).
- Enabled Express proxy trust only in production for correct secure deployment behavior.
- Added `Cache-Control: no-store` to API responses containing business or authentication data.
- Reject malformed session-token shapes before issuing a database query.
- Return stable, non-sensitive `400 INVALID_JSON` and `413 PAYLOAD_TOO_LARGE` responses.
- Audited role and ownership enforcement for administrator controls, staff revisions/cancellations,
  reports, payment reversal, stock management, and shared read-only customer history.
- Added regression coverage for security headers, caching, malformed JSON, and oversized payloads.
- Added Helmet as a maintained backend runtime dependency.

## Verification

- `npm run typecheck` passed for all workspaces.
- `npm run lint` passed.
- `npm test` passed: backend 39, frontend 4, shared 44 (87 total).
- `npm run build` passed for shared, backend, frontend/PWA, and desktop.
- `npm audit --omit=dev` reported zero vulnerabilities.

## Known deployment consideration

- Rate-limit counters currently use the process-local store. This is correct for a single backend
  process. A shared store such as Redis is required only if production uses multiple API replicas.
- Vite continues to report a non-blocking frontend chunk-size warning.
