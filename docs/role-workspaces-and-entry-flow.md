# Role Workspaces and Entry Flow

Status: role workspaces and staff management implemented in Phase 7; grading settings and auditable entry revisions implemented in Phase 8 on 2026-09-08.

## Admin navigation

1. Dashboard
2. Staff
3. Customers
4. Grading Settings
5. Entries

The Staff and Customers sections use searchable, paginated tables. Names navigate to dedicated detail routes rather than expanding rows. A staff detail page shows account information, total entry counts, and the staff member's entry history. A customer detail page shows customer information, current dues, and relevant history as implemented by approved phases.

Grading Settings is administrator-only. It owns crop creation, cleaning-rate changes, and crop activation or deactivation. Historical entries retain snapshotted rates even when a current crop rate changes.

Entries contains Grading and Seed Sale tabs. The grading view includes staff, customer, service date, calculated amount, paid amount, outstanding amount, payment method, and entry status. Seed Sale remains unavailable until its workflow is reviewed.

## Staff navigation

1. New Entry
2. My Entries

New Entry is the staff landing route. It contains Grading and Seeds tabs, with unavailable tabs clearly disabled until their phases are approved.

The grading form is embedded directly in the page. Mobile number is its first control. Input is debounced and matching customers appear as suggestions. Selecting a customer displays the canonical mobile number, name, village, and current total dues before grading-specific fields.

My Entries is scoped by the authenticated backend user, not by a client-provided user identifier.

## Entry revision policy

- A grading entry retains the values originally recorded.
- Staff may request a revision only for an entry they created.
- Every revision requires a non-empty reason.
- The backend records the actor, reason, timestamp, previous values, and replacement values.
- Financial and audit history is append-oriented. An edit creates a revision or adjustment; it never destroys the previous state.
- Administrator visibility covers all revisions. Final permissions for administrator corrections can be refined during the owning phase.

## Dues transition

The Phase 9 backend ledger is the authoritative customer balance for grading charges, payments, reversals, and adjustments. Future seed-sale activity must post to the same ledger.

## Confirmed seed boundary

Seed catalog, gram/kilogram/quintal conversion, administrator-managed stock, pricing, discounts,
and append-only movements are confirmed in `phase-10-seed-requirements.md`. The Seeds tabs remain
navigation placeholders until their owning implementation phases are explicitly approved. Billing,
returns, payment behavior, and final sale-entry fields remain Phase 12 decisions.
