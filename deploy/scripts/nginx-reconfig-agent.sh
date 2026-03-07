#!/usr/bin/env bash
# Agent on host: fetch pending nginx_reconfig_jobs from Supabase (service_role), run reconfigure-nginx.sh, update job (done/failed).
# Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_DIR (or default /opt/bwb-menu-online).
# Usage: run from cron or systemd timer, e.g. every 1–5 minutes.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bwb-menu-online}"
SCRIPT_DIR="${APP_DIR}/deploy/scripts"
RECONFIGURE_SCRIPT="${SCRIPT_DIR}/reconfigure-nginx.sh"

if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$APP_DIR/.env"
  set +a
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (e.g. from $APP_DIR/.env)" 1>&2
  exit 1
fi

if [[ ! -x "$RECONFIGURE_SCRIPT" ]]; then
  echo "ERROR: $RECONFIGURE_SCRIPT not found or not executable" 1>&2
  exit 1
fi

BASE="${SUPABASE_URL%/}"
if [[ "$BASE" != *"/rest/v1" ]]; then
  BASE="${BASE}/rest/v1"
fi

# Fetch pending jobs (service_role bypasses RLS)
RESP=$(curl -sf -X GET \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "$BASE/nginx_reconfig_jobs?status=eq.pending&order=requested_at.asc" 2>/dev/null) || true

if [[ -z "$RESP" || "$RESP" == "[]" ]]; then
  exit 0
fi

# Parse jobs (id and hostnames). Use jq if available.
need_jq=
for job in $(echo "$RESP" | jq -r '.[] | @base64' 2>/dev/null); do
  id=$(echo "$job" | base64 -d 2>/dev/null | jq -r '.id')
  hostnames_json=$(echo "$job" | base64 -d 2>/dev/null | jq -c '.hostnames')
  if [[ -z "$id" || "$id" == "null" ]]; then continue; fi
  # Build args: hostnames may be ["a.menu.bwb.pt","b.pt"] -> a.menu.bwb.pt b.pt
  args=()
  if command -v jq &>/dev/null; then
    while read -r h; do
      [[ -n "$h" && "$h" != "null" ]] && args+=("$h")
    done < <(echo "$hostnames_json" | jq -r '.[]')
  else
    echo "WARN: jq required to parse hostnames; skipping job $id" 1>&2
    continue
  fi
  if bash "$RECONFIGURE_SCRIPT" "${args[@]}"; then
    done_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    curl -sf -X PATCH \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\":\"done\",\"done_at\":\"$done_at\"}" \
      "$BASE/nginx_reconfig_jobs?id=eq.$id" >/dev/null 2>&1 || true
  else
    rc=$?
    err="Script failed with exit code $rc"
    curl -sf -X PATCH \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\":\"failed\",\"error_message\":\"$err\"}" \
      "$BASE/nginx_reconfig_jobs?id=eq.$id" >/dev/null 2>&1 || true
  fi
done

exit 0
