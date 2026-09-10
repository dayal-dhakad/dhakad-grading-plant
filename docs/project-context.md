# Dhakad Grading Plant — Working Project Context

## Current status

Phases 1 through 11 are implemented and verified. Phase 11 added administrator-managed seed
catalog configuration and append-only stock in grams, kilograms, and quintals. Phase 12 seed
billing awaits explicit approval.

## Product and users

Dhakad Grading Plant manages grading/cleaning transactions, seed products and stock, purchases, bills, payments and dues, customer ledgers, settlements, reports, staff, payment accounts, notifications, and receipts. It does not control industrial machinery.

The primary users work in a local/village business environment. Optimize for large readable controls, plain language, minimal typing, mobile-number-first customer lookup, fast daily entry, and clear feedback. There are exactly two application roles: `ADMIN` and `STAFF`; multiple payment-receiving accounts are not user accounts.

## Confirmed interaction decisions

- Customer and staff names in lists or tables are navigation links.
- Data tables use compact spacing inside bordered white panels. Primary identifiers, names,
  financial totals, outstanding dues, and statuses receive stronger visual emphasis so daily
  scanning remains fast without increasing row height. Pagination belongs inside the table panel,
  remains visible on single-page results, and provides 10, 20, and 50 row-count options.
- Selecting a customer or staff name opens a dedicated detail page with its own route.
- Do not expand customer or staff details inline below a table row.
- Dedicated detail pages must support browser/app back navigation to the originating list.
- Admin and staff use separate role-specific navigation and landing experiences while continuing to share the same React application.
- Authentication has a dedicated `/login` route. Unauthenticated workspace routes redirect there, and authenticated users visiting it are redirected to their role-specific landing page.
- The admin sidebar contains Dashboard, Staff, Customers, Grading Settings, and Entries.
- The staff landing page is the entry workspace. The staff sidebar provides New Entry and My Entries.
- Entry workspaces use top-level Grading and Seeds tabs. Seed catalog, units, and stock behavior are
  confirmed in `docs/phase-10-seed-requirements.md`; seed billing remains deferred to Phase 12.
- Each seed variety is currently managed as a separate product (for example, `Chia Black`). Seed
  type is fixed to `Seeds`. Product setup asks only for name, optional code, selling rate, default
  discount, and optional opening stock; low-stock alerts are not used. Administrators add and edit
  seed products in a modal.
- Staff grading entry is an inline page form, not a modal.
- Customer selection in the staff grading form starts with a debounced mobile-number search. Selecting a suggestion displays the customer's mobile number, name, village, and current total dues.
- The selected customer's compact summary appears beside the mobile lookup. Staff may enter quintals and remaining kilograms together (for example, 40 quintals and 20 kg), and may override the crop's default per-quintal rate for an individual entry. The combined quantity is normalized to quintals before calculation.
- Grading service date and record creation date are separate. Staff may select historical service dates when backfilling the client's previous two years of entries; the immutable creation timestamp is generated automatically when the record is entered into the system.
- Grading entry creation uses a receipt-review confirmation step. Form validation opens a complete preview without writing an entry; staff may return to edit, and the entry is persisted only after explicit final confirmation.
- Staff may edit their own entries only through a reason-required revision flow. Original values and every revision must remain auditable; edits must not silently replace financial history.

## Confirmed role workspaces

### Administrator

- Dashboard shows business summaries and recent activity appropriate to implemented modules.
- Staff provides a searchable, paginated staff table and administrator-only staff account creation.
- Each staff name links to a dedicated detail page containing account details, total entry counts, and that staff member's paginated entry history.
- Customers provides a searchable, filterable, paginated table. Each customer name links to a dedicated customer detail page.
- Grading Settings lets administrators create crops, configure cleaning rates, and enable or disable crops.
- Entries contains Grading and Seed Sale tabs. The grading table includes the staff member, customer, date, calculated amount, paid amount, due amount, payment mode, and status.

### Staff

- New Entry is the landing page after sign-in and contains Grading and Seeds tabs.
- The Grading tab renders the grading form directly on the page.
- The staff workspace uses a compact sidebar and entry form so daily entry work retains maximum usable space.
- If an exact 10-digit mobile number has no customer match, staff can create and immediately select that customer from the grading form.
- My Entries lists only entries created by the signed-in staff member.
- Staff can revise their own entries with a mandatory reason and complete revision history.
- Staff cannot manage staff accounts, browse or edit customers globally, grading settings, or all-business entry views. Their customer permission is limited to creating a customer during entry capture.

### Dues

- The backend ledger is the authoritative customer balance for grading charges, payments, reversals, and adjustments.
- Seed-sale charges, payments, waivers, and reversals post to the same authoritative customer ledger.
- A user may explicitly waive a positive remainder up to ₹10. The bill and payment values remain unchanged; a separately attributed ledger adjustment clears the remainder. Larger balances remain due, and reversing a linked payment also reverses its waiver.

## Approved architecture direction

