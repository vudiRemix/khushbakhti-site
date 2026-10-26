#!/usr/bin/env bash
# Installs dependencies and builds the site. 2 GB of RAM is enough; the heap limit keeps the build from being killed.
set -euo pipefail
cd "$(dirname "$0")/../.."
npm ci --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=1400 npx next build
