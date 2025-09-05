// Carelio Auth Wiring (Firebase Hosting SDK'ları sayfada olmalı)
(function(){
  const $ = id => document.getElementById(id);
  const ready = fn => (document.readyState!=='loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  ready(async function(){
    if (!window.firebase || !firebase.apps) { console.error('Firebase SDK yok'); return; }
    const auth = firebase.auth();
    try{ await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}

    // Zaten girişli ise panele al
    auth.onAuthStateChanged(u => { if (u) location.href = '/panel.html'; });

    async function googleFlow(){
      const provider = new firebase.auth.GoogleAuthProvider();
      try { await auth.signInWithPopup(provider); location.href='/panel.html'; }
      catch (e) {
        try { await auth.signInWithRedirect(provider); }
        catch (e2){ alert('Giriş başarısız: ' + (e2?.message||e2)); }
      }
    }
    $('#btnGoogle')?.addEventListener('click', googleFlow);
    $('#btnGoogleSignup')?.addEventListener('click', googleFlow);

    // E-posta ile giriş
    $('#btnEmailIn')?.addEventListener('click', async ()=>{
      const email = ($('#emailIn')?.value||'').trim();
      const pass  = ($('#passIn')?.value||'');
      if(!email || !pass) return alert('E-posta ve şifre gerekli.');
      try{ await auth.signInWithEmailAndPassword(email, pass); location.href='/panel.html'; }
      catch(e){ alert('Giriş hatası: ' + (e?.message||e)); }
    });

    // Şifre sıfırlama
    $('#btnReset')?.addEventListener('click', async ()=>{
      const email = ($('#emailIn')?.value||'').trim();
      if(!email) return alert('Lütfen e-posta yazın.');
      try{ await auth.sendPasswordResetEmail(email); alert('Sıfırlama maili gönderildi.'); }
      catch(e){ alert('Sıfırlama hatası: ' + (e?.message||e)); }
    });

    // E-posta ile kayıt
    $('#btnEmailUp')?.addEventListener('click', async ()=>{
      const email = ($('#emailUp')?.value||'').trim();
      const pass  = ($('#passUp')?.value||'');
      if(!email || !pass) return alert('E-posta ve şifre gerekli.');
      if(pass.length<6) return alert('Şifre en az 6 karakter olmalı.');
      try{ await auth.createUserWithEmailAndPassword(email, pass); location.href='/panel.html'; }
      catch(e){ alert('Kayıt hatası: ' + (e?.message||e)); }
    });
  });
})();

