#!/usr/bin/env bash
# Smoke tests por host/path para validar rotas da app (evita regressão "Not Found").
# Uso: scripts/smoke-test-demo.sh [BASE_URL]
# Default BASE_URL: http://127.0.0.1:8103

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8103}"
FAIL=0

check() {
  local host="$1"
  local path="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: $host" "${BASE_URL}${path}")
  if [[ "$code" == "200" || "$code" == "302" || "$code" == "307" ]]; then
    echo "OK  Host=$host path=$path -> $code"
  else
    echo "FAIL Host=$host path=$path -> $code (expected 200, 302 or 307)"
    FAIL=1
  fi
}

echo "=== Smoke tests (demo matrix) BASE_URL=$BASE_URL ==="
check "menu.bwb.pt" "/portal-admin"
check "9999999991.menu.bwb.pt" "/"
check "9999999991.menu.bwb.pt" "/portal-admin"

if [[ $FAIL -eq 1 ]]; then
  echo "Smoke tests FAILED (one or more routes returned 404 or error)"
  exit 1
fi
echo "Smoke tests PASSED"
exit 0
