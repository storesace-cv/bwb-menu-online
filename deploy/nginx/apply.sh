#!/usr/bin/env bash
# Idempotent: copy vhosts from repo to sites-available, symlink in sites-enabled, nginx -t, reload.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Allow override from env (when called from remote-update.sh)
NGINX_SITES_SRC="${NGINX_SITES_SRC:-$APP_DIR/deploy/nginx/sites-available}"
NGINX_SITES_AVAILABLE="${NGINX_SITES_AVAILABLE:-/etc/nginx/sites-available}"
NGINX_SITES_ENABLED="${NGINX_SITES_ENABLED:-/etc/nginx/sites-enabled}"

if [[ ! -d "$NGINX_SITES_SRC" ]]; then
  echo "No nginx sites source dir: $NGINX_SITES_SRC"
  exit 0
fi

for f in "$NGINX_SITES_SRC"/*; do
  [[ -f "$f" ]] || continue
  name=$(basename "$f")
  dest="$NGINX_SITES_AVAILABLE/$name"
  sudo cp -a "$f" "$dest"
  echo "Copied $name to $dest"
  link="$NGINX_SITES_ENABLED/$name"
  if [[ ! -L "$link" ]]; then
    sudo ln -sf "$dest" "$link"
    echo "Enabled $name"
  fi
done

sudo nginx -t
sudo nginx -s reload
echo "Nginx reloaded."
