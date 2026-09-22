# Dhakad Grading Plant — Production Runbook

This runbook is specific to the current production installation:

- Production URL: `https://app.rcpexim.com`
- VPS user: `ubuntu`
- Project directory: `/home/ubuntu/apps/dhakad-grading-plant`
- Compose file: `compose.production.yml`
- Production environment: `.env.production`
- VPS timezone: UTC

Never commit `.env`, `.env.production`, passwords, API keys, database dumps, or Gmail App
Passwords to Git.

## 1. Deploy application changes

### On the development computer

From the repository root, review and verify the change:

```sh
git status
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Commit and push only after the checks pass:

```sh
git add <changed-files>
git commit -m "describe the change"
git push origin main
```

Do not use `git add .` without first checking `git status` and confirming every file is intended.

### On the production VPS

Connect to the VPS and enter the application directory:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
```

Create a database backup before every release:

```sh
./scripts/production/backup-database.sh
```

Pull only a fast-forward update and confirm the deployed revision:

```sh
git pull --ff-only origin main
git log -1 --oneline
```

For a frontend-only change:

```sh
docker compose --env-file .env.production -f compose.production.yml up -d --build frontend gateway
```

For backend, shared contracts, dependencies, environment configuration, or uncertain changes,
rebuild the complete application stack:

```sh
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

The one-shot `migrate` service applies committed Prisma migrations before the backend starts. Never
run development migrations or reset the production database.

### Verify the release

```sh
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail https://app.rcpexim.com/api/v1/health
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 backend
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 gateway
```

Open `https://app.rcpexim.com` and smoke-test login plus every area affected by the release. For a
large release, also check grading, seed sales, payments, reports, receipts, and notifications.

## 2. Change production environment variables

Edit the VPS-only environment file:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
nano .env.production
```

After saving it, validate the Compose configuration without printing or sharing its output publicly:

```sh
docker compose --env-file .env.production -f compose.production.yml config --quiet
```

Recreate affected services. Backend environment changes normally require:

```sh
docker compose --env-file .env.production -f compose.production.yml up -d --build backend gateway
```

Never paste real secrets into chat, Git commits, screenshots, logs, or shell commands that will be
stored in shell history. Rotate a secret immediately if it is exposed.

## 3. Database backups

PostgreSQL stores live data in the Docker volume `postgres_data`. That volume is persistent but is
not a backup.

Create a manual custom-format PostgreSQL dump:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
./scripts/production/backup-database.sh
```

Backups are written to:

```text
/home/ubuntu/apps/dhakad-grading-plant/backups/postgres
```

The backup script retains 14 days by default. List the newest backups and total disk usage:

```sh
ls -lht backups/postgres | head
du -sh backups/postgres
```

Validate the newest dump without changing the database:

```sh
LATEST_BACKUP=$(find backups/postgres -type f -name 'dhakad-*.dump' | sort | tail -1)
test -n "$LATEST_BACKUP" && test -s "$LATEST_BACKUP"
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  pg_restore --list < "$LATEST_BACKUP" | head -20
```

### Automatic backup and email

The VPS uses UTC. `18:00 UTC` is `23:30 IST`. The configured user crontab should contain:

```cron
0 18 * * * /home/ubuntu/send-dhakad-backup.sh >> /home/ubuntu/dhakad-backup.log 2>&1
```

Inspect the schedule and recent output:

```sh
crontab -l
systemctl is-active cron
tail -100 /home/ubuntu/dhakad-backup.log
```

Test the complete backup-and-email workflow manually:

```sh
/home/ubuntu/send-dhakad-backup.sh
```

Email is convenient while dumps remain small, but a copy should also be kept in encrypted storage
outside the VPS. Backups stored only on the VPS do not protect against loss of the VPS or its disk.

## 4. Safe restore drill

Use a separate database to prove that a dump is restorable without affecting production:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
LATEST_BACKUP=$(find backups/postgres -type f -name 'dhakad-*.dump' | sort | tail -1)
test -n "$LATEST_BACKUP" && test -s "$LATEST_BACKUP"

docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'dropdb --if-exists --force --username="$POSTGRES_USER" dhakad_restore_drill && createdb --username="$POSTGRES_USER" dhakad_restore_drill'

docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'pg_restore --exit-on-error --no-owner --no-privileges --username="$POSTGRES_USER" --dbname=dhakad_restore_drill' \
  < "$LATEST_BACKUP"

docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'psql --username="$POSTGRES_USER" --dbname=dhakad_restore_drill --command="\dt"'
```

After checking the restored tables, delete only the drill database:

```sh
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'dropdb --if-exists --force --username="$POSTGRES_USER" dhakad_restore_drill'
```

## 5. Restore the main production database

This procedure is destructive. It replaces the current main database and causes temporary downtime.
Use it only for actual recovery or a deliberately approved destructive drill.

Do not run `docker compose down -v`; that command deletes persistent volumes.

First confirm the configured target and take a final safety backup:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
grep '^POSTGRES_DB=' .env.production
./scripts/production/backup-database.sh
```

Select and validate the dump that must be restored:

```sh
LATEST_BACKUP=$(find backups/postgres -type f -name 'dhakad-*.dump' | sort | tail -1)
echo "$LATEST_BACKUP"
ls -lh "$LATEST_BACKUP"
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  pg_restore --list < "$LATEST_BACKUP" | head -20
```

Restore it only after confirming the exact filename:

```sh
CONFIRM_RESTORE=YES ./scripts/production/restore-database.sh "$LATEST_BACKUP"
```

The script stops the backend, drops and recreates the configured main database, restores the dump,
and starts the backend and gateway again.

Verify recovery:

```sh
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 backend
curl --fail https://app.rcpexim.com/api/v1/health
```

Then log in at `https://app.rcpexim.com` and verify customers, grading entries, seed bills, payments,
dues, reports, and notification history.

### Gmail-backup destructive recovery drill on the existing VPS

Use this drill when testing the exact situation in which the usable backup is an attachment from
Gmail rather than a dump already stored on the VPS. This deliberately deletes the configured main
database and causes downtime. Keep the Gmail message and attachment until the complete drill has
passed.

Download the `.dump` attachment from Gmail to the development computer. When using VS Code Remote
SSH, drag or paste the file directly into:

```text
/home/ubuntu/apps/dhakad-grading-plant
```

Rename it to `gmail-recovery.dump`. On the VPS, verify its location, size, and readability before
deleting anything:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
ls -lh gmail-recovery.dump
test -s gmail-recovery.dump

docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  pg_restore --list < gmail-recovery.dump | head -20
```

Do not continue if `pg_restore --list` reports an error. Confirm the exact database configured in
production:

```sh
grep '^POSTGRES_DB=' .env.production
```

Stop the backend so it cannot write data or reconnect during deletion:

```sh
docker compose --env-file .env.production -f compose.production.yml stop backend
```

Delete only the configured application database:

```sh
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'echo "Deleting database: $POSTGRES_DB"; dropdb --if-exists --force --username="$POSTGRES_USER" "$POSTGRES_DB"'
```

Confirm that the application database is absent from the PostgreSQL database list:

```sh
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'psql --username="$POSTGRES_USER" --dbname=postgres --list'
```

Restore the Gmail copy. The script safely handles the already-absent database, recreates it, loads
the dump, and starts the backend and gateway:

```sh
CONFIRM_RESTORE=YES ./scripts/production/restore-database.sh \
  /home/ubuntu/apps/dhakad-grading-plant/gmail-recovery.dump
