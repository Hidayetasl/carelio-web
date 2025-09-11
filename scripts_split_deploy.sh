#!/usr/bin/env bash
set -euo pipefail

# ---- Ayarlar (gerekirse değiştir) ----
REPO_DIR="$HOME/google_web/projeler/carelio-web"
BACKUP_DIR="$HOME/github_carelio-web_backup"   # Çalışan site yedeğin
FIREBASE_DIR="$REPO_DIR/hosting_firebase"
GHPAGES_DIR="$REPO_DIR/github_pages"
AUTO_GIT_COMMIT=true   # Git commit/push otomatik olsun mu? (true/false)

# ---- Kontroller ----
[ -d "$REPO_DIR" ] || { echo "Repo klasörü yok: $REPO_DIR"; exit 1; }
[ -d "$BACKUP_DIR" ] || { echo "Yedek klasörü yok: $BACKUP_DIR"; exit 1; }

mkdir -p "$FIREBASE_DIR" "$GHPAGES_DIR"

# ---- Yedekten bağımsız kopyalar ----
rsync -av --delete "$BACKUP_DIR"/ "$FIREBASE_DIR"/
rsync -av --delete "$BACKUP_DIR"/ "$GHPAGES_DIR"/

# ---- Firebase config (hosting_firebase'i kullan) ----
cat > "$REPO_DIR/firebase.json" <<'JSON'
{
  "hosting": {
    "public": "hosting_firebase",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "cleanUrls": true
  }
}
JSON

# ---- GitHub Pages için Jekyll kapatma ----
touch "$GHPAGES_DIR/.nojekyll"

# ---- Opsiyonel: Git commit/push ----
if [ "$AUTO_GIT_COMMIT" = true ]; then
  cd "$REPO_DIR"
  current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
  git add hosting_firebase github_pages firebase.json || true
  git commit -m "Split deploy: Firebase=hosting_firebase, Pages=github_pages" || true
  git push origin "$current_branch" || true
fi

echo
echo "✅ Bitti. Sonraki adımlar:"
echo "1) GitHub Pages: Repo -> Settings -> Pages -> Source: main, Folder: /github_pages"
echo "   URL: https://<github-kullanici-adin>.github.io/carelio-web/"
echo "2) Firebase deploy:"
echo "   cd \"$REPO_DIR\" && firebase deploy --only hosting"
