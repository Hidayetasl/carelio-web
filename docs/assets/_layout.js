(async function () {
  // Parçayı yükleyip DOM'a yerleştir
  async function inject(id, url, position='start') {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return;
      const html = await res.text();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;

      const host = document.body;
      if (id === 'site-header') {
        // body'nin en başına yerleştir
        host.insertBefore(wrapper, host.firstChild);
      } else if (id === 'site-footer') {
        // body'nin sonuna yerleştir
        host.appendChild(wrapper);
      }
    } catch (e) {
      console.warn('inject failed', id, e);
    }
  }

  // Header + Footer ekle
  await inject('site-header', 'partials/header.html', 'start');
  await inject('site-footer', 'partials/footer.html', 'end');

  // Yıl
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  // Basit oturum durumu: localStorage.userName varsa "user" görünümü
  const userName = localStorage.getItem('userName'); // girişte set edeceğiz
  document.querySelectorAll('[data-auth="guest"]').forEach(el => {
    if (userName) el.classList.add('hidden');
  });
  document.querySelectorAll('[data-auth="user"]').forEach(el => {
    if (!userName) el.classList.add('hidden');
  });
  const navUserName = document.getElementById('navUserName');
  if (navUserName && userName) navUserName.textContent = userName;

  // Çıkış
  const logout = document.getElementById('logoutLink');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('userName');   // basit logout
      // Ana sayfaya dön ve header yine görünsün
      location.href = 'index.html';
    });
  }
})();
