#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$PROJECT_ROOT/compose.production.yml"}
ENV_FILE=${ENV_FILE:-"$PROJECT_ROOT/.env.production"}
BACKUP_DIR=${BACKUP_DIR:-"$PROJECT_ROOT/backups/postgres"}
RETENTION_DAYS=${RETENTION_DAYS:-14}

if [ ! -f "$ENV_FILE" ]; then
  echo "Production environment file not found: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
TARGET="$BACKUP_DIR/dhakad-$STAMP.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$TARGET"

test -s "$TARGET"
find "$BACKUP_DIR" -type f -name 'dhakad-*.dump' -mtime "+$RETENTION_DAYS" -delete
echo "Database backup created: $TARGET"

