#!/usr/bin/env bash
# Server: run after update.sh uploads this script. Pull, migrate, nginx, systemd, start, smoke test.

set -euo pipefail

APP_DIR="/opt/bwb-menu-online"
INSTANCE_DIR="/srv/supabase/instances/menu-online"
PROJECT_NAME="bwb-menu-online"
STRATEGY="git"
ENV_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir)      APP_DIR="$2"; shift 2 ;;
    --instance-dir) INSTANCE_DIR="$2"; shift 2 ;;
    --project-name) PROJECT_NAME="$2"; shift 2 ;;
    --strategy)     STRATEGY="$2"; shift 2 ;;
    --env-file)     ENV_FILE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Load deploy config defaults
if [[ -f "$APP_DIR/deploy/config.sh" ]]; then
  # shellcheck source=config.sh
  source "$APP_DIR/deploy/config.sh"
fi
# Override from args
export APP_DIR
NGINX_SITES_SRC="${APP_DIR}/deploy/nginx/sites-available"
APP_HEALTH_URL="${APP_HEALTH_URL:-http://127.0.0.1:8103/api/health}"

echo "=== Step 1: Git pull ==="
cd "$APP_DIR"
if [[ -f .env ]]; then
  ENV_BACKUP=$(mktemp)
  cp -a .env "$ENV_BACKUP"
fi
if [[ -f docker-compose.override.yml ]]; then
  OVERRIDE_BACKUP=$(mktemp)
  cp -a docker-compose.override.yml "$OVERRIDE_BACKUP"
fi
git pull
if [[ -n "${ENV_BACKUP:-}" && -f "$ENV_BACKUP" ]]; then
  mv "$ENV_BACKUP" .env
fi
if [[ -n "${OVERRIDE_BACKUP:-}" && -f "$OVERRIDE_BACKUP" ]]; then
  mv "$OVERRIDE_BACKUP" docker-compose.override.yml
fi
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" .env
fi

echo "=== Step 2: Migrations ==="
MIGRATIONS_DIR="$APP_DIR/migrations"
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "No migrations dir, skipping."
else
  # Resolve Postgres container
  POSTGRES_CONTAINER="${SUPABASE_POSTGRES_CONTAINER:-}"
  if [[ -z "$POSTGRES_CONTAINER" ]]; then
    # Prefer container from instance dir (menu-online)
    if [[ -d "$INSTANCE_DIR" ]]; then
      for c in $(docker ps -q); do
        inspect=$(docker inspect "$c" --format '{{.Config.Image}} {{.Name}}' 2>/dev/null || true)
        if [[ "$inspect" == *"supabase/postgres"* ]] || [[ "$inspect" == *"-db-"* ]]; then
          # Check if this container belongs to our instance (e.g. compose project menu-online)
          name=$(docker inspect "$c" --format '{{.Name}}' 2>/dev/null)
          if [[ "$name" == *"menu-online"* ]] || [[ "$name" == *"menu_online"* ]]; then
            POSTGRES_CONTAINER="$c"
            break
          fi
        fi
      done
    fi
    if [[ -z "$POSTGRES_CONTAINER" ]]; then
      for c in $(docker ps -q); do
        inspect=$(docker inspect "$c" --format '{{.Config.Image}} {{.Name}}' 2>/dev/null || true)
        if [[ "$inspect" == *"supabase/postgres"* ]] || [[ "$inspect" == *"-db-"* ]]; then
          POSTGRES_CONTAINER="$c"
          break
        fi
      done
    fi
  fi
  if [[ -z "$POSTGRES_CONTAINER" ]]; then
    echo "WARN: Postgres container not found (set SUPABASE_POSTGRES_CONTAINER). Skipping migrations."
  else
    for f in "$MIGRATIONS_DIR"/*.sql; do
      [[ -f "$f" ]] || continue
      filename=$(basename "$f")
      checksum=$(sha256sum "$f" | awk '{print $1}')
      existing=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -d postgres -t -A -c \
        "SELECT checksum FROM app_schema_migrations WHERE filename = '$filename'" 2>/dev/null || true)
      if [[ -n "$existing" ]]; then
        if [[ "$existing" != "$checksum" ]]; then
          echo "FATAL: Migration $filename was already applied with a different checksum. Refusing to run."
          exit 1
        fi
        echo "Skip (already applied): $filename"
        continue
      fi
      echo "Applying: $filename"
      docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
      docker exec "$POSTGRES_CONTAINER" psql -U postgres -d postgres -c \
        "INSERT INTO app_schema_migrations (filename, checksum, applied_at) VALUES ('$filename', '$checksum', now());"
    done
  fi
fi

echo "=== Step 3.6: Nginx apply ==="
if [[ -f "$APP_DIR/deploy/nginx/apply.sh" ]]; then
  bash "$APP_DIR/deploy/nginx/apply.sh"
else
  echo "No nginx apply.sh, skipping."
fi

echo "=== Step 3.7: Systemd apply ==="
if [[ -f "$APP_DIR/deploy/systemd/apply.sh" ]]; then
  bash "$APP_DIR/deploy/systemd/apply.sh"
else
  echo "No systemd apply.sh, skipping."
fi

echo "=== Step 4: Start stack ==="
if systemctl is-enabled "${SYSTEMD_UNIT_NAME:-bwb-menu-online.service}" &>/dev/null; then
  sudo systemctl restart "${SYSTEMD_UNIT_NAME:-bwb-menu-online.service}"
else
  docker compose -f "$APP_DIR/docker-compose.yml" up -d --build
fi

echo "=== Step 5: Smoke tests ==="
for i in 1 2 3 4 5; do
  if curl -sf --connect-timeout 2 "$APP_HEALTH_URL" >/dev/null; then
    echo "Health check PASSED"
    exit 0
  fi
  sleep 2
done
echo "Health check FAILED"
docker compose -f "$APP_DIR/docker-compose.yml" ps
docker compose -f "$APP_DIR/docker-compose.yml" logs --tail=50
if command -v nginx &>/dev/null; then
  echo "--- nginx error log ---"
  tail -20 /var/log/nginx/error.log 2>/dev/null || true
fi
exit 1