```

Verify containers, logs, and the public endpoint:

```sh
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 backend
curl --fail https://app.rcpexim.com/api/v1/health
```

Log into the application and verify customers, balances, entries, bills, payments, reports, and
notification history. After the drill passes and the original Gmail attachment remains safely
stored, remove the temporary uploaded copy:

```sh
rm /home/ubuntu/apps/dhakad-grading-plant/gmail-recovery.dump
```

Never use `docker compose down -v` for this drill.

## 6. Application rollback

Database restoration is not the normal way to roll back application code. To roll back code, first
identify the last known-good commit and confirm that no incompatible database migration prevents the
rollback:

```sh
git log --oneline -10
git checkout <known-good-commit>
docker compose --env-file .env.production -f compose.production.yml up -d --build
curl --fail https://app.rcpexim.com/api/v1/health
```

Return to the tracked production branch during the next reviewed deployment:

```sh
git checkout main
git pull --ff-only origin main
```

Never restore an older database merely to roll back frontend or backend code. Restore the database
only when data recovery is required.

## 7. Complete VPS disaster recovery

Use this procedure when the original VPS and its Docker volumes are completely unavailable, but a
database dump is available in Gmail. The dump recovers business data only. GitHub recovers the
application code. Neither source contains `.env.production`, SMTP credentials, SSH keys, or other
secrets, so keep a separate secure record of the production environment values.

### Recovery prerequisites

Before starting, obtain:

- A new Ubuntu VPS and its public IP address
- SSH access to the new VPS
- The database `.dump` attachment downloaded from Gmail to the development computer
- Access to the GitHub repository
- All production environment values and fresh provider secrets
- Access to the DNS records for `app.rcpexim.com`

Prefer deploying the same Git commit that created the backup. If that revision is unknown, use the
latest reviewed `main` revision and allow committed Prisma migrations to update the restored schema.
Never run `prisma migrate dev` or a database reset in production.

### 1. Prepare the new VPS

Connect to the new server and update it:

```sh
ssh ubuntu@NEW_VPS_IP
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
```

Install Docker Engine and the Docker Compose plugin using Docker's current official Ubuntu
installation instructions. Verify the installation:

```sh
docker --version
docker compose version
```

Allow the `ubuntu` user to run Docker, then reconnect so the group change takes effect:

```sh
sudo usermod -aG docker ubuntu
exit
ssh ubuntu@NEW_VPS_IP
```

Configure the VPS firewall/security group to allow only the required public ports:

- TCP 22 for SSH, restricted to trusted IP addresses where possible
- TCP 80 for HTTP and certificate issuance
- TCP 443 and UDP 443 for HTTPS

Do not expose PostgreSQL port 5432 or backend port 3000 publicly.

### 2. Restore the application code

```sh
mkdir -p /home/ubuntu/apps
cd /home/ubuntu/apps
git clone https://github.com/dayal-dhakad/dhakad-grading-plant.git
cd /home/ubuntu/apps/dhakad-grading-plant
git log -1 --oneline
```

If recovery requires a specific known commit, check it out before building:

```sh
git checkout <backup-compatible-commit>
```

### 3. Recreate the production environment

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Set at least:

- `APP_DOMAIN=app.rcpexim.com`
- `POSTGRES_DB`
- `POSTGRES_USER`
- A new long, URL-safe `POSTGRES_PASSWORD`
- Session and GST settings
- Current MSG91/Fast2SMS credentials and approved template settings
- Any other values added to `.env.production.example`

Use fresh credentials if the old VPS may have been compromised. Validate the file:

```sh
docker compose --env-file .env.production -f compose.production.yml config --quiet
```

### 4. Upload the Gmail dump

Download the `.dump` attachment from Gmail onto the development computer. From the development
computer—not from the VPS—upload it using its actual filename:

```sh
scp /path/to/dhakad-YYYYMMDDTHHMMSSZ.dump ubuntu@NEW_VPS_IP:/home/ubuntu/
```

Back on the VPS, put it in the expected backup directory:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
mkdir -p backups/postgres
mv /home/ubuntu/dhakad-YYYYMMDDTHHMMSSZ.dump backups/postgres/
chmod 600 backups/postgres/dhakad-YYYYMMDDTHHMMSSZ.dump
```

