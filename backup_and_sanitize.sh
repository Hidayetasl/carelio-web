#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
REPO_PATH="${REPO_PATH:-$HOME/google_web/projeler/carelio-web}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/carelio}"
ROLLBACK_SLOTS="${ROLLBACK_SLOTS:-3}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_DIR}/${STAMP}"
LOG_DIR="${REPO_PATH}/logs"; mkdir -p "$LOG_DIR" "$BACKUP_DIR"
exec > >(tee -a "${LOG_DIR}/backup_${STAMP}.log") 2>&1
echo "[BACKUP] Kaynak: $REPO_PATH -> Hedef: $DEST"
sudo mkdir -p "$DEST"
sudo rsync -a --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.next/cache' \
  --exclude 'dist' --exclude 'build' --exclude '.firebase' \
  "$REPO_PATH"/ "$DEST/repo/"
# (Opsiyonel) DB dump örnekleri:
# mysqldump -u root -p --databases carelio > "$DEST/db/carelio.sql" || true
# pg_dump -Fc -f "$DEST/db/carelio.dump" carelio || true
echo "[BACKUP] SHA256 checksum oluşturuluyor..."
( cd "$DEST" && find repo -type f -print0 | xargs -0 sha256sum > checksums.txt )
echo "[BACKUP] Rotasyon: Son ${ROLLBACK_SLOTS} saklanacak"
cd "$BACKUP_DIR"; ls -1dt */ | tail -n +$((ROLLBACK_SLOTS+1)) | xargs -r sudo rm -rf
echo "[BACKUP] Tamamlandı -> $DEST"
