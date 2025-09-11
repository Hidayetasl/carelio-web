// Header/Footer Injector with guard + GitHub Pages uyumlu kök yolu
(function(){
  if (window.__HEADER_FOOTER_INJECTED__) return;
  window.__HEADER_FOOTER_INJECTED__ = true;

  function getSiteRoot(){
    var host = location.hostname;
    var path = location.pathname;
    // GitHub Pages (user.github.io/repo/…): ilk klasörü kök kabul et
    if (host.endsWith('github.io')){
      var parts = path.split('/').filter(Boolean);
      if (parts.length > 0) return '/' + parts[0] + '/';
    }
    return '/';
  }
  var ROOT = getSiteRoot();

  function ensure(id, tag){
    var el = document.getElementById(id);
    if (!el){
      el = document.createElement(tag || 'div');
      el.id = id;
      if (id === 'site-header'){
        document.body.insertBefore(el, document.body.firstChild);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  async function inject(id, file){
    var host = ensure(id, id==='site-header'?'header':'footer');
    if (host.childElementCount > 0) return; // ikinci kez basma
    var url = ROOT + 'kit/kit-partials/' + file + '?v=1';
    try{
      var res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      var html = await res.text();
      host.insertAdjacentHTML('beforeend', html);
    }catch(e){
      console.error('Inject failed:', url, e);
      host.insertAdjacentHTML('beforeend',
        '<div style="background:#fee;border:1px solid #f99;padding:.5rem">Yüklenemedi: '+file+'</div>');
    }
  }

  inject('site-header', 'header.html');
  inject('site-footer', 'footer.html');
})();