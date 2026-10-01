# Phase 21 — Background exports

## Approved scope

- Administrators request a PDF customer-directory export from the Customers page.
- The request uses the current search and status filters but is never limited by table pagination.
- Export jobs are persisted with Pending, Processing, Ready, or Failed status.
- Customer records and ledger balances are read in batches of 500.
- The Exports page refreshes automatically and provides the completed PDF download.
- Generated files remain private to the administrator who requested them.
- Administrators can also request a grading-entry PDF from the Entries page.
- Grading exports use the current search and inclusive service-date filters, include active and cancelled entries, and are independent of pagination.
- Reports use the same background PDF-only workflow; CSV and direct browser-print export are not offered.

Generated PDFs are stored in PostgreSQL so downloads survive backend restarts and do not depend on ephemeral container storage.
