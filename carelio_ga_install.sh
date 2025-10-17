#!/usr/bin/env bash
# carelio_ga_install.sh (repo mode, GA4) — idempotent
set -Eeuo pipefail; IFS=$'\n\t'; set -f
TS="$(date +%Y-%m-%dT%H:%M:%S%z)"; MARK_START="<!-- CARELIO-GA START: ${TS} -->"; MARK_END="<!-- CARELIO-GA END -->"
MODE="repo"; APPLY=0; USE_TAG="ga4"; GA_ID=""; REPO_PATH="$(pwd)"; BRANCH="feat/ga-setup-$(date +%Y%m%d)"
PUSH=0; PR=0; VERBOSE=0; ALLOW_DIRTY=0
log(){ printf "[%s] %s\n" "$TS" "$*"; }; die(){ printf "[%s] ERROR: %s\n" "$TS" "$*\n" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "Gerekli araç yok: $1"; }
print_help(){ cat <<'H'
KULLANIM:
  ./carelio_ga_install.sh --mode=repo [--dry-run|--apply] --use=ga4 --ga-id G-XXXX \
    --repo-path PATH --branch NAME [--push] [--pr] [--allow-dirty] [--verbose]
H
}
for a in "$@"; do
  case "$a" in
    --mode=*) MODE="${a#*=}";; --apply) APPLY=1;; --dry-run) APPLY=0;;
    --use=*) USE_TAG="${a#*=}";; --ga-id=*) GA_ID="${a#*=}";;
    --repo-path=*) REPO_PATH="${a#*=}";; --branch=*) BRANCH="${a#*=}";;
    --push) PUSH=1;; --pr) PR=1;; --allow-dirty) ALLOW_DIRTY=1;; --verbose) VERBOSE=1;;
    -h|--help) print_help; exit 0;; *) die "Bilinmeyen arg: $a";;
  esac
done
[ "$MODE" = "repo" ] || die "--mode şu an sadece repo"; [ "$USE_TAG" = "ga4" ] || die "--use yalnızca ga4"
[[ "$GA_ID" =~ ^G-[A-Z0-9]+$ ]] || die "--ga-id biçimi geçersiz (örn: G-KPS9ZNVXCL)"
need git; [ -d "$REPO_PATH/.git" ] || die "Git repo bulunamadı: $REPO_PATH"; cd "$REPO_PATH"
if [ "$ALLOW_DIRTY" -eq 0 ] && [ -n "$(git status --porcelain)" ]; then die "Çalışma dizini kirli. Commit/stash ya da --allow-dirty"; fi
detected_fw="plain"
if [ -f package.json ]; then
  grep -qi '"next"' package.json && detected_fw="next"
  grep -qi '"react-scripts"' package.json && detected_fw="cra"
  grep -qi '"vite"' package.json && detected_fw="vite"
  grep -qi '"astro"' package.json && detected_fw="astro"
