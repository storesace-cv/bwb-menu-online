#!/usr/bin/env bash
# Local (Mac): push deploy to server. Uses SSH alias main-srv-01 or BWB_SERVER_IP.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_SCRIPT="/tmp/remote-update-bwb-menu-online.sh"

log_info() { echo "[INFO] $1"; }
log_warn() { echo "[WARN] $1"; }
log_error() { echo "[ERROR] $1"; }

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
SSH_CMD=""
SCP_CMD=""
SCP_TARGET=""
SSH_USER=""
SSH_KEY=""

if ssh -o BatchMode=yes -o ConnectTimeout=5 main-srv-01 true 2>/dev/null; then
  SSH_TARGET="main-srv-01"
  SCP_TARGET="$SSH_TARGET"
  SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_TARGET"
  SCP_CMD="scp -o StrictHostKeyChecking=no -o ConnectTimeout=10"
  log_info "A usar alias SSH main-srv-01"
else
  SSH_TARGET="$BWB_SERVER_HOST"
  SSH_USER="${BWB_SSH_USER:-root}"
  SSH_KEY="${BWB_SSH_KEY_PATH:-$HOME/.ssh/digitalocean}"
  SSH_KEY="${SSH_KEY/#\~/$HOME}"

  if [[ -n "$SSH_KEY" && -f "$SSH_KEY" ]]; then
    SCP_TARGET="$SSH_USER@$SSH_TARGET"
    SSH_CMD="ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 $SSH_USER@$SSH_TARGET"
    SCP_CMD="scp -i \"$SSH_KEY\" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10"
    log_info "A usar fallback $SSH_USER@$SSH_TARGET com chave explícita"
  else
    log_warn "Chave SSH não encontrada em '$SSH_KEY'. A tentar via agente SSH em $SSH_USER@$SSH_TARGET"
    SCP_TARGET="$SSH_USER@$SSH_TARGET"
    SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$SSH_TARGET"
    SCP_CMD="scp -o StrictHostKeyChecking=no -o ConnectTimeout=10"
  fi
fi

log_info "A testar ligação SSH..."
if ! eval "$SSH_CMD true" >/dev/null 2>&1; then
  log_error "Falha de autenticação SSH para o target '$SSH_TARGET'."
  log_error "Defina BWB_SSH_USER/BWB_SSH_KEY_PATH ou garanta acesso ao alias main-srv-01."
  exit 1
fi

# Regra /local: NUNCA sincronizar a pasta local. Se no futuro existir rsync/scp de árvore do repo,
# usar: DEPLOY_EXCLUDE_LOCAL="--exclude '/local' --exclude 'local'"; só é permitido copiar o
# ficheiro JSON explicitamente (ex.: scp do ficheiro único para o servidor).
# Upload remote script
if eval "$SCP_CMD \"$SCRIPT_DIR/remote-update.sh\" \"$SCP_TARGET:$REMOTE_SCRIPT\"" 2>/dev/null; then
  log_info "Uploaded remote-update.sh para $SCP_TARGET:$REMOTE_SCRIPT"
else
  log_warn "SCP falhou, a escrever script via SSH..."
  eval "$SSH_CMD \"cat > $REMOTE_SCRIPT\"" < "$SCRIPT_DIR/remote-update.sh"
  eval "$SSH_CMD \"chmod +x $REMOTE_SCRIPT\""
fi

# Optional: send env file for remote (e.g. for secrets)
REMOTE_ENV="/tmp/bwb-menu-online.env"
if [[ -n "${DEPLOY_ENV_FILE:-}" && -f "$DEPLOY_ENV_FILE" ]]; then
  eval "$SCP_CMD \"$DEPLOY_ENV_FILE\" \"$SCP_TARGET:$REMOTE_ENV\"" 2>/dev/null || true
fi

# Run remote update with args
eval "$SSH_CMD \"bash $REMOTE_SCRIPT \
  --project-name bwb-menu-online \
  --instance-dir /srv/supabase/instances/menu-online \
  --app-dir /opt/bwb-menu-online \
  --strategy git \
  ${DEPLOY_ENV_FILE:+--env-file $REMOTE_ENV}\""

log_info "Deploy finished."
