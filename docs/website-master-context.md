# Dhakad Grading Plant — Website Master Context

Last reviewed against the repository: 20 October 2026

## Purpose of this document

This is the consolidated product, feature, content, and design brief for creating a website or
rebuilding the application interface for Dhakad Grading Plant. It is written so that a designer,
developer, or AI website builder can understand the software without reading the whole repository.

The authoritative engineering and business record remains `docs/project-context.md` plus the
individual phase documents in `docs/`. If this brief conflicts with those documents or the working
code, inspect the source and update this file rather than guessing.

Do not put credentials, private customer data, staff passwords, provider API keys, database URLs,
or values copied from `.env` files into a website or generated source code.

## Product in one sentence

Dhakad Grading Plant is a practical business-management system for a crop grading and cleaning
plant, covering daily grading entries, customers, dues and payments, seed sales and stock,
expenses, workers, receipts, reports, notifications, and administrative oversight.

It is not software for controlling grading machinery, motors, sensors, or industrial equipment.

## Product goals

- Replace paper-heavy daily record keeping with fast, reliable digital entry.
- Give the owner a clear view of sales, collections, dues, expenses, stock, staff activity, and
  business performance.
- Let staff complete common counter workflows with minimal typing.
- Keep financial, stock, and revision history auditable instead of silently overwriting it.
- Produce clear receipts suitable for customers and the local operating environment.
- Work from the same React interface on the web, as a PWA, and inside a Windows desktop app.

## Users and operating environment

The product serves a local/village agricultural business in India. Customers are farmers and
other buyers who commonly identify themselves by mobile number. Operators may use desktop or
mobile screens during a busy workday.

There are exactly two application roles:

### Administrator

The owner or trusted manager. Administrators have business-wide access, manage configuration and
staff, inspect all records, send reminders, view reports, and request exports.

### Staff

Counter or plant staff who create daily transactions. Their workspace is deliberately narrower:
new grading entries, their own entries and revisions, customer payments, and expenses they
personally recorded.

Payment-receiving accounts are business accounts, not application users.

## Business identities

The software supports two related transaction identities:

- Grading and cleaning receipts are issued under **Dhakad Grading Plant**.
- Seed-sale invoices are issued separately under **RCP EXIM PRIVATE LIMITED** and use its own logo,
  address, IEC, support number, invoice notes, and bank details.

Do not blend these identities on transaction documents. Exact legal/contact copy must come from
approved business data or the existing receipt components; do not invent it.

## Experience and visual direction

The interface should feel trustworthy, straightforward, fast, and grounded in an agricultural
business—not like a trading terminal or machinery dashboard.

- Use large readable controls, plain English, clear labels, and strong contrast.
- Minimize typing and prioritize mobile-number-first customer lookup.
- Use responsive layouts suitable for desktop counters and mobile devices.
- Keep dense tables compact, but place them inside bordered white panels with readable spacing.
- Emphasize names, record numbers, financial totals, outstanding dues, and statuses.
- Use obvious success, warning, validation, loading, empty, and error states.
- Use an earthy green/stone visual family consistent with the current product branding.
- Support Hindi/Devanagari in customer, village, address, crop, and exported data even though the
  application interface itself is English-only.
- Avoid machinery-control imagery, technical gauges, fake live sensor values, and generic
  corporate claims.

The repository contains approved visual assets in `apps/frontend/public/icons/`, including the
Dhakad logo, RCP EXIM logo, PWA icons, and reminder image.

## Information architecture

### Public surface

- Login at `/login`.
- Secure public grading receipt link at `/receipts/grading/:token`.
- A public seed receipt implementation exists in the codebase but its route is currently disabled.
- Public receipt tokens are random and unguessable; a receipt page exposes only receipt data and
  never grants an authenticated application session.

### Administrator workspace

Current active navigation:

1. Dashboard
2. Entries
3. Payments
4. Expenses
5. Workers
6. Customers
7. Staff
8. Reports
9. Grading Settings
10. Payment Accounts
11. Exports

Seed and stock screens exist in the repository, but their current frontend routes and navigation
are commented out. Treat them as implemented product capability that is temporarily not exposed
in the active UI, and verify the intended release state before publishing or rebuilding them.

### Staff workspace

1. New Entry
2. My Entries
3. Payments
4. Expenses

New Entry is the staff landing page after sign-in.

## Complete feature inventory

### Authentication and authorization

