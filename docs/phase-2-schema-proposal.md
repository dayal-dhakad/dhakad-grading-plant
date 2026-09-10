# Phase 2 — Core Schema Proposal

Status: approved, implemented, migrated, seeded, and verified on 2026-09-06.

## Scope

Phase 2 should create only the database foundation needed by later reviewed phases:

- `User` and `Role`
- `Customer`
- `Crop`
- `ProductCategory`
- `Unit`
- seed `Product` and its variants
- a safe reference-data seed mechanism
- the initial Prisma migration and schema-level tests/validation

Product batches, suppliers, purchases, stock movements, grading transactions, bills, payments, ledger entries, settlements, notifications, payment accounts, and audit logs remain outside this phase.

## Proposed conventions

- PostgreSQL stores timestamps in UTC; business display and day-boundary calculations use `Asia/Kolkata`.
- Primary keys are UUID database values and never use mobile numbers or display codes.
- All mutable records have `createdAt` and `updatedAt`.
- Reference/master records use `isActive` rather than being deleted after use.
- Mobile values are stored as exactly 10 ASCII digits and protected by database uniqueness constraints. They do not include `+91`, spaces, or punctuation.
- Prisma models remain backend-only. Deliberate API schemas will be created with Zod in their owning feature phases.
- No floating-point field is introduced for money or measured quantities. Their exact decimal precision will be added with the transaction-owning schemas.

## Implemented models

### User

- `id`: UUID primary key
- `mobile`: normalized, unique business login identifier
- `name`: required display name
- `role`: `ADMIN | STAFF`
- `passwordHash`: required password hash prepared for Phase 3; never returned through APIs
- `isActive`: disables access without deleting identity/history
- timestamps

Authentication sessions, login attempts, credential policy, and authorization behavior belong to Phase 3.

### Customer

- `id`: UUID primary key
- `mobile`: normalized and unique
- `name`: required
- `address`: optional
- `village`: required
- `isActive`
- timestamps

### Crop

- `id`: UUID primary key
- `code`: stable, unique reference code
- `name`: required display name
- `cleaningRate`: current cleaning charge using a fixed-precision PostgreSQL decimal
- `isActive`
- timestamps

The initial crop reference data is:

| Crop    | Cleaning rate |
| ------- | ------------: |
| Wheat   |            25 |
| Chana   |            40 |
| Kalonji |            50 |

A crop exists only for grading/cleaning. Its rate can be updated and the crop can be enabled or disabled. Crops must not be reused as sellable seed products.

### Unit

- `id`: UUID primary key
- `code`: stable, unique reference code
- `name`: required display name
- `symbol`: required short display value
- `decimalPlaces`: allowed quantity precision
- `isActive`
- timestamps

### Seed Product and variant

Seed products exist for packaged sales and are independent of grading crops.

`Product` contains:

- `id`: UUID primary key
- `name`: the product family, initially `Quinoa`, `Chia`, and `Z Black`
- optional category
- `isActive`
- timestamps

`ProductVariant` contains:

- `id`: UUID primary key
- `productId`: required product relationship
- `name`: variant name, such as `White Bold` or `Red` for Quinoa
- `code`: optional unique code
- `isActive`
- timestamps

Packaging/batch, purchase cost, selling price, expiry, and stock quantities remain deferred to the inventory phase. A product without meaningful variants may use one explicitly named default variant, avoiding nullable uniqueness and stock ambiguity later.

Unit conversion is intentionally not proposed until actual grading and stock rules are confirmed.

## Database safeguards

- Unique constraints protect 10-digit mobiles and stable reference codes.
- Check constraints reject malformed mobiles, blank required text, negative cleaning rates, and invalid unit precision even when writes bypass Prisma.
- Foreign keys use restrictive deletion behavior for referenced master data; records are deactivated instead.
- Indexes support mobile lookup, names, villages, relations, and active lists.
- Database-generated UUIDs keep identifiers safe outside Prisma.
- Seed logic validates its input with Zod and uses transactional upserts. It never deletes or resets business data.
- Two append-only Phase 2 migrations were applied without resetting the database.
