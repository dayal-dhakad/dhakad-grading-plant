# Dhakad Grading Plant

Production-oriented business management for a crop grading and cleaning plant. Phase 1 contains technical foundation only.

## Architecture

- `apps/frontend`: shared React/Vite web and PWA application
- `apps/backend`: Express 5 API and Prisma/PostgreSQL connection
- `apps/desktop`: secure Electron shell loading the shared frontend
- `packages/shared`: intentional cross-application contracts

The backend and database are authoritative. Business modules are intentionally absent.

## Setup

Use Node 22.12+, npm 10+, and Docker Desktop. Run `npm install`, copy `.env.example` to `.env` and `apps/backend/.env.example` to `apps/backend/.env`, then run `npm run db:up`, `npm run prisma:generate`, and `npm run dev`.

Frontend runs at `http://localhost:5173`; backend defaults to port 3000. Vite proxies `/api` to the backend during development.

## Commands

- `npm run dev`: frontend and backend
- `npm run dev:desktop`: backend, frontend, and Electron
- `npm run db:up` / `npm run db:down`: start/stop PostgreSQL without deleting its named volume
- `npm run prisma:generate` / `npm run prisma:validate`: Prisma validation and client generation
- `npm run db:migrate:deploy`: safely apply pending migrations
- `npm run db:seed`: idempotently load approved reference data
- `npm run db:studio`: visually inspect the database
- `npm run user:create-admin -w @dhakad/backend`: create the first administrator from bootstrap environment variables
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: verification
- `npm run package -w @dhakad/desktop`: Windows installer

`VITE_API_BASE_URL` defaults to `/api/v1`. Local PostgreSQL is exposed on port `5433`. Never commit `.env` files or real credentials. The PWA caches build assets only; API caching and offline transactions are not configured.