- Dedicated login route with mobile/password-based user authentication.
- Backend-enforced sessions and role authorization.
- Unauthenticated workspace access redirects to login.
- Authenticated users are sent to the landing page for their role.
- Administrator-only and staff-scoped operations are enforced by the API, not merely hidden in
  the interface.
- Logout is always available in the application shell.

### Dashboard

- Administrator overview of relevant business totals and recent activity.
- Summary of active grading activity and, when exposed, seed-sale activity.
- Standalone customer payments recorded by administrators are shown separately for the selected
  period.
- Expense areas are separated into Grading, Seeds, and Admin personal where applicable.

### Customers

- Create and manage customer records with a canonical 10-digit Indian mobile number.
- Search, filter, paginate, and open a dedicated customer detail page.
- Customer details include identity/contact information, status, authoritative dues, and related
  transaction history.
- Mobile-number lookup is central to transaction entry.
- If staff enter an exact unmatched 10-digit number during entry, they can create and immediately
  select the customer.
- WhatsApp transaction consent defaults on; staff can turn it off when a customer opts out.
- SMS consent defaults off and must be explicitly obtained.
- Customer history supports notification and due-reminder workflows.
- Administrators can request a filtered background PDF customer-directory export.

### Grading and cleaning

- Administrators manage crops, per-quintal cleaning rates, and active/inactive state.
- Crop names can contain Hindi/Devanagari.
- Staff create a grading record by selecting a customer, crop, service date, quantity, rate,
  payment mode, amount paid, and optional notes.
- Quantity supports quintals plus remaining kilograms and is normalized for calculation.
- Staff may override a crop's default rate for an individual entry.
- Service date is separate from the immutable record-creation timestamp, enabling historical
  back-entry.
- Validation occurs when the operator selects Review receipt, not while every field is typed.
- A full receipt preview is shown before the record is committed.
- Cash, Online, and Due payment modes have distinct behavior; Due sets amount paid to zero.
- Online payments require an active receiving account.
- A payment may cover the new charge plus existing customer dues but cannot create customer credit.
- A positive remainder can be explicitly waived through a separately attributed ledger adjustment.
- Saved forms reset to defaults and show a temporary success message containing the record number.
- Staff can revise only their own entries. A reason is mandatory and before/after values remain
  auditable.
- Entries can be cancelled/reversed through controlled reason-bearing flows.
- Admin lists support customer/staff search, inclusive service-date filters, status, pagination,
  receipt printing, history, and cancellation actions as authorized.

### Payments, dues, and customer ledger

- One append-oriented customer ledger is the authoritative balance for grading charges, seed
  charges, payments, waivers, reversals, and adjustments.
- Staff and administrators can record standalone payments against a customer's outstanding dues.
- Payment methods include Cash, Online, and transaction-specific Due handling.
- Online payments retain the selected business receiving account.
- Payments cannot create customer credit.
- Reversing a payment records the actor, time, and mandatory reason; linked waivers are reversed as
  needed.
- The interface must show loading and error states instead of displaying a false zero balance.
- Administrators can filter payments by recorder (admin, staff, or everyone).
- Printable customer-payment receipts are supported.

### Payment accounts and UPI QR

- Administrators create and edit UPI receiving accounts and activate/deactivate them.
- Exactly one account may be the default; selecting a new default clears the old one atomically.
- Historical accounts are retained rather than deleted.
- Staff select an active account for online transactions.
- The UI can generate a scannable exact-amount `upi://pay` QR with payee, account-holder name,
  amount in INR, and optional reference.
- QR generation does not verify payment. The operator must confirm that funds were received.
- Automatic bank verification, webhooks, settlement imports, refunds, and reconciliation are not
  part of the current product.

### Seed catalog, stock, and billing

Implementation exists for these capabilities, though active frontend exposure must be confirmed:

- Each seed variety is a separate product, such as Chia Black; the category/type is fixed to Seeds.
- Product fields include name, optional code, selling rate per kilogram, default discount, active
  state, and optional opening stock.
- Quantities support grams, kilograms, and quintals with deliberate precision and conversion.
- Stock is derived from append-only movements, not a silently editable balance.
- Business actions are Add stock, Correct to actual balance, and Minus stock for stock sold or used
  outside the system.
- Seed bills can contain multiple distinct items.
- The operator may override rates and discounts subject to backend validation.
- Review validates duplicates, quantity precision, positive rates, discounts, available stock,
  payment ceiling, and waiver eligibility before showing a receipt preview.
