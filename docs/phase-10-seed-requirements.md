# Phase 10 — Seed Requirements Review

Status: requirements confirmed and review completed on 2026-09-10. No Phase 11 database or
application implementation is included in this phase.

## Confirmed business workflow

- The owner/administrator directly creates and manages the seed catalog and stock. Supplier,
  vendor, purchase-order, and purchase-bill workflows are not required.
- A seed has one required display-name field. It may contain Hindi, English, or both; separate
  translation fields are not required.
- Every seed has an administrator-configurable type/category, selling rate, stock quantity,
  default sale discount, low-stock threshold, and active/inactive status.
- Stock may be entered, displayed, adjusted, and sold in grams, kilograms, or quintals.
- Administrator actions configure products, types, rates, discounts, stock, and availability.
- Staff may use active seeds during the later seed-sale workflow but cannot configure the catalog
  or directly change stock.
- Deactivated seeds remain in history and cannot be selected for new sales or positive stock entry.

## Quantity and unit rules

All persisted stock quantities normalize to whole grams:

- `1 kilogram = 1,000 grams`
- `1 quintal = 100 kilograms = 100,000 grams`
- Gram input must be a positive whole number.
- Kilogram input supports up to three decimal places.
- Quintal input supports up to five decimal places.
- Every conversion must resolve to a whole number of grams. Inputs below one gram are rejected.
- API responses include normalized grams and may include a user-friendly converted display value.
- A stock or sale record snapshots the entered quantity and unit as well as normalized grams, so
  receipts and audit history reproduce what the user entered.

The selling rate is stored per kilogram. The UI may accept/display a derived gram or quintal rate,
but backend calculation first normalizes quantity to grams and uses exact decimal arithmetic.

## Seed catalog

The existing `ProductCategory`, `Product`, and `ProductVariant` foundation remains preserved:

- `ProductCategory` is the administrator-configurable seed type/category.
- `Product` is the seed shown in the application and contains its single display name, optional
  stable product code, category, and active status.
- Each product uses one internal default variant unless a later explicitly approved requirement
  introduces meaningful variants. Staff and administrators are not exposed to unnecessary variant
  management in Phase 11.

Phase 11 adds catalog settings owned by the sellable seed item:

- selling rate per kilogram;
- default discount type: none, fixed rupees, or percentage;
- default discount value;
- low-stock threshold normalized to grams;
- created/updated timestamps and the administrator attribution required by audit records.

Names are trimmed, cannot be blank, and are unique case-insensitively. Product codes are optional,
stable, unique when present, and never used as relationship identifiers.

## Discount rules

- The administrator configures an optional default discount for each seed.
- Supported defaults are a fixed rupee amount or a percentage.
- A percentage must be between 0 and 100. A fixed discount cannot exceed the gross line amount.
- Phase 12 will confirm whether staff may reduce or override the configured default during a sale.
- A sale snapshots the rate, discount type, discount value, gross amount, discount amount, and net
  amount. Later catalog changes never rewrite prior sales.
- Money calculations use decimal arithmetic and round to two decimal places only at the agreed
  billing boundary.

## Stock ownership and history

Stock is derived from append-only `SeedStockMovement` records; it is not maintained only as an
editable balance field.

Phase 11 movement reasons are:

- `OPENING_STOCK` — the administrator's first recorded quantity;
- `STOCK_ADDED` — later stock entered by the administrator;
- `ADJUSTMENT_INCREASE` — reason-required correction adding stock;
- `ADJUSTMENT_DECREASE` — reason-required correction removing stock;
- `SALE` — reserved for Phase 12 and linked to a sale line;
- `SALE_REVERSAL` — reserved for Phase 12 cancellation/reversal;
- `CUSTOMER_RETURN` — deferred to the Phase 12 sale/return decision.

Each movement stores product, signed normalized grams, entered quantity and unit, reason/type,
optional note, responsible user, immutable creation time, and any future sale-line link. Stock may
not become negative. Multi-record sale or reversal effects must commit in one database transaction.

Administrators do not edit or delete movements. Mistakes are corrected with an attributed reverse
movement. Catalog deactivation never deletes products or stock history.

## Phase 11 administrator experience

The Seed Management workspace will provide:

- compact, searchable, filterable, paginated seed table;
- 10, 20, and 50 row-count options inside the table panel;
- seed name, type, rate per kilogram, available stock, low-stock state, discount, and status;
- add/edit/deactivate controls;
- direct opening/add-stock action using gram, kilogram, or quintal input;
- reason-required stock correction action;
- dedicated seed detail route containing settings and paginated stock movement history;
- clear zero-stock and low-stock highlighting.

The available balance is always calculated from movements. The UI may show a computed balance for
speed, but the append-only movement history remains authoritative.

## Boundary validation and authorization

- Shared Zod contracts validate seed names, category IDs, product codes, rates, discount values,
  stock thresholds, quantities, units, status filters, and pagination.
- Mutation schemas are strict and reject unknown fields.
- Backend authorization restricts catalog and manual stock mutations to `ADMIN`.
- Database checks reject blank names, negative rates, invalid discounts, zero movements, malformed
  normalized quantities, and unsupported units even when writes bypass the API.
- Important catalog/status/stock actions create audit records without secrets.

## Initial reference data

Phase 11 will preserve existing seed-category/product records and use idempotent upserts for the
approved initial seed catalog. Running the seed command must never delete products, reset stock, or
rewrite business history.

## Deferred to Phase 12 — Seed billing

- customer selection and sale receipt-review flow;
- one or multiple seed lines per bill;
- final staff discount-override permission;
- payment, partial payment, dues, and small-balance waiver behavior;
- bill numbering, cancellation, return/exchange rules, and stock reversal links;
- posting seed charges/payments to the authoritative customer ledger;
- taxes, if the business confirms that they are required.

Phase 12 must reuse the confirmed stock model and perform bill, lines, payment, ledger, and stock
movements in one transaction. It must not silently mutate prior financial or stock history.

## Phase completion report

- Implemented scope: requirements review and documented Phase 11/12 boundaries only.
- Files added/changed: this document, `docs/project-context.md`, and
  `docs/role-workspaces-and-entry-flow.md`.
- Database/application changes: none.
- Verification: repository formatting check passed.
- Known issues: the exact initial seed catalog values, rates, categories, discounts, opening stock,
  and low-stock thresholds must be entered during Phase 11; no defaults are invented here.
- Review stop: Phase 11 requires explicit approval before implementation.
