# Fresh Production Database Setup

Use this guide only when intentionally starting production with a completely empty database.

This procedure permanently deletes all existing customers, users, grading entries, seed bills,
payments, dues, ledger entries, stock movements, notification history, and other business data.
Confirm that a valid off-VPS backup exists before proceeding.

Production details:

- Application: `https://app.rcpexim.com`
- VPS project directory: `/home/ubuntu/apps/dhakad-grading-plant`
- Environment file: `.env.production`
- Compose file: `compose.production.yml`

Do not run `docker compose down -v`. That command deletes persistent Docker volumes and is not
required for this procedure.

## 1. Enter the project directory

```sh
cd /home/ubuntu/apps/dhakad-grading-plant
```

Confirm the exact target database:

```sh
grep '^POSTGRES_DB=' .env.production
```

Stop if the displayed database is not the one that should be erased.

## 2. Stop the backend

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  stop backend
```

## 3. Delete and recreate the database

The following is the destructive command:

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  exec -T postgres \
  sh -c 'echo "Recreating database: $POSTGRES_DB"; dropdb --if-exists --force --username="$POSTGRES_USER" "$POSTGRES_DB" && createdb --username="$POSTGRES_USER" "$POSTGRES_DB"'
```

At this point, the configured application database is empty.

## 4. Apply production migrations

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  run --rm migrate
```

Do not continue unless this command finishes successfully.

## 5. Seed approved reference data

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  run --rm migrate \
  ./node_modules/.bin/tsx apps/backend/prisma/seed.ts
```

Expected output:

```text
Reference data seeded successfully
```

The seed currently creates or updates:

- Quintal unit
- Wheat, Chana, and Kalonji grading crops
- Seeds product category
- Approved seed products and variants defined in `apps/backend/prisma/seed.ts`

The seed does not create customers, staff, transactions, payment accounts, or stock quantities.

## 6. Enter administrator details securely

Enter the initial administrator values interactively. This keeps the password out of shell history:

```sh
read -r -p 'Administrator mobile (10 digits): ' BOOTSTRAP_ADMIN_MOBILE
read -r -p 'Administrator name: ' BOOTSTRAP_ADMIN_NAME
read -r -s -p 'Administrator password: ' BOOTSTRAP_ADMIN_PASSWORD
printf '\n'
export BOOTSTRAP_ADMIN_MOBILE BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
```

The mobile number must contain exactly 10 digits. The password must contain at least 8 characters.
The password does not appear while being typed.

## 7. Create the initial administrator

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  run --rm \
  -e BOOTSTRAP_ADMIN_MOBILE \
  -e BOOTSTRAP_ADMIN_NAME \
  -e BOOTSTRAP_ADMIN_PASSWORD \
  migrate \
  ./node_modules/.bin/tsx apps/backend/prisma/create-admin.ts
```

Expected output resembles:

```text
Admin user created: 9876543210
```

Remove the bootstrap credentials from the current shell immediately:

```sh
unset BOOTSTRAP_ADMIN_MOBILE BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
```

The administrator creation command refuses to overwrite an existing user with the same mobile
number.

## 8. Start the application

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  up -d
```

## 9. Verify production

Check container status:

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  ps
```

Inspect backend logs:

```sh
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  logs --tail=100 backend
```

Check the public health endpoint:

```sh
curl --fail https://app.rcpexim.com/api/v1/health
```

Log in at `https://app.rcpexim.com` using the new administrator credentials.

After login:

1. Change the temporary administrator password through the approved account workflow.
2. Review grading rates and seeded products.
3. Create required payment accounts.
4. Create staff accounts.
5. Enter opening seed stock through the stock-adjustment workflow.

Do not insert opening stock or financial records directly into PostgreSQL. Use the application
workflows so audit, stock, and ledger history remain correct.