fi
log "[CHECK] Framework: $detected_fw"
ga4_snip(){ cat <<EOF
${MARK_START}
<!-- Google tag (gtag.js) - GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  if(typeof gtag==='function'){
    gtag('set','linker',{'domains':['careliocare.com','mycareli.com','carelio.care','carelio-web.web.app']});
    gtag('config','${GA_ID}',{cookie_domain:'auto',send_page_view:true});
  }
</script>
${MARK_END}
EOF
}
ensure_env(){ f="$1"; k="$2"; v="$3"; if [ ! -f "$f" ]; then printf "%s=%s\n" "$k" "$v" > "$f"; return; fi
  if grep -qE "^\s*${k}=" "$f"; then sed -i.bak."$TS" -E "s|^\s*${k}=.*$|${k}=${v}|g" "$f"; else printf "%s=%s\n" "$k" "$v" >> "$f"; fi
}
patch_env(){
  case "$detected_fw" in
    next) ensure_env ".env.local" "NEXT_PUBLIC_GA_ID" "$GA_ID" ;;
    vite) ensure_env ".env" "VITE_GA_ID" "$GA_ID"; ensure_env ".env.local" "VITE_GA_ID" "$GA_ID" ;;
    cra)  ensure_env ".env" "REACT_APP_GA_ID" "$GA_ID"; ensure_env ".env.local" "REACT_APP_GA_ID" "$GA_ID" ;;
    astro) ensure_env ".env" "ASTRO_PUBLIC_GA_ID" "$GA_ID"; ensure_env ".env.local" "ASTRO_PUBLIC_GA_ID" "$GA_ID" ;;
    *) ensure_env ".env.local" "GA_ID" "$GA_ID" ;;
  esac
}
insert_head(){
  t="$1"; [ -f "$t" ] || return 1
  grep -q "$GA_ID" "$t" 2>/dev/null && { echo "[SKIP] $t (GA var)"; return 0; }
  grep -q "CARELIO-GA START" "$t" 2>/dev/null && { echo "[SKIP] $t (marker var)"; return 0; }
  if ! grep -qi "</head>" "$t" && ! grep -q "</Head>" "$t"; then echo "[WARN] </head> yok: $t"; return 0; fi
  bak="${t}.bak.${TS}"; cp -a "$t" "$bak"
  if [ "$APPLY" -eq 1 ]; then
    if grep -qi "</head>" "$t"; then
      sed -i -e "/<\/head>/I{ s//$(printf '%s\n' "$(ga4_snip | sed -e 's/[\/&]/\\&/g')")\n<\/head>/ }" "$t"
    else
      sed -i -e "/<\/Head>/{ s//$(printf '%s\n' "$(ga4_snip | sed -e 's/[\/&]/\\&/g')")\n<\/Head>/ }" "$t"
    fi
    echo "[PATCH] $t (yedek: $bak)"
  else
    echo "[DRY-RUN] $t içine GA4 eklenecek (yedek: $bak)"
  fi
}
patch_plain(){
  local c=()
  [ -f "public/index.html" ] && c+=("public/index.html")
  [ -f "index.html" ] && c+=("index.html")
  if [ "${#c[@]}" -eq 0 ]; then while IFS= read -r -d '' f; do c+=("$f"); done < <(find . -maxdepth 3 -type f -iname '*.html' -print0 | head -zn 5); fi
  [ "${#c[@]}" -eq 0 ] && die "HTML dosyası bulunamadı."
  for f in "${c[@]}"; do insert_head "$f"; done
}
patch_vite_cra(){ [ -f "index.html" ] && insert_head "index.html"; [ -f "public/index.html" ] && insert_head "public/index.html"; patch_env; }
patch_astro(){
  local done=0
  if [ -d "src/layouts" ]; then while IFS= read -r -d '' f; do insert_head "$f" && done=1; done < <(find src/layouts -type f -name '*.astro' -print0 | head -zn 5 || true); fi
  [ "$done" -eq 0 ] && [ -f "src/pages/index.astro" ] && insert_head "src/pages/index.astro" && done=1
  [ "$done" -eq 0 ] && [ -f "index.html" ] && insert_head "index.html" && done=1
  [ "$done" -eq 0 ] && echo "[WARN] Astro hedefi bulunamadı; plain yol denendi."
  patch_env
}
patch_next(){
  if [ -f "pages/_document.tsx" ]; then insert_head "pages/_document.tsx"; patch_env; return; fi
  if [ -f "pages/_document.js" ]; then insert_head "pages/_document.js"; patch_env; return; fi
  if [ -f "app/layout.tsx" ] || [ -f "app/layout.js" ]; then
    local appf=""; [ -f "app/layout.tsx" ] && appf="app/layout.tsx"; [ -z "$appf" ] && [ -f "app/layout.js" ] && appf="app/layout.js"
    if [ -n "$appf" ] && (grep -q "</head>" "$appf" || grep -q "</Head>" "$appf"); then insert_head "$appf"; else
      echo "[WARN] app/layout.* içinde </head> yok; public/index.html deneniyor."; [ -f "public/index.html" ] && insert_head "public/index.html"
    fi
    patch_env; return
  fi
  echo "[WARN] Next imzaları bulunamadı; plain patch uygulanıyor."; patch_plain; patch_env
}
robots_warn(){
  [ -f "public/robots.txt" ] && grep -qi "disallow:\s*/" public/robots.txt && echo "[WARN] robots.txt geniş Disallow olabilir."
  grep -Riq "X-Robots-Tag: noindex" . 2>/dev/null && echo "[WARN] X-Robots-Tag: noindex tespit edildi."
}
git_branch(){
  git fetch --all --prune || true
  if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then git checkout "$BRANCH"; else git checkout -b "$BRANCH"; fi
}
git_commit_push(){
  if [ "$APPLY" -eq 1 ]; then
    git add -A
    if git diff --cached --quiet; then echo "[GIT] commit edecek değişiklik yok"; else git commit -m "chore(analytics): add GA4 instrumentation (${TS})" || true; fi
    if [ "$PUSH" -eq 1 ]; then git push -u origin "$BRANCH" || true
      if [ "$PR" -eq 1 ]; then
        if command -v gh >/dev/null 2>&1; then gh pr create --fill || true
        elif command -v hub >/dev/null 2>&1; then hub pull-request -m "chore(analytics): add GA4 instrumentation" || true
        else echo "[GIT] PR aracı (gh/hub) yok"; fi
      fi
    fi
  else
    echo "[DRY-RUN] git diff:"
    git --no-pager diff || true
  fi
}
log "[START] GA4 installer | mode=$MODE apply=$APPLY repo=$REPO_PATH branch=$BRANCH use=$USE_TAG"
git_branch
case "$detected_fw" in
  next) patch_next ;;
  cra|vite) patch_vite_cra ;;
  astro) patch_astro ;;
  *) patch_plain ;;
esac
robots_warn
git_commit_push
log "[DONE] GA4 tamam. GA_ID: $GA_ID"
