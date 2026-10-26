#!/usr/bin/env bash
# Startup command for the hosting panel: bash scripts/server/start.sh
# Runs the site on localhost, the Cloudflare Tunnel that brings it to the domain, and a daily backup.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; [ -f .env.production.local ] && . ./.env.production.local; set +a
PORT=${PORT:-3000}

if [ ! -d .next ]; then echo "Сайт не собран: выполните bash scripts/server/setup.sh" >&2; exit 1; fi

# Daily backup of the menu and photos into data/backups, the last 14 are kept.
backup() {
  mkdir -p data/backups
  local items=()
  [ -f data/store.json ] && items+=(store.json)
  [ -d data/uploads ] && items+=(uploads)
  [ ${#items[@]} -gt 0 ] && tar -czf "data/backups/menu-$(date +%F).tar.gz" -C data "${items[@]}"
  ls -1t data/backups/menu-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
}
( while :; do backup || true; sleep 86400; done ) &

if [ -n "${CF_TUNNEL_TOKEN:-}" ] && [ -x bin/cloudflared ]; then
  bin/cloudflared tunnel --no-autoupdate run --token "$CF_TUNNEL_TOKEN" &
else
  echo "Внимание: нет CF_TUNNEL_TOKEN или bin/cloudflared — сайт работает только внутри сервера." >&2
fi

# Only reachable through the tunnel: no plain-HTTP port is exposed.
exec node_modules/.bin/next start -H 127.0.0.1 -p "$PORT"
