# Production deployment

The production target is a provider-neutral Ubuntu VPS with Docker Engine and the Docker Compose
plugin. Caddy is the only public service. It obtains and renews TLS certificates, proxies `/api/*`
to Express, and sends all other traffic to the Nginx-hosted React/PWA build. PostgreSQL is reachable
only on the private Compose network.

## Prerequisites

- A VPS with at least 2 vCPU, 4 GB RAM, and adequate SSD storage
- A domain A/AAAA record pointing to the VPS
- Docker Engine with `docker compose`
- Firewall rules allowing SSH, TCP 80, TCP 443, and UDP 443 only
- The repository checked out on the VPS

Do not expose PostgreSQL port 5432 or backend port 3000 publicly.

## First deployment

From the repository root on the VPS:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Set the real domain, a unique long PostgreSQL password, and any notification credentials in
`.env.production`. Then deploy:

```sh
docker compose --env-file .env.production -f compose.production.yml config
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml up -d
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail https://YOUR_DOMAIN/api/v1/health
```

The one-shot `migrate` service runs `prisma migrate deploy` after PostgreSQL becomes healthy. The
backend starts only after migrations succeed. Create the initial administrator after the first
successful deployment (PowerShell users should use their shell's environment syntax):

```sh
BOOTSTRAP_ADMIN_MOBILE=9876543210 \
BOOTSTRAP_ADMIN_NAME='Administrator' \
BOOTSTRAP_ADMIN_PASSWORD='temporary-long-password' \
docker compose --env-file .env.production -f compose.production.yml run --rm \
  -e BOOTSTRAP_ADMIN_MOBILE -e BOOTSTRAP_ADMIN_NAME -e BOOTSTRAP_ADMIN_PASSWORD \
  migrate ./node_modules/.bin/tsx apps/backend/prisma/create-admin.ts
```

Do not store the bootstrap password in `.env.production` or shell history. Change it through the
approved account workflow after first login.

## Releases and rollback

Before each release, create a database backup. Pull the reviewed revision, build it, and start it:

```sh
./scripts/production/backup-database.sh
git pull --ff-only
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml up -d
curl --fail https://YOUR_DOMAIN/api/v1/health
```

Run login, grading-entry, seed-sale, payment, report, receipt, and notification smoke tests. For an
application rollback, check out the previously reviewed revision, rebuild, and start it. Never roll
back code across a non-backward-compatible database migration without following that migration's
documented recovery plan. Restore the database only for actual data recovery.

## Backup and restore

`scripts/production/backup-database.sh` creates a PostgreSQL custom-format dump under
`backups/postgres` and retains 14 days by default. Copy backups to encrypted storage outside the VPS.
A typical root crontab entry is:

```cron
15 2 * * * cd /opt/dhakad-grading-plant && ./scripts/production/backup-database.sh >> /var/log/dhakad-backup.log 2>&1
```

Test restoration regularly on a separate staging system. A production restore is destructive and
requires explicit confirmation:

```sh
./scripts/production/backup-database.sh
CONFIRM_RESTORE=YES ./scripts/production/restore-database.sh /absolute/path/to/backup.dump
```

## Operations

```sh
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=200 backend
docker compose --env-file .env.production -f compose.production.yml logs --tail=200 gateway
docker compose --env-file .env.production -f compose.production.yml restart backend
```

Compose limits each service to five 10 MB JSON log files. Monitor disk usage, container health, TLS
renewal, database backups, and the public health endpoint. Apply VPS security updates regularly.

The Electron installer is not part of the VPS stack. Until its packaged renderer is configured for
the production origin, deploy the web/PWA application and install it from the production browser.
