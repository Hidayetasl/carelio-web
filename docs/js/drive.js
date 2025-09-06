(function(){
  const ready=f=>(document.readyState!=='loading')?f():document.addEventListener('DOMContentLoaded',f);
  ready(function(){
    if(!window.CARELIO) window.CARELIO={};
    const C=window.CARELIO;
    const auth=firebase.auth(); C.auth=auth;

    // Redirect dönüşünde token'ı yakala
    auth.getRedirectResult().then(res=>{
      const t=res && res.credential && res.credential.accessToken;
      if(t){ C._driveToken=t; C._driveTokAt=Date.now(); }
    }).catch(()=>{});

    function keep(r){
      const t=r && r.credential && r.credential.accessToken;
      if(!t) throw new Error('Drive token alınamadı');
      C._driveToken=t; C._driveTokAt=Date.now(); return t;
    }

    // --- YETKİ: popup + redirect fallback ---
    C.ensureDriveToken = async function(){
      if(C._driveToken && Date.now()-C._driveTokAt < 50*60*1000) return C._driveToken;

      const p=new firebase.auth.GoogleAuthProvider();
      p.addScope('https://www.googleapis.com/auth/drive.file');

      try { return keep(await auth.currentUser.reauthenticateWithPopup(p)); }
      catch(e){
        if(e && (e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment')){
          alert('Tarayıcı açılır pencereyi engelledi. Google sayfasına yönlendirileceksiniz.');
          await auth.currentUser.reauthenticateWithRedirect(p);
          throw new Error('drive-redirect');
        }
        try { return keep(await auth.currentUser.linkWithPopup(p)); }
        catch(e2){
          if(e2 && (e2.code==='auth/popup-blocked' || e2.code==='auth/operation-not-supported-in-this-environment')){
            alert('Tarayıcı açılır pencereyi engelledi. Google sayfasına yönlendirileceksiniz.');
            await auth.currentUser.linkWithRedirect(p);
            throw new Error('drive-redirect');
          }
          throw e2;
        }
      }
    };

    // --- Yardımcılar (hep C ile) ---
    C.driveFetch = async (url, opts={})=>{
      const tok = (C._driveToken && Date.now()-C._driveTokAt<50*60*1000) ? C._driveToken : await C.ensureDriveToken();
      opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer '+tok });
      const res = await fetch(url, opts);
      if(!res.ok) throw new Error('Drive API: '+res.status+' '+await res.text());
      try { return await res.json(); } catch { return {}; }
    };

    C.driveFindOrCreate = async function(name, parent){
      const q = "name='"+name.replace(/'/g,"\\'")+"' and mimeType='application/vnd.google-apps.folder' and trashed=false"
              + (parent ? " and '"+parent+"' in parents" : " and 'root' in parents");
      const s = await C.driveFetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name)');
      if(s.files?.length) return s.files[0].id;
      const meta = { name, mimeType:'application/vnd.google-apps.folder', parents:[parent||'root'] };
      const c = await C.driveFetch('https://www.googleapis.com/drive/v3/files', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(meta)
      });
      return c.id;
    };

    // --- Asıl yükleme ---
    C.uploadToDrive = async function(){
      const inp=document.getElementById('fileInput'); if(!inp?.files?.length){ alert('Dosya seçin.'); return false; }
      const wrap=document.getElementById('upProgWrap'), bar=document.getElementById('upProg'); wrap?.classList.remove('d-none');

      try{
        const token = await C.ensureDriveToken(); // redirect olursa burada biter
        const fCarelio = await C.driveFindOrCreate('Carelio', null);
        const uid = (C.auth.currentUser && C.auth.currentUser.uid) || (C.user && C.user.uid);
        const fUser   = await C.driveFindOrCreate(uid, fCarelio);

        for(const f of inp.files){
          const meta={ name:f.name, parents:[fUser] };
          const boundary='-------314159265358979323846', d="\r\n--"+boundary+"\r\n", end="\r\n--"+boundary+"--";
          const body=new Blob([
            d,'Content-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(meta),
            d,'Content-Type: '+(f.type||'application/octet-stream')+'\r\n\r\n', new Uint8Array(await f.arrayBuffer()), end
          ], { type:'multipart/related; boundary='+boundary });

          const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{
            method:'POST', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'multipart/related; boundary='+boundary }, body
          });
          if(!r.ok) throw new Error('Yükleme başarısız: '+r.status+' '+await r.text());
          const j=await r.json();

          // Firestore'a kayıt
          await C.col('library').add({
            name:f.name, size:f.size, driveFileId:j.id, driveLink:j.webViewLink,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          if(bar) bar.style.width='100%';
        }
        alert('Drive yükleme tamamlandı.');
      }catch(e){
        if(!(e && e.message==='drive-redirect')) alert('Drive yükleme hatası: '+(e.message||e));
      }finally{
        if(bar) bar.style.width='0%';
        wrap?.classList.add('d-none');
        if(inp) inp.value='';
      }
      return false;
    };

    // Varsayılan upload'ı Drive'a yönlendir
    C.upload = C.uploadToDrive;

    // “Yükle” butonlarını bağla + metin yakalayıcı
    ['#btnUpload','#uploadBtn','button[data-role="upload"]','form#uploadForm button[type="submit"]','.kutuphane form button[type="submit"]']
    .forEach(sel=>{
      const el=document.querySelector(sel);
      if(el && !el._carelioBind){ el._carelioBind=true; el.addEventListener('click',(e)=>{ e.preventDefault(); C.uploadToDrive(); }); }
    });
    document.addEventListener('click',(e)=>{
      const btn=e.target.closest('button'); if(!btn) return;
      const t=(btn.textContent||'').trim().toLowerCase();
      if(t==='yükle'){ e.preventDefault(); e.stopPropagation(); C.uploadToDrive(); }
    }, true);
  });
})();
// audit: 2025-09-06
