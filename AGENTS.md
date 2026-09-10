# Dhakad Grading Plant — Repository Instructions

## Source of truth

- Read `docs/project-context.md` before planning or changing the project.
- The product is a crop grading/cleaning plant business-management system, not machinery-control software.
- Use a TypeScript monorepo with one shared React UI for web, PWA, and the Electron shell; an Express 5 modular-monolith API; Prisma; and PostgreSQL.

## Phase gate

- Work on one explicitly approved phase only.
- At the start of every phase, inspect the repository and existing documentation.
- Do not implement later-phase business modules or speculative infrastructure.
- Stop after completing and verifying the approved phase. Report changes and wait for review.
- Preserve working code and update documentation when a decision changes.

## Engineering constraints

- Use strict TypeScript and focused domain modules.
- Keep business rules and authorization in the backend. Electron is a thin, secure shell.
- Validate every external boundary with Zod according to `docs/project-context.md`.
- Use database transactions for multi-record financial or stock mutations.
- Keep stock, ledger, payment, notification, and audit histories append-oriented; use adjustments/reversals instead of silently rewriting history.
- Never hard-code secrets or couple business modules directly to payment/notification providers.
- Do not claim a phase complete unless its applicable typecheck, lint, tests, and builds pass.
