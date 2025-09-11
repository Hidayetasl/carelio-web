// ===== Carelio Debug Kit v1 =====
// Aktif: URL'ye ?debug=1 ekleyin
(function () {
  const params = new URLSearchParams(location.search);
  const ON = params.get('debug') === '1';
  if (!ON) return;

  // UI bar
  const bar = document.createElement('div');
  Object.assign(bar.style, {
    position:'fixed',left:'0',right:'0',bottom:'0',zIndex:'99999',
    background:'#111',color:'#0f0',font:'12px/1.3 monospace',
    padding:'6px 8px',maxHeight:'30vh',overflowY:'auto',
    borderTop:'1px solid #333', whiteSpace:'pre-wrap'
  });
  bar.id = 'carelio-debug-bar';
  document.body.appendChild(bar);
  const log = (...a)=>{ bar.append(document.createTextNode(a.join(' ')+'\n')); };

  log('🚦 Carelio Debug açık. Sayfa:', location.pathname+location.search);

  // JS errors
  window.addEventListener('error', (e) => {
    log('❌ JS Error:', e.message, ' @', e.filename+':'+e.lineno);
  });
  window.addEventListener('unhandledrejection', (e) => {
    log('❌ Promise Rejection:', String(e.reason));
  });

  // Resource load errors
  window.addEventListener('error', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'IMG' || t.tagName === 'SCRIPT' || t.tagName === 'LINK')) {
      const src = t.src || (t.href || '');
      log('🚫 Resource yüklenemedi:', t.tagName, src);
    }
  }, true);

  // fetch wrap
  const SLOW = 2500;
  const _fetch = window.fetch;
  window.fetch = async function(url, opts){
    const t0 = performance.now();
    try{
      const res = await _fetch(url, opts);
      const dt = Math.round(performance.now()-t0);
      const u = (typeof url==='string')?url:(url && url.url);
      if (!res.ok) log((res.status===0?'🚫':'⚠️')+' fetch '+res.status+':', u);
      if (dt > SLOW) log('🐢 Yavaş fetch ('+dt+'ms):', u);
      return res;
    }catch(err){
      log('❌ fetch hata:', String(err));
      throw err;
    }
  };

  // XHR wrap
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url){
    this.__dbg = {method, url, t0:0};
    return _open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(){
    const xhr = this;
    xhr.__dbg.t0 = performance.now();
    xhr.addEventListener('loadend', function(){
      const dt = Math.round(performance.now()-xhr.__dbg.t0);
      const st = xhr.status;
      if (st === 0) log('🚫 XHR iptal/bloklandı:', xhr.__dbg.url);
      else if (st < 200 || st >= 300) log('⚠️ XHR '+st+':', xhr.__dbg.url);
      if (dt > SLOW) log('🐢 Yavaş XHR ('+dt+'ms):', xhr.__dbg.url);
    });
    return _send.apply(this, arguments);
  };

  // Duplicate header detector
  function detectDuplicateHeader(){
    const navs = Array.from(document.querySelectorAll('header nav, #site-header nav'));
    if (navs.length >= 2){
      log('🧱 ÇİFT MENÜ tespit edildi: nav sayısı =', String(navs.length));
      navs.forEach((n,i)=>log('   • nav['+i+']:', cssPath(n)));
    } else {
      log('✅ Çift menü görünmüyor.');
    }
  }
  function cssPath(el){
    if (!el || el.nodeType !== 1) return '';
    const sel = el.id ? '#'+el.id :
      el.className ? el.tagName.toLowerCase()+'.'+Array.from(el.classList).join('.') :
      el.tagName.toLowerCase();
    if (!el.parentElement) return sel;
    return cssPath(el.parentElement)+' > '+sel;
  }
  detectDuplicateHeader();

  // iFrame slow warn
  const iframes = Array.from(document.querySelectorAll('iframe'));
  iframes.forEach((f)=>{
    const src = f.getAttribute('src') || '';
    const timer = setTimeout(()=>{
      log('⏳ iFrame geç yükleniyor (5sn+):', src, ' — X-Frame-Options/CSP/CORS kontrol et.');
    }, 5000);
    f.addEventListener('load', ()=>clearTimeout(timer));
  });

  // Case sensitivity warnings
  document.querySelectorAll('a[href]').forEach(a=>{
    const href = a.getAttribute('href');
    if (href && /\.html(\?|$)/.test(href)) {
      const hasUpper = /[A-Z]/.test(href.split('?')[0]);
      if (hasUpper) log('🔎 Büyük/küçük harf duyarlı link:', href, ' → Sunucuda birebir eşleşmeli!');
    }
  });

  // Cache buster check
  ['app.js','styles.css','header.html','footer.html'].forEach(kritik=>{
    const found = Array.from(document.querySelectorAll(`script[src*="${kritik}"],link[href*="${kritik}"]`));
    found.forEach(el=>{
      const url = el.src || el.href || '';
      if (!/\?v=/.test(url)) log('💡 Cache buster yok:', url, ' → ?v=YYYYMMDD ekle');
    });
  });

  log('🧰 Hata Analizi aktif. DevTools Network/Console ile birlikte izleyin. (?debug=1)');
})();