- Monorepo: `apps/frontend`, `apps/backend`, `apps/desktop`, `packages/shared`, `docs`, `infrastructure`, and `scripts` as they become necessary in an approved phase.
- Frontend: React + TypeScript + Tailwind, shared by web/PWA/Electron.
- Desktop: thin Electron main/preload boundary; no unrestricted Node APIs in the renderer and no desktop-only dependency in shared UI.
- Backend: Node.js + TypeScript + Express 5 modular monolith with versioned `/api/v1` routes.
- Data: PostgreSQL + Prisma, stable internal relationship IDs, separate human-facing identifiers, migrations that preserve production data.
- Sessions: backend-enforced authentication/authorization, secure password/PIN hashing, and preferably server-side sessions in HTTP-only secure cookies.
- Integrations: provider abstractions for payments, SMS, and WhatsApp.
- Deployment: HTTPS reverse proxy, frontend, backend, and persistent PostgreSQL; Docker for backend/database; documented backup and restore strategy.

Business modules must own their routes, controllers, services, schemas, types, and tests. Shared infrastructure may centralize configuration, database access, errors, middleware, logging, and validation mechanics. Do not put business logic in UI components, Electron, or giant shared services.

## Validation policy (Zod)

Zod is the runtime-validation standard. TypeScript types alone are not validation.

- Validate all untrusted boundaries: environment variables at startup; API path/query/body/cookie inputs; file/import data; webhook payloads; and responses from payment/notification providers.
- Keep schemas close to the owning domain module. Put genuinely shared primitives and intentional API contracts in `packages/shared`; do not turn it into a dumping ground or expose Prisma/database models to clients.
- The backend remains authoritative. Frontend validation is for immediate UX and may reuse safe shared input contracts, but it never replaces server validation.
- Derive static types with `z.infer` rather than maintaining duplicate interfaces.
- Use strict object schemas for mutation inputs so unknown fields are rejected. Define coercion/transforms deliberately and test the accepted wire format.
- Normalize only after successful parsing. Keep raw input, normalized values, and persistence types conceptually distinct where that prevents ambiguity.
- Represent API money/quantity values with an explicitly agreed decimal strategy; never rely on binary floating-point for financial calculations. Prisma `Decimal` stays behind the backend boundary.
- Use one validation middleware and a stable, field-addressable validation-error response. Do not expose internal stack traces or secrets.
- Add success, boundary, malformed-input, unknown-field, normalization, and cross-field/refinement tests for each important schema.

Indian mobile numbers are stored as exactly 10 ASCII digits without `+91`, spaces, or punctuation. A shared Zod primitive and database constraints enforce this format.

## Data consistency invariants

- Stock is derived from auditable movements such as purchase, sale, return, and adjustment—not only a mutable balance field.
- Multi-record operations (for example bill + items + payment + ledger entry + stock movements) commit in a single database transaction.
- Financial and ledger history is never silently edited; corrections use explicit adjustment or reversal flows.
- Important actions create audit records without secrets or authentication credentials.
- Internal IDs are stable; display/bill/receipt numbers are separate identifiers.

## Phase sequence

1. Foundation
2. Database foundation and reviewed schema
3. Authentication and authorization
4. UI foundation
5. Customers
6. Grading and cleaning
7. Role workspaces and staff management
8. Grading settings and auditable entry revisions
9. Payments, dues, and ledger
10. Seed requirements review
11. Seed management and stock
12. Seed billing
13. Payment accounts and dynamic QR
14. SMS and WhatsApp
15. Admin reports
16. Receipts and printing
17. Security and testing hardening
18. Production deployment

Each phase requires explicit approval, repository inspection, scoped implementation, applicable verification, a change report, and a review stop. Architecture can prepare extension points, but future features must not be implemented early.

## Confirmed foundation decisions

- Use Vite to build the shared React application.
- The application UI is English-only. Internationalization infrastructure is not required unless a later phase explicitly adds another language.
- Use a conventional thin Electron shell around the Vite application, packaged with `electron-builder`.
- Production deployment will happen on a VPS after application development. Foundation work should remain VPS-provider-neutral, while preserving a clean Docker-based deployment path.
- Use npm workspaces and the pinned Node.js 22 LTS baseline.

Local PostgreSQL is exposed on port `5433` because port `5432` was already occupied on the development machine. PostgreSQL continues to use port `5432` inside its container.

## Decisions to settle before their owning phases

- Indian mobile storage/normalization: recommended canonical `+91XXXXXXXXXX`, while accepting a deliberately limited set of local input forms.
- Lock-screen behavior and whether a later phase should optionally support staff PINs. Phase 3 uses passwords and 12-hour server-side sessions by default.
- Business timezone and financial-day cutoff (likely `Asia/Kolkata`, but must be confirmed).
- Currency/rounding, quantity precision, units, taxes, discounts, due/partial-payment behavior, cancellation/reversal permissions, and numbering formats.
- Grading supports an immediate payment amount and an outstanding due. The ledger phase will make cross-module balances authoritative.
- Seed billing supports staff discount overrides and multi-item bills. Returns and taxes remain deferred.
- Payment, SMS, and WhatsApp providers; online-payment verification/webhook behavior.
- Receipt paper sizes, printer types, PDF requirements, and offline/PWA expectations.
- Production hosting, domain, backup retention, and restore objectives.

## Phase completion report

For every implemented phase, report: implemented scope, files created/changed, commands run, typecheck/lint/test/build results, known issues, and deferred decisions. Never continue into the next phase automatically.
