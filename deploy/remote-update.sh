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
    echo "FATAL: Postgres container not found. Set SUPABASE_POSTGRES_CONTAINER or ensure menu-online instance is running."
    exit 1
  fi
  for f in $(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' -print | sort -V); do
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
  (cd "$APP_DIR" && docker compose build web)
  sudo systemctl restart "${SYSTEMD_UNIT_NAME:-bwb-menu-online.service}"
else
  docker compose -f "$APP_DIR/docker-compose.yml" up -d --build
fi

echo "=== Step 4.5: Bootstraps ==="
if [[ -f "$APP_DIR/.env" ]] && [[ -f "$APP_DIR/scripts/bootstrap-superadmin.ts" ]]; then
  (cd "$APP_DIR/scripts" && npm install --no-save 2>/dev/null || true)
  export APP_DIR
  bootstrap_err=$(mktemp)
  if (cd "$APP_DIR/scripts" && npx tsx bootstrap-superadmin.ts 2>"$bootstrap_err"); then
    echo "Bootstrap superadmin OK"
  else
    echo "Bootstrap superadmin skipped or failed (check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env; Node must be installed on host — see docs/NODE_ON_SERVER.md)"
    [[ -s "$bootstrap_err" ]] && cat "$bootstrap_err" 1>&2
  fi
  rm -f "$bootstrap_err"
  if [[ "${DEPLOY_ENV:-}" = "dev" ]] && [[ -f "$APP_DIR/scripts/bootstrap-dev-tenant.ts" ]]; then
    dev_err=$(mktemp)
    if (cd "$APP_DIR/scripts" && npx tsx bootstrap-dev-tenant.ts 2>"$dev_err"); then
      echo "Bootstrap dev-tenant OK"
    else
      echo "Bootstrap dev-tenant skipped or failed"
      [[ -s "$dev_err" ]] && cat "$dev_err" 1>&2
    fi
    rm -f "$dev_err"
  fi
  # A pasta local/ não vem no git nem é sincronizada; o JSON de demo deve existir no servidor
  # em APP_DIR/local/menu-demo/ (cópia manual ou passo opcional de update.sh que faz scp apenas do ficheiro).
  if [[ -f "$APP_DIR/scripts/bootstrap-demo-from-json.ts" ]]; then
    if (cd "$APP_DIR/scripts" && export APP_DIR && npx tsx bootstrap-demo-from-json.ts 2>/dev/null); then
      echo "Bootstrap demo-from-json OK"
    else
      echo "Bootstrap demo-from-json skipped (no DEMO_MENU_JSON or file missing)"
    fi
  fi
fi

echo "=== Step 5: Smoke tests ==="
for i in 1 2 3 4 5; do
  if curl -sf --connect-timeout 2 "$APP_HEALTH_URL" >/dev/null; then
    echo "Health check PASSED"
    BASE_URL="${APP_HEALTH_URL%/api/health}"
    if [[ -x "$APP_DIR/scripts/smoke-test-demo.sh" ]]; then
      if bash "$APP_DIR/scripts/smoke-test-demo.sh" "$BASE_URL"; then
        echo "Demo smoke tests PASSED"
      else
        echo "WARN: Demo smoke tests failed (host/path matrix)"
      fi
    fi
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
