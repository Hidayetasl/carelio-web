// Carelio Panel Guard (Firebase Auth gerekli)
(function(){
  const ready = fn => (document.readyState!=='loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);
  ready(function(){
    if (!window.firebase) { console.error('Firebase SDK yok'); return; }
    const auth = firebase.auth();
    auth.onAuthStateChanged(user=>{
      if(!user){ location.href='/auth'; return; }  // /auth rotan varsa
      const name = user.displayName || 'Kullanıcı';
      const photo = user.photoURL || ('https://ui-avatars.com/api/?name='+encodeURIComponent(name));
      const nameEl  = document.getElementById('userName');
      const photoEl = document.getElementById('userPhoto');
      const outEl   = document.getElementById('signOutBtn');
      if(nameEl)  nameEl.textContent = name;
      if(photoEl) photoEl.src = photo;
      if(outEl)   outEl.addEventListener('click', ()=> auth.signOut().then(()=>location.href='/auth'));
    });
  });
})();

