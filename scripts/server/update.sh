#!/usr/bin/env bash
# Takes the latest code from GitHub and rebuilds. Menu, photos and settings in data/ are not touched.
# After it finishes, press Restart in the hosting panel.
set -euo pipefail
cd "$(dirname "$0")/../.."
git pull --ff-only
bash scripts/server/build.sh
echo "Обновлено. Нажмите Restart в панели хостинга."
