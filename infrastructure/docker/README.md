# Docker infrastructure

The root `docker-compose.yml` remains the fast local-development PostgreSQL service. Backend and
frontend development processes run through `npm run dev` for hot reload.

Production uses `compose.production.yml`: Caddy, frontend Nginx, Express backend, a one-shot Prisma
migration service, and private PostgreSQL. See `infrastructure/deployment/README.md` for deployment,
backup, restore, and operations commands.
