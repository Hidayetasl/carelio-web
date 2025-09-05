// ---- Carelio RAG overrides ----

// 1) Sorgu normalizasyonu (careli -> carelio, vs.)
function stripDiacritics(s) {
  try { return (s||"").normalize("NFD").replace(/\p{Diacritic}/gu, ""); }
  catch { return s || ""; }
}
function normalizeCarelioTypos(s) {
  const raw = (s||"");
  const t   = stripDiacritics(raw).toLowerCase().trim();
  const map = {
    "careli":"carelio", "carili":"carelio", "carilio":"carelio",
    "cerelio":"carelio", "karelio":"carelio", "careleo":"carelio"
  };
  if (map[t]) return map[t];
  return raw.replace(/\bcareli\b/gi, "carelio");
}

function normalizeInputsForAsk() {
  // Sayfadaki ilk text input/textarea'ları düzelt
  const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), textarea'));
  inputs.forEach(inp => {
    if (!inp.value) return;
    inp.value = normalizeCarelioTypos(inp.value);
  });
}

// "Yanıtla" tıklanmadan ÖNCE devreye girsin (capture true)
document.addEventListener("submit", (e) => { normalizeInputsForAsk(); }, true);
document.addEventListener("click", (e) => {
  const el = e.target;
  const txt = (el && (el.textContent || el.value || "")).toLowerCase();
  if (el && el.matches('button, input[type="submit"]') && /yanıtla|yanitla/.test(txt)) {
    normalizeInputsForAsk();
  }
}, true);

// 2) Yanıtta "paket/fiyat/ücret/abonelik/kampanya" görülürse Anket CTA ekle
(function attachSurveyCTA() {
  const ans = document.querySelector('#answer') || document.querySelector('[data-role="answer"]') || document.getElementById('answer');
  if (!ans) return;
  const observer = new MutationObserver(() => {
    const txt = (ans.innerText || "").toLowerCase();
    const hasKeywords = /\b(paket|fiyat|ücret|ucret|abonelik|kampanya)\b/.test(txt);
    if (hasKeywords && !ans.querySelector('.survey-cta')) {
      const div = document.createElement('div');
      div.className = 'survey-cta';
      div.style.marginTop = '10px';
      div.innerHTML = `
        <a href="/anket.html" class="btn btn-primary" style="padding:8px 12px; display:inline-block; border-radius:8px;">
          Anketi Aç
        </a>
        <small style="opacity:.8; margin-left:8px;">(Paketler için hızlı yönlendirme)</small>
      `;
      ans.appendChild(div);
    }
  });
  observer.observe(ans, { childList: true, subtree: true });
})();

// 3) TTS: "Carelio" -> "Karelio" telaffuzu ve TR dili
(function patchSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return;
  const orig = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = function(u) {
    try {
      if (u && typeof u.text === 'string') {
        u.text = u.text.replace(/carelio/gi, 'Karelio');
        if (!u.lang) u.lang = 'tr-TR';
      }
    } catch {}
    return orig(u);
  };
})();
console.debug("Carelio RAG overrides loaded.");
// ---- /overrides ----

