#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
REPO_PATH="${REPO_PATH:-$HOME/google_web/projeler/carelio-web}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
WORK_BRANCH="${WORK_BRANCH:-fix/maintenance-$(date +%Y%m%d)}"
NODE_VERSION="${NODE_VERSION:-lts/*}"
BUILD_CMD="${BUILD_CMD:-auto}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$HOME/carelio_artifacts}"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="${REPO_PATH}/logs"; mkdir -p "$LOG_DIR" "$ARTIFACTS_DIR"
exec > >(tee -a "${LOG_DIR}/build_${STAMP}.log") 2>&1
cd "$REPO_PATH"

if [ -d ".git" ]; then
  git switch "$MAIN_BRANCH" 2>/dev/null || git checkout "$MAIN_BRANCH" || true
  git pull --rebase || true
  git switch -c "$WORK_BRANCH" 2>/dev/null || git switch "$WORK_BRANCH"
  echo "[GIT] Branch: $WORK_BRANCH"
fi

# Node/NPM: Brew varsa node@20, yoksa nvm
if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "[NODE] brew install node@20"
    brew install node@20 || true
    brew link --overwrite --force node@20 || true
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  echo "[NODE] nvm kuruluyor"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
fi
echo "[NODE] $(node -v) / npm $(npm -v)"

# Kurulum & kalite
npm ci || npm install
npm run lint --if-present || true
npm run format --if-present || npx prettier -w . || true
npm test --if-present || true
npx tsc --noEmit --skipLibCheck || true
npm audit fix --audit-level=moderate || true

# Build komutu tespiti
PKG="$(cat package.json 2>/dev/null || echo '{}')"
if [ "$BUILD_CMD" = "auto" ]; then
  if echo "$PKG" | grep -q '"build"'; then
    BUILD_CMD="npm run build"
  elif [ -f "firebase.json" ] && [ -d "hosting_firebase" ]; then
    BUILD_CMD="echo '(static) build yok - hosting_firebase hazır'"
  else
    BUILD_CMD="echo 'Build script bulunamadı, statik varsayıldı.'"
  fi
fi
echo "[BUILD] $BUILD_CMD"
bash -lc "$BUILD_CMD"

# Artefact çıkarımı
GITSHA="$(git rev-parse --short HEAD 2>/dev/null || echo nosha)"
RELEASE_DIR="${ARTIFACTS_DIR}/releases/${GITSHA}-${STAMP}"
mkdir -p "$RELEASE_DIR"
if [ -d "dist" ]; then
  rsync -a dist/ "$RELEASE_DIR/"
elif [ -d "build" ]; then
  rsync -a build/ "$RELEASE_DIR/"
elif [ -d ".next" ] && [ -d "public" ]; then
  rsync -a .next/ "$RELEASE_DIR/.next/"
  rsync -a public/ "$RELEASE_DIR/public/"
elif [ -d "hosting_firebase" ]; then
  rsync -a hosting_firebase/ "$RELEASE_DIR/"
else
  rsync -a ./ "$RELEASE_DIR/" --exclude '.git' --exclude 'node_modules' --exclude '.next/cache' --exclude '.firebase'
fi

# Ön-sıkıştırma (varsa)
command -v brotli >/dev/null 2>&1 && find "$RELEASE_DIR" \( -name '*.js' -o -name '*.css' \) -type f -print0 | xargs -0 -r -I{} brotli -f {}
command -v gzip   >/dev/null 2>&1 && find "$RELEASE_DIR" \( -name '*.js' -o -name '*.css' \) -type f -print0 | xargs -0 -r -I{} gzip -f -k {}

echo "$RELEASE_DIR" > "logs/last_release_path.txt"
echo "[ARTIFACT] $RELEASE_DIR"

if [ -d ".git" ]; then
  git add -A || true
  git commit -m "chore(maintenance): lint/format/build & artifact (${GITSHA}-${STAMP})" || true
fi
echo "[DONE] Build & artefact tamam."
