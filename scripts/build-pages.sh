#!/usr/bin/env bash
# Builds a temporary static copy of the public site for GitHub Pages into ./out-pages.
# The admin, QR redirects through the server and language detection by middleware need a real host;
# here language is picked in the browser and /t/N are small redirect pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE_PATH:-/khushbakhti-site}"
URL="${SITE_URL:-https://vudiremix.github.io$BASE}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -r "$ROOT"/{src,public,data,package.json,next.config.ts,tsconfig.json,postcss.config.mjs} "$WORK"/
ln -s "$ROOT/node_modules" "$WORK/node_modules"
rm -rf "$WORK/src/app/(admin)" "$WORK/src/components/admin" "$WORK/src/app/(site)/t" "$WORK/src/middleware.ts" "$WORK/data/store.json"
(cd "$WORK" && STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH="$BASE" SITE_URL="$URL" npx next build)
OUT="$ROOT/out-pages"
rm -rf "$OUT" && cp -r "$WORK/out" "$OUT"
touch "$OUT/.nojekyll"   # keep the _next folder

# Same rules as src/lib/locale-detect.ts, run in the browser.
DETECT='var l=(navigator.languages||[navigator.language||""]).map(function(x){return x.toLowerCase().slice(0,2)});var m={tg:"tg",zh:"zh",en:"en",ru:"ru",uz:"ru",kk:"ru",ky:"ru",uk:"ru",be:"ru",tk:"ru",az:"ru",hy:"ru",ka:"ru"};var lang="en";for(var i=0;i<l.length;i++){if(m[l[i]]){lang=m[l[i]];break}}if(!l[0])lang="ru";'
cat > "$OUT/index.html" <<HTML
<!doctype html><meta charset="utf-8"><title>Хушбахти</title><meta name="viewport" content="width=device-width,initial-scale=1">
<script>$DETECT location.replace("$BASE/"+lang+"/");</script>
<noscript><a href="$BASE/ru/">Русский</a> · <a href="$BASE/tg/">Тоҷикӣ</a> · <a href="$BASE/en/">English</a> · <a href="$BASE/zh/">中文</a></noscript>
HTML
for n in $(seq 1 60); do
  mkdir -p "$OUT/t/$n"
  cat > "$OUT/t/$n/index.html" <<HTML
<!doctype html><meta charset="utf-8"><title>Хушбахти · Стол $n</title><meta name="viewport" content="width=device-width,initial-scale=1">
<script>$DETECT location.replace("$BASE/"+lang+"/menu/?table=$n");</script>
<noscript><a href="$BASE/ru/menu/?table=$n">Меню</a></noscript>
HTML
done
echo "Static site in $OUT"