- GST is added after item discounts. The current configured rate is 5%, and every bill snapshots
  its GST rate and amount so later changes do not rewrite history.
- Saving a bill, ledger activity, payment, and stock movements is transactional.
- Staff revisions require a reason and retain revision history.
- RCP EXIM branding is used for seed invoices.

### Expenses

- Authenticated users can record an expense with date, amount, area, category, optional paid-to
  name, and optional notes.
- Expense areas are Grading, Seeds, and Admin personal.
- Staff may record Grading and Seeds expenses only and see only their own records.
- Administrators see the business-wide list, can record Admin personal expenses, and can edit
  expenses.
- Edits require a reason and store append-only before/after snapshots.
- The list supports date/category filters, totals, and pagination.
- Current categories include Electricity bill, Machine parts, Tea / refreshments, and Other; Other
  requires a descriptive name. A legacy Worker payment category is retained only for old records.
- Receipt uploads, deletion/cancellation, expense payment-account tracking, and custom category
  administration are not currently included.

### Workers and worker payments

- Administrators manage workers with name, optional 10-digit mobile number, and notes.
- Cash or online payments can be recorded independently from general expenses.
- Worker detail pages show total paid and paginated payment history.
- Payments are append-oriented and retain the administrator who recorded them.
- Worker-payment corrections and reversals are deferred.

### Staff management

- Administrators create staff accounts in a modal.
- Staff can be searched and paginated.
- Selecting a staff name opens a dedicated detail page.
- The detail page shows account information, total entry counts, and paginated entry history.
- Staff cannot manage other users or access business-wide administration.

### Reports

- Administrator-only reporting with inclusive service-date filters.
- Grading: active entry count, quantity in quintals, charges, payments, waivers, and cancellations.
- Seeds: active bill count, quantity in kilograms, gross sales, discounts, net sales, GST-related
  bill totals, payments, and cancellations as provided by current contracts.
- Collections: grading-entry, seed-bill, and standalone-payment sources without counting reversed
  or cancelled transactions as active collections.
- Breakdowns by cash, online, receiving account, source, and staff member.
- Paid amounts incorrectly associated with Due are flagged as “mode needs review,” never guessed.
- Current customer dues come from the authoritative ledger.
- Current seed stock comes from stock movements.
- Expense totals and an estimated grading margin are available.
- Period activity and all-time balances are intentionally distinguished and may not reconcile by
  simple subtraction.
- Validated UTF-8 CSV export exists at the API/reporting level; the background export flow provides
  report PDFs where enabled by the current UI.

### Receipts and printing

- Grading, seed sale, and customer-payment receipt designs exist.
- Formats: A4 and 80 mm thermal.
- Receipts display record identity, customer details, dates, line/transaction information, totals,
  paid and due values, payment mode, receiving account, and status.
- Values come from authoritative API responses and are not recalculated in the browser.
- Print CSS removes application navigation and controls.
- Browser-native printing supports physical printing and Save as PDF across web, PWA, and Electron.

### Notifications

- An asynchronous append-oriented outbox records notifications and bounded retries; provider
  failure does not roll back a transaction.
- Automatic events cover grading creation/cancellation, seed-bill creation/cancellation, customer
  payment receipt/reversal, and revised transaction confirmations.
- SMS uses MSG91; WhatsApp currently uses verified Fast2SMS templates.
- Grading confirmations use a verified Hindi template; seed confirmations use an English template.
- Administrators can send individual or bulk WhatsApp due reminders to customers with positive
  ledger balances.
- Administrator-initiated WhatsApp due reminders are permitted independently of the stored
  automatic-transaction consent flag. SMS reminders and automatic messages honor consent.
- History records channel, event, template, preview, attempts, provider ID, status, error, creator,
  and timestamps.
- Live provider delivery verification and delivery callbacks remain environment-specific work.

### Background PDF exports

- Administrators request exports; jobs move through Pending, Processing, Ready, or Failed.
- Customer-directory exports honor current search/status filters but not table pagination.
- Grading-entry exports honor search and inclusive service-date filters and include active and
  cancelled records.
- Report exports use the same private background workflow.
- Large customer reads are batched.
- Generated PDFs are stored in PostgreSQL so they survive backend restarts.
- Download access is private to the administrator who requested the file.
- PDFs embed Noto Sans Devanagari and use repeating table headings.

### Web, PWA, and desktop delivery

