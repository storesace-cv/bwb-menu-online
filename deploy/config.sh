# Defaults for BWB Menu Online deploy
# Source this from update.sh (local) or remote-update.sh (server) as needed.

APP_DIR="${APP_DIR:-/opt/bwb-menu-online}"
APP_SERVICE_NAME="${APP_SERVICE_NAME:-bwb-menu-online}"
SYSTEMD_UNIT_NAME="${SYSTEMD_UNIT_NAME:-bwb-menu-online.service}"
APP_HEALTH_URL="${APP_HEALTH_URL:-http://127.0.0.1:8103/api/health}"
NGINX_SITES_SRC="${NGINX_SITES_SRC:-$APP_DIR/deploy/nginx/sites-available}"
NGINX_SITES_AVAILABLE="${NGINX_SITES_AVAILABLE:-/etc/nginx/sites-available}"
NGINX_SITES_ENABLED="${NGINX_SITES_ENABLED:-/etc/nginx/sites-enabled}"
SUPABASE_INSTANCE_DIR="${SUPABASE_INSTANCE_DIR:-/srv/supabase/instances/menu-online}"

# Postgres container da instância menu-online (para migrations)
SUPABASE_POSTGRES_CONTAINER="${SUPABASE_POSTGRES_CONTAINER:-menu-online-db-1}"
