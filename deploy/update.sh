#!/usr/bin/env bash
# Local (Mac): push deploy to server. Uses SSH alias main-srv-01 or BWB_SERVER_IP.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_SCRIPT="/tmp/remote-update-bwb-menu-online.sh"

# Load .env.local if present (ignore invalid lines)
if [[ -f "$REPO_ROOT/.env.local" ]]; then
  set -a
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "${line// }" ]] && continue
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    export "$line" 2>/dev/null || true
  done < "$REPO_ROOT/.env.local"
  set +a
fi

# Server: try SSH alias first, then fallback to IP/host
BWB_SERVER_IP="${BWB_SERVER_IP:-38.19.200.55}"
BWB_SERVER_HOST="${BWB_SERVER_HOST:-$BWB_SERVER_IP}"
SSH_TARGET=""
if ssh -o BatchMode=yes -o ConnectTimeout=5 main-srv-01 true 2>/dev/null; then
  SSH_TARGET="main-srv-01"
else
  SSH_TARGET="$BWB_SERVER_HOST"
fi

# Regra /local: NUNCA sincronizar a pasta local. Se no futuro existir rsync/scp de árvore do repo,
# usar: DEPLOY_EXCLUDE_LOCAL="--exclude '/local' --exclude 'local'"; só é permitido copiar o
# ficheiro JSON explicitamente (ex.: scp do ficheiro único para o servidor).
# Upload remote script
if scp -o ConnectTimeout=10 "$SCRIPT_DIR/remote-update.sh" "$SSH_TARGET:$REMOTE_SCRIPT" 2>/dev/null; then
  echo "Uploaded remote-update.sh to $SSH_TARGET:$REMOTE_SCRIPT"
else
  echo "SCP failed, writing script via SSH..."
  ssh "$SSH_TARGET" "cat > $REMOTE_SCRIPT" < "$SCRIPT_DIR/remote-update.sh"
  ssh "$SSH_TARGET" "chmod +x $REMOTE_SCRIPT"
fi

# Optional: send env file for remote (e.g. for secrets)
REMOTE_ENV="/tmp/bwb-menu-online.env"
if [[ -n "${DEPLOY_ENV_FILE:-}" && -f "$DEPLOY_ENV_FILE" ]]; then
  scp "$DEPLOY_ENV_FILE" "$SSH_TARGET:$REMOTE_ENV" 2>/dev/null || true
fi

# Run remote update with args
ssh "$SSH_TARGET" "bash $REMOTE_SCRIPT \
  --project-name bwb-menu-online \
  --instance-dir /srv/supabase/instances/menu-online \
  --app-dir /opt/bwb-menu-online \
  --strategy git \
  ${DEPLOY_ENV_FILE:+--env-file $REMOTE_ENV}"

echo "Deploy finished."