- One responsive React interface is shared by the browser, installable PWA, and Electron shell.
- The PWA caches build assets only; offline API transactions are not supported.
- Electron is a thin secure wrapper and does not expose unrestricted Node.js access to the UI.
- A Windows installer can be packaged with Electron Builder.

## Key workflows

### Staff records a grading transaction

1. Sign in and land on New Entry.
2. Search for a customer by 10-digit mobile number or create a new customer if none exists.
3. Review the selected customer's name, village, mobile number, and current dues.
4. Choose crop and service date; enter quintals/kilograms and confirm or override the rate.
5. Choose Cash, Online, or Due; select a receiving account for Online; enter paid/waived values as
   allowed.
6. Select Review receipt and resolve all validation messages.
7. Review the complete receipt and explicitly confirm.
8. The backend commits all related records transactionally, queues eligible notifications, resets
   the form, and shows the new receipt number.

### Staff records a customer payment

1. Find and select the customer.
2. Load the authoritative combined ledger balance.
3. Enter a payment no greater than the outstanding balance and optionally waive a remainder.
4. Select Cash or Online, choosing an active receiving account for Online.
5. Confirm, issue a receipt, and let the backend append payment/ledger records atomically.

### Administrator reviews the business

1. Open Dashboard for summary and recent activity.
2. Use Entries, Payments, Expenses, and Workers for operational detail.
3. Open Reports and choose an inclusive date range.
4. Review activity, collections, waivers, dues, expenses, margins, stock, and exceptions.
5. Export validated CSV or request a private background PDF where supported.

## Core business rules

- The backend is authoritative for calculations, permissions, balances, and business rules.
- Money must use decimal-safe handling, never binary floating-point arithmetic.
- Indian mobile numbers are stored as exactly 10 ASCII digits without `+91`, spaces, or punctuation.
- Multi-record financial and stock changes use database transactions.
- Ledger, stock, payment, notification, revision, and audit histories are append-oriented.
- Corrections use revisions, adjustments, cancellations, or reversals rather than deletion or
  silent rewriting.
- Historical records snapshot rates, tax, amounts, and account references needed to preserve their
  original meaning.
- Internal relationship IDs are separate from human-facing receipt, bill, and entry numbers.
- External inputs and provider responses are validated with strict Zod schemas.

## Table and form behavior

- Names in tables link to dedicated detail pages; details do not expand below a row.
- Detail pages preserve normal browser/app back navigation.
- Pagination remains inside the table panel, including on one-page results.
- Standard page sizes are 10, 20, and 50 rows.
- Service-date filters are inclusive and are applied before pagination.
- Row actions use separately labelled accessible icons.
- Required labels have an asterisk.
- Editable money fields accept digits and one decimal point with at most two decimal places.
- Loading, failure, no-results, disabled, and successful states must be explicit.
- Destructive or reversal actions require confirmation and a reason where the domain requires it.

## Suggested public marketing website structure

If this context is used to build a public-facing marketing site rather than the authenticated
application, use this structure:

### Home

- Hero: “Run your grading plant with clearer records and faster daily entry.”
- Short supporting copy about grading, customers, payments, dues, expenses, and reports in one
  system.
- Primary CTA should be approved by the business owner (for example, Request a demo or Sign in).
- Product screenshot/mockup area using representative demo data only.

### Features

- Fast grading entry
- Customer and dues ledger
- Payments and UPI QR
- Receipts and printing
- Expenses and workers
- Reports and exports
- Seed sales and stock, only if the business confirms this capability should be publicly promoted
- WhatsApp/SMS updates, described carefully because live delivery depends on configured providers

### How it works

Show a simple sequence: find customer → record service/sale → collect or track due → print/send
receipt → review reports.

### Built for daily plant work

Explain large controls, mobile lookup, historical entry dates, English UI with Devanagari data
support, responsive access, and role-based workspaces.

### Security and reliability

Describe role-based access, server-side validation, auditable history, transaction-safe accounting,
private exports, and secure sessions. Avoid absolute claims such as “unhackable” or “guaranteed.”

### Contact / access

Use owner-approved contact details only. Do not infer an address, email, phone number, service area,
pricing, customer count, uptime figure, testimonial, or legal certification.

## Content rules for generated websites

- Use INR (`₹`) for illustrative monetary examples.
- Clearly mark sample customers, totals, and charts as demo data.
- Never generate fake testimonials, partner logos, usage metrics, or awards.
- Do not claim machinery automation, AI crop grading, sensor integration, automatic payment
  verification, offline transaction sync, or inventory forecasting.
