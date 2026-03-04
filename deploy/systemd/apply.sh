#!/usr/bin/env bash
# Idempotent: render unit template (__APP_DIR__), daemon-reload, enable, restart.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# When called from remote-update.sh, APP_DIR is already set
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SYSTEMD_UNIT_NAME="${SYSTEMD_UNIT_NAME:-bwb-menu-online.service}"
TEMPLATE="$SCRIPT_DIR/bwb-menu-online.service"
DEST="/etc/systemd/system/$SYSTEMD_UNIT_NAME"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "No template: $TEMPLATE"
  exit 0
fi

sed "s|__APP_DIR__|$APP_DIR|g" "$TEMPLATE" | sudo tee "$DEST" >/dev/null
echo "Written $DEST"
sudo systemctl daemon-reload
sudo systemctl enable "$SYSTEMD_UNIT_NAME"
sudo systemctl restart "$SYSTEMD_UNIT_NAME"
echo "Systemd unit $SYSTEMD_UNIT_NAME enabled and restarted."
