#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
REPO_PATH="${REPO_PATH:-$HOME/google_web/projeler/carelio-web}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$HOME/carelio_artifacts}"
DEPLOY_STRATEGY="${DEPLOY_STRATEGY:-auto}"
SERVICE_NAME="${SERVICE_NAME:-carelio-web}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://carelio.care/health}"
ROLLBACK_SLOTS="${ROLLBACK_SLOTS:-3}"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="${REPO_PATH}/logs"; mkdir -p "$LOG_DIR"
exec > >(tee -a "${LOG_DIR}/deploy_${STAMP}.log") 2>&1

cd "$REPO_PATH"
[ -f "logs/last_release_path.txt" ] || { echo "[ERR] last_release_path.txt bulunamadı"; exit 1; }
last_release="$(cat logs/last_release_path.txt)"
[ -d "$last_release" ] || { echo "[ERR] Release dizini yok: $last_release"; exit 1; }

detect_strategy() {
  if [ "$DEPLOY_STRATEGY" != "auto" ]; then echo "$DEPLOY_STRATEGY"; return; fi
  [ -f "docker-compose.yml" ] || [ -f "compose.yml" ] && { echo docker; return; }
  [ -f "ecosystem.config.cjs" ] || [ -f "ecosystem.config.js" ] && { echo pm2; return; }
  [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ] && { echo systemd; return; }
  [ -f "firebase.json" ] && { echo static; return; }
  echo static
}
STRAT="$(detect_strategy)"; echo "[DEPLOY] Strateji: $STRAT"

rollback() {
  echo "[ROLLBACK] Manual adımlar:"
  if [ "$STRAT" = "static" ]; then
    command -v firebase >/dev/null 2>&1 && {
      echo "  - firebase hosting:versions:list"
      echo "  - firebase hosting:rollback <VERSION_ID>"
    } || echo "  - Firebase CLI yok"
  elif [ "$STRAT" = "pm2" ]; then
    echo "  - pm2 startOrReload önceki sürüm/ekosistem"
  elif [ "$STRAT" = "docker" ]; then
    echo "  - docker compose ile önceki tag"
  elif [ "$STRAT" = "systemd" ]; then
    echo "  - systemctl restart ${SERVICE_NAME} (önceki paket)"
  fi
}

if [ "$STRAT" = "static" ]; then
  if command -v firebase >/dev/null 2>&1; then
    if command -v jq >/dev/null 2>&1 && jq -e '.hosting.public' firebase.json >/dev/null 2>&1; then
      orig_pub="$(jq -r '.hosting.public' firebase.json)"
      cp firebase.json firebase.json.bak.deploy
      tmp="$(mktemp)"; jq --arg pub "$last_release" '.hosting.public=$pub' firebase.json > "$tmp" && mv "$tmp" firebase.json
      if ! firebase deploy --only hosting; then
        echo "[ERR] Firebase deploy başarısız"; mv -f firebase.json.bak.deploy firebase.json; rollback; exit 1; fi
      mv -f firebase.json.bak.deploy firebase.json
    else
      firebase deploy --only hosting || { echo "[ERR] Deploy başarısız"; rollback; exit 1; }
    fi
  else
    echo "[ERR] Firebase CLI yok. Static rsync gerekecek."
    exit 1
  fi
elif [ "$STRAT" = "pm2" ]; then
  [ -f ecosystem.config.cjs ] && pm2 startOrReload ecosystem.config.cjs || pm2 startOrReload ecosystem.config.js
elif [ "$STRAT" = "docker" ]; then
  [ -f compose.yml ] && docker compose -f compose.yml up -d --build || docker compose up -d --build
elif [ "$STRAT" = "systemd" ]; then
  sudo systemctl daemon-reload || true
  sudo systemctl restart "$SERVICE_NAME"
fi

code=$(curl -ks -o /dev/null -w "%{http_code}" "$HEALTHCHECK_URL" || true)
echo "[HEALTH] $HEALTHCHECK_URL -> HTTP $code"
if [ "$code" -lt 200 ] || [ "$code" -ge 400 ]; then
  echo "[ERR] Healthcheck başarısız"; rollback; exit 1
fi

cd "${ARTIFACTS_DIR}/releases" 2>/dev/null || exit 0
ls -1dt */ | tail -n +$((ROLLBACK_SLOTS+1)) | xargs -r rm -rf
echo "[DEPLOY] Tamamlandı."
