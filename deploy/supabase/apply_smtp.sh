#!/usr/bin/env bash
# Apply GOTRUE_SMTP_* from app .env to Supabase instance auth service (smtp.env + compose env_file).
# Run on server; idempotent. Never commits or prints secrets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-/opt/bwb-menu-online}"
INSTANCE_DIR="${INSTANCE_DIR:-/srv/supabase/instances/menu-online}"
APP_ENV_FILE="${APP_ENV_FILE:-}"
AUTH_SERVICE="${SUPABASE_AUTH_SERVICE_NAME:-auth}"

if [[ -f "$APP_DIR/deploy/config.sh" ]]; then
  # shellcheck source=../config.sh
  source "$APP_DIR/deploy/config.sh"
fi
INSTANCE_DIR="${INSTANCE_DIR:-$SUPABASE_INSTANCE_DIR}"
INSTANCE_DIR="${INSTANCE_DIR:-/srv/supabase/instances/menu-online}"

ENV_FILE="${APP_ENV_FILE:-$APP_DIR/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "FATAL: App env file not found: $ENV_FILE"
  exit 1
fi

# Export only GOTRUE_SMTP_* from .env (no eval of whole file)
while IFS= read -r line; do
  [[ -n "$line" ]] && export "$line" 2>/dev/null || true
done < <(grep -E '^GOTRUE_SMTP_[A-Z_]+=' "$ENV_FILE")

REQUIRED=(GOTRUE_SMTP_HOST GOTRUE_SMTP_PORT GOTRUE_SMTP_USER GOTRUE_SMTP_PASS GOTRUE_SMTP_ADMIN_EMAIL GOTRUE_SMTP_SENDER_NAME)
MISSING=()
for key in "${REQUIRED[@]}"; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    MISSING+=("$key")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  if [[ "${DEPLOY_ENV:-}" == "dev" ]]; then
    echo "WARN: SMTP vars missing (${MISSING[*]}). Skipping Supabase SMTP apply (DEV)."
    exit 0
  fi
  echo "FATAL: Required SMTP vars missing in $ENV_FILE: ${MISSING[*]}"
  exit 1
fi

SECRETS_DIR="$INSTANCE_DIR/secrets"
SMTP_ENV="$SECRETS_DIR/smtp.env"
mkdir -p "$SECRETS_DIR"

{
  echo "GOTRUE_SMTP_HOST=$GOTRUE_SMTP_HOST"
  echo "GOTRUE_SMTP_PORT=$GOTRUE_SMTP_PORT"
  echo "GOTRUE_SMTP_USER=$GOTRUE_SMTP_USER"
  echo "GOTRUE_SMTP_PASS=$GOTRUE_SMTP_PASS"
  echo "GOTRUE_SMTP_ADMIN_EMAIL=$GOTRUE_SMTP_ADMIN_EMAIL"
  echo "GOTRUE_SMTP_SENDER_NAME=$GOTRUE_SMTP_SENDER_NAME"
} > "$SMTP_ENV"
chmod 600 "$SMTP_ENV"

COMPOSE="$INSTANCE_DIR/docker-compose.yml"
if [[ ! -f "$COMPOSE" ]]; then
  echo "FATAL: Supabase compose not found: $COMPOSE"
  exit 1
fi

# Idempotent: add env_file for auth service if not already present
if grep -q 'secrets/smtp.env' "$COMPOSE" 2>/dev/null; then
  echo "Compose already references secrets/smtp.env, skip patch."
else
  if command -v yq &>/dev/null; then
    # Ensure env_file is a list and add ./secrets/smtp.env
    if yq -e ".services.${AUTH_SERVICE}" "$COMPOSE" &>/dev/null; then
      yq -i ".services.${AUTH_SERVICE}.env_file += [\"./secrets/smtp.env\"]" "$COMPOSE"
      echo "Added env_file ./secrets/smtp.env to service ${AUTH_SERVICE} (yq)."
    else
      echo "FATAL: Service ${AUTH_SERVICE} not found in $COMPOSE"
      exit 1
    fi
  else
    # Fallback: insert env_file block right after "  auth:" line
    awk -v svc="$AUTH_SERVICE" '
      $0 ~ "^  " svc ":[[:space:]]*$" { print; print "    env_file:"; print "    - ./secrets/smtp.env"; next }
      { print }
    ' "$COMPOSE" > "$COMPOSE.tmp" && mv "$COMPOSE.tmp" "$COMPOSE"
    echo "Added env_file ./secrets/smtp.env to service ${AUTH_SERVICE} (awk)."
  fi
fi

echo "Restarting auth service..."
(cd "$INSTANCE_DIR" && docker compose restart "$AUTH_SERVICE")

# Validate without printing PASS
echo "Validating GOTRUE_SMTP_* in auth container..."
(cd "$INSTANCE_DIR" && docker compose exec -T "$AUTH_SERVICE" env 2>/dev/null) | grep 'GOTRUE_SMTP_' | sed 's/GOTRUE_SMTP_PASS=.*/GOTRUE_SMTP_PASS=***hidden***/' || true
echo "Apply Supabase SMTP OK."
