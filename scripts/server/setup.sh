#!/usr/bin/env bash
# One-time setup on the server (run over SSH from the project folder): bash scripts/server/setup.sh
# Asks for the settings, writes .env.production.local, installs and builds the site, downloads cloudflared.
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV_FILE=.env.production.local

major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$major" -lt 22 ]; then
  echo "Нужен Node.js 22 или новее (сейчас: $(node -v 2>/dev/null || echo нет)). Выберите его в панели хостинга." >&2
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  echo "Настройки уже есть в $ENV_FILE — оставляю их. Чтобы ввести заново, удалите этот файл."
else
  read -rp "Домен сайта (например khushbakhti.com): " domain
  domain=${domain#https://}; domain=${domain%%/*}
  while :; do
    read -rsp "Пароль админки (не короче 12 символов): " pw; echo
    [ ${#pw} -ge 12 ] && break
    echo "Слишком короткий, ещё раз."
  done
  read -rp "Токен Cloudflare Tunnel (длинная строка после --token): " token
  read -rp "Ключ Google Translate (Enter — пропустить): " gkey
  umask 077
  {
    echo "SITE_URL=https://$domain"
    echo "ADMIN_PASSWORD=$pw"
    echo "SESSION_SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    echo "CF_TUNNEL_TOKEN=$token"
    [ -n "$gkey" ] && echo "GOOGLE_TRANSLATE_API_KEY=$gkey"
  } > "$ENV_FILE"
  echo "Настройки сохранены в $ENV_FILE"
fi

bash scripts/server/build.sh

case "$(uname -m)" in
  x86_64) arch=amd64 ;; aarch64|arm64) arch=arm64 ;; *) echo "Неизвестная архитектура $(uname -m)" >&2; exit 1 ;;
esac
mkdir -p bin
if [ ! -x bin/cloudflared ]; then
  echo "Скачиваю cloudflared…"
  curl -fsSL -o bin/cloudflared "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$arch"
  chmod +x bin/cloudflared
fi
echo
echo "Готово. В панели хостинга укажите команду запуска:  bash scripts/server/start.sh  — и нажмите Restart."
