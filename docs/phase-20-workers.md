# Phase 20 — Workers

## Approved scope

- Administrator-only worker management.
- Add a worker with name, optional 10-digit mobile number, and optional notes.
- Record cash or online worker payments independently from business expenses.
- Open a dedicated worker detail page to see total paid and paginated payment history.
- Worker payments are append-only and retain the administrator who recorded them.

The legacy `WORKER_PAYMENT` expense category remains in the database so old rows continue to render, but it is no longer offered for new expenses. Corrections and reversals for worker payments are deferred until explicitly approved.