- Do not expose internal API routes, environment names, receipt tokens, database details, or admin
  capabilities on a public marketing page unless there is a specific reason.
- Do not advertise seed screens as currently available without verifying their active release state.
- Do not claim SMS/WhatsApp delivery is production-verified until the environment-specific checks
  are complete.
- Keep Dhakad Grading Plant and RCP EXIM invoice identities distinct.

## Technical architecture

- Monorepo managed with npm workspaces and Node.js 22 LTS.
- Frontend: React, TypeScript, Vite, and Tailwind; one UI for web/PWA/Electron.
- State/API access follows the existing frontend service layer.
- Backend: Node.js, strict TypeScript, Express 5 modular monolith, versioned `/api/v1` routes.
- Validation: Zod at every external boundary.
- Database: PostgreSQL with Prisma and data-preserving migrations.
- Desktop: secure Electron main/preload boundary and Electron Builder packaging.
- Production: HTTPS reverse proxy, containerized frontend/backend/database workflow, persistent
  PostgreSQL, and documented backup/restore procedures.
- Local PostgreSQL is exposed on port 5433; it uses 5432 inside its container.

Domain modules own their routes, schemas, services, contracts, and tests. Business logic belongs in
the backend, not in React components or Electron.

## Current implementation status and caveats

- Phases 1–13 and 15–21 are recorded as implemented and locally verified in the main project
  context.
- Phase 14 notification code is implemented; verified WhatsApp templates exist, but live provider
  delivery/callback verification remains environment-specific.
- Phase 18 production deployment code and documentation exist, while VPS/domain rollout remains
  environment-specific operational work.
- Seed management, stock, billing, invoices, and related code exist, but current frontend routes
  and navigation for seed features are disabled in the checked repository state.
- Offline API transactions are not supported.
- Automatic payment verification and bank reconciliation are not supported.
- The application is English-only; stored/displayed business data may use Devanagari.
- The product's business timezone/day cutoff still needs a definitive documented decision. Current
  reporting mixes stored service dates with UTC boundaries for standalone-payment timestamps as
  described in the reports phase document.
- The production frontend build has historically reported a non-blocking JavaScript chunk-size
  warning.

## Source map for deeper implementation detail

- `docs/project-context.md`: primary project source of truth and decisions.
- `docs/phase-2-schema-proposal.md`: core data model foundation.
- `docs/phase-3-authentication.md`: authentication and sessions.
- `docs/phase-5-customers.md`: customers.
- `docs/phase-6-grading-cleaning.md`: grading workflow.
- `docs/phase-8-grading-settings-revisions.md`: crop settings and revision history.
- `docs/phase-9-payments-ledger.md`: payments, dues, and ledger.
- `docs/phase-10-seed-requirements.md` through `docs/phase-12-seed-billing.md`: seeds and billing.
- `docs/phase-13-payment-accounts-dynamic-qr.md`: payment accounts and QR.
- `docs/phase-14-msg91-notifications.md`: notification behavior and operational caveats.
- `docs/phase-15-admin-reports.md`: reporting definitions.
- `docs/phase-16-receipts-printing.md`: receipts and print formats.
- `docs/phase-17-security-testing-hardening.md`: security controls.
- `docs/phase-19-expenses.md`: expenses.
- `docs/phase-20-workers.md`: workers and worker payments.
- `docs/phase-21-customer-exports.md`: background PDF exports.
- `apps/frontend/src/app/router/AppRouter.tsx`: currently active application routes.
- `apps/frontend/src/components/AppShell.tsx`: currently active role navigation.
- `apps/backend/prisma/schema.prisma`: implemented persistent data model.

## Handoff checklist before building a public website

Confirm these items with the business owner before publishing:

- Website purpose: public marketing site, authenticated application redesign, or both.
- Approved domain, address, contact number, email, and service area.
- Final logo choices, colors, business photographs, and permission to use them.
- CTA: sign in, request demo, call, WhatsApp, or visit the plant.
- Whether seed sales/stock should be publicly advertised and re-enabled in the application UI.
- Which screenshots may be shown and how all personal/business transaction data will be anonymized.
- Whether pricing, testimonials, legal details, GST details, IEC, bank details, or WhatsApp numbers
  should appear publicly.
- Privacy policy, terms, cookie behavior, and any required legal notices.
- Confirmed business timezone and reporting-day cutoff.

