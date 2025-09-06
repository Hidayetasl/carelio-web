import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"\;
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, signOut, setPersistence,
  browserLocalPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"\;
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"\;

const ADMIN_EMAILS = ["hidayetaslan@gmail.com","mylife.carelio@gmail.com"];
function $(id){ return document.getElementById(id); }
function show(msg){ const h=$("hint"); if(h) h.textContent = msg || ""; }

if (!window.CARELIO_CONFIG) { show("config.js bulunamadı (CARELIO_CONFIG yok)"); throw new Error("Missing CARELIO_CONFIG"); }

const app  = initializeApp(window.CARELIO_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

// Persist
setPersistence(auth, browserLocalPersistence).catch(function(){
  return setPersistence(auth, browserSessionPersistence);
});

// Events
$("signIn").addEventListener("click", function(){
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch(function(){
    show("Popup engellendi; yönlendirme ile deniyorum…");
    return signInWithRedirect(auth, provider);
  });
});

$("signOut").addEventListener("click", function(){ signOut(auth); });

onAuthStateChanged(auth, function(user){
  if (!user){
    $("gate").style.display = "block";
    $("app").style.display  = "none";
    $("who").textContent = "—";
    return;
  }
  $("who").textContent = user.email || user.uid;
  const allowed = ADMIN_EMAILS.indexOf(user.email || "") !== -1;
  $("gate").style.display = allowed ? "none" : "block";
  $("app").style.display  = allowed ? "block" : "none";
  if (!allowed) show("Giriş başarılı ama bu hesap yönetici listesinde değil.");
});

getRedirectResult(auth).then(function(res){
  if (res && res.user){ console.log("[ADMIN] Redirect sonrası giriş:", res.user.email); }
}).catch(function(e){
  show("Redirect hatası: " + (e && e.code ? e.code : e));
});

// Lookbehind kullanmadan chunk bölücü
function splitIntoChunks(text, size){
  size = size || 600;
  const words = String(text).split(/\s+/);
  const parts = [];
  let buf = "";
  for (let i=0;i<words.length;i++){
    const w = words[i];
    const add = (buf ? " " : "") + w;
    if ((buf + add).length > size){ if (buf.trim()) parts.push(buf.trim()); buf = w; }
    else { buf += add; }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

$("saveKB").addEventListener("click", function(){
  const title = ($("title").value || "").trim();
  const tags  = ($("tags").value  || "").split(",").map(s=>s.trim()).filter(Boolean);
  const body  = ($("body").value  || "").trim();
  if (!title || !body){ show("Başlık ve içerik gerekli."); return; }

  show("Kaydediliyor…");
  addDoc(collection(db,"kb"), { title, content: body, tags, createdAt: serverTimestamp() })
  .then(function(kbRef){
    const chunks = splitIntoChunks(body, 600);
    let p = Promise.resolve(), count = 0;
    chunks.forEach(function(ch){
      p = p.then(function(){
        count++;
        return addDoc(collection(db,"chunks"), { docId: kbRef.id, docTitle: title, text: ch, summary: ch.slice(0,160), tags, source:"KB", createdAt: serverTimestamp() });
      });
    });
    return p.then(function(){
      show("KB kaydedildi. " + count + " parça (chunk) oluşturuldu.");
      $("body").value = "";
    });
  })
  .catch(function(e){ show("Hata: " + (e && e.message ? e.message : e)); });
});

// audit: 2025-09-06