Validate that the uploaded file is present and non-empty:

```sh
RECOVERY_BACKUP=/home/ubuntu/apps/dhakad-grading-plant/backups/postgres/dhakad-YYYYMMDDTHHMMSSZ.dump
ls -lh "$RECOVERY_BACKUP"
test -s "$RECOVERY_BACKUP"
```

### 5. Build the stack and start PostgreSQL

Build the images before invoking the restore script because a new VPS has no cached application
images:

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml up -d postgres
docker compose --env-file .env.production -f compose.production.yml ps
```

Wait until `postgres` reports healthy. Validate the dump catalogue against the new PostgreSQL
container:

```sh
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  pg_restore --list < "$RECOVERY_BACKUP" | head -20
```

### 6. Restore the recovered database

This command replaces the newly created empty database with the Gmail backup:

```sh
CONFIRM_RESTORE=YES ./scripts/production/restore-database.sh "$RECOVERY_BACKUP"
```

Start the complete stack afterward. The migration service applies any committed migrations that are
newer than the restored backup:

```sh
docker compose --env-file .env.production -f compose.production.yml up -d
docker compose --env-file .env.production -f compose.production.yml ps
```

If any service is unhealthy, inspect it before changing or deleting data:

```sh
docker compose --env-file .env.production -f compose.production.yml logs --tail=200 migrate
docker compose --env-file .env.production -f compose.production.yml logs --tail=200 backend
docker compose --env-file .env.production -f compose.production.yml logs --tail=200 gateway
```

### 7. Point the domain to the new VPS

Change the DNS `A` record for `app.rcpexim.com` to `NEW_VPS_IP`. Remove or update an `AAAA` record
if it still points to the lost server and the new VPS does not have that IPv6 address.

Wait for DNS propagation, then confirm resolution and health:

```sh
getent ahosts app.rcpexim.com
curl --fail https://app.rcpexim.com/api/v1/health
```

Caddy obtains a new TLS certificate after DNS points to the new server and ports 80/443 are
reachable. Inspect gateway logs if certificate issuance is delayed:

```sh
docker compose --env-file .env.production -f compose.production.yml logs --tail=200 gateway
```

### 8. Verify the recovered business data

Log in at `https://app.rcpexim.com` and verify:

- Administrator and staff login
- Customers and their balances
- Grading entries and receipts
- Seed products, stock, and bills
- Payments, allocations, waivers, and ledger history
- Reports and notification history

Compare visible record counts and recent transactions with the expected time of the backup. Any work
created after the dump timestamp cannot be recovered from that dump.

### 9. Recreate server-only operations

The lost VPS's user crontab, SMTP files, logs, and email script are not stored in the database dump.
Recreate and test:

- `/home/ubuntu/.msmtprc` with a fresh Gmail App Password and mode `600`
- `/home/ubuntu/.muttrc` with mode `600`
- `/home/ubuntu/send-dhakad-backup.sh` with mode `700`
- The daily `23:30 IST` cron entry

```cron
0 18 * * * /home/ubuntu/send-dhakad-backup.sh >> /home/ubuntu/dhakad-backup.log 2>&1
```

Verify the recovered backup workflow immediately:

```sh
/home/ubuntu/send-dhakad-backup.sh
crontab -l
systemctl is-active cron
```

Finally, revoke credentials associated with the lost VPS, rotate all application/provider secrets,
and store a protected copy of the new `.env.production` values separately from the VPS.

## 8. Create a completely fresh database

Use this procedure only when intentionally starting with no customers, transactions, payments,
ledger history, stock movements, notifications, or existing users. This is destructive when used
against an existing database.

The reference seed creates or updates the approved unit, grading crops, seed category, seed products,
and product variants. It does not create business transactions, opening stock, payment accounts,
customers, staff, or an administrator. The administrator is created separately afterward.

