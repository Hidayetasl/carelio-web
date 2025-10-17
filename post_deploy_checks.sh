#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://carelio.care/health}"
HOME_URL="${HOME_URL:-https://carelio-web.web.app/}"
LOG_ERR_PAT='(ERROR|Error|Exception|Unhandled|stack|panic)'

echo "[CHECK] Health HEADERS:"
curl -sSL -D- -o /dev/null "$HEALTHCHECK_URL" | sed -n '1,20p'
echo "[CHECK] Ana sayfa kodu:"
code=$(curl -s -o /dev/null -w "%{http_code}" "$HOME_URL"); echo "[HTTP] $HOME_URL -> $code"

time_total=$(curl -s -o /dev/null -w "%{time_total}" "$HOME_URL")
size_download=$(curl -s -o /dev/null -w "%{size_download}" "$HOME_URL")
echo "[METRIC] total: ${time_total}s, size: ${size_download}B"

if command -v pm2 >/dev/null 2>&1; then
  echo "[LOG] PM2 tarama:"
  pm2 logs --lines 200 --nostream | grep -E "$LOG_ERR_PAT" || echo "[OK] kritik log yok"
fi
if command -v docker >/dev/null 2>&1; then
  echo "[LOG] Docker tarama:"
  docker ps --format '{{.Names}}' | xargs -r -I{} sh -c "echo '--- {} ---'; docker logs --tail=200 {} 2>&1 | grep -E \"$LOG_ERR_PAT\" || echo '[OK] {} temiz'"
fi
echo "[DONE] post-deploy checks tamam."