### 1. Confirm the target and take a safety backup

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
grep '^POSTGRES_DB=' .env.production
./scripts/production/backup-database.sh
```

Keep the resulting dump outside the VPS before proceeding if this database contains any data that
might be needed later.

### 2. Stop the backend and recreate an empty database

```sh
docker compose --env-file .env.production -f compose.production.yml stop backend

docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'echo "Recreating database: $POSTGRES_DB"; dropdb --if-exists --force --username="$POSTGRES_USER" "$POSTGRES_DB" && createdb --username="$POSTGRES_USER" "$POSTGRES_DB"'
```

Do not use `docker compose down -v`; recreating only the configured database is more precise and
does not delete the entire PostgreSQL volume.

### 3. Apply all production migrations

```sh
docker compose --env-file .env.production -f compose.production.yml run --rm migrate
```

The command must finish successfully before seeding data.

### 4. Seed approved reference data

```sh
docker compose --env-file .env.production -f compose.production.yml run --rm migrate \
  ./node_modules/.bin/tsx apps/backend/prisma/seed.ts
```

The seed is idempotent: rerunning it updates or creates the approved reference records without
duplicating them. It currently seeds:

- Quintal unit
- Wheat, Chana, and Kalonji grading crops with their configured rates
- Seeds product category
- Approved seed products and variants from `apps/backend/prisma/seed.ts`

Review production rates and product availability in the administrator UI after initialization.

### 5. Create the initial administrator securely

Enter the bootstrap values interactively so the password is not stored in shell history:

```sh
read -r -p 'Administrator mobile (10 digits): ' BOOTSTRAP_ADMIN_MOBILE
read -r -p 'Administrator name: ' BOOTSTRAP_ADMIN_NAME
read -r -s -p 'Temporary administrator password: ' BOOTSTRAP_ADMIN_PASSWORD
printf '\n'
export BOOTSTRAP_ADMIN_MOBILE BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
```

Create the administrator through the migration image:

```sh
docker compose --env-file .env.production -f compose.production.yml run --rm \
  -e BOOTSTRAP_ADMIN_MOBILE \
  -e BOOTSTRAP_ADMIN_NAME \
  -e BOOTSTRAP_ADMIN_PASSWORD \
  migrate ./node_modules/.bin/tsx apps/backend/prisma/create-admin.ts
```

Remove the bootstrap values from the current shell immediately afterward:

```sh
unset BOOTSTRAP_ADMIN_MOBILE BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
```

The mobile number must contain exactly 10 digits and the password must contain at least 8
characters. The command refuses to overwrite an existing user with the same mobile number.

### 6. Start and verify the fresh application

```sh
docker compose --env-file .env.production -f compose.production.yml up -d
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 backend
curl --fail https://app.rcpexim.com/api/v1/health
```

Log in using the new administrator account. Immediately replace the temporary password through the
approved account workflow, then configure staff, payment accounts, grading rates, products, and
opening stock as required. Create opening stock through the stock workflow so its history remains
auditable; do not insert stock balances directly into PostgreSQL.

## 9. Build the Windows desktop application

The Electron application is a thin, secure shell for `https://app.rcpexim.com`. It requires an
internet connection and always uses the currently deployed web application and backend. It does not
contain a separate database or offline copy of business data.

Build the installer on a Windows development computer from the repository root:

```sh
npm run typecheck -w @dhakad/desktop
npm run package -w @dhakad/desktop
```

The installer is created under:

```text
apps/desktop/release
```

The executable, installer, Start-menu shortcut, taskbar window, and desktop shortcut use the Dhakad
logo. The packaged shell accepts navigation only within `https://app.rcpexim.com`, opens external
HTTPS links in the default browser, disables renderer Node.js access, and shows a retry page when the
production site cannot be reached.

The installer is currently unsigned. Windows may display a SmartScreen warning until a trusted
Windows code-signing certificate is purchased and configured. Distribute only a reviewed installer
produced from a known Git commit, and record that commit alongside the installer version.
