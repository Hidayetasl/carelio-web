// client-rag.v2.js — Clean minimal RAG client (Firestore only, tags-first)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

if (!window.CARELIO_CONFIG) {
  console.error("Missing CARELIO_CONFIG. Create public/config.js from config.sample.js");
}

const app = initializeApp(window.CARELIO_CONFIG);
const db  = getFirestore(app);

const NORMALIZE_MAP = new Map([
  ["careli","carelio"],["cäreli","carelio"],["carrelio","carelio"],["carelioo","carelio"]
]);

export const normalize = (s) => {
  let out = s.toLowerCase().trim();
  NORMALIZE_MAP.forEach((v,k)=> { out = out.replaceAll(k, v); });
  // turkish accents fold (roughly)
  out = out.replaceAll("ı","i").replaceAll("İ","i").replaceAll("ö","o").replaceAll("ü","u").replaceAll("ş","s").replaceAll("ğ","g").replaceAll("ç","c");
  return out;
};

function guessTags(text){
  const t = normalize(text);
  const tags = [];
  if (t.includes("paket")) tags.push("paket");
  if (t.includes("fiyat") || t.includes("ücret")) tags.push("fiyat");
  if (t.includes("doktor") || t.includes("görüntülü")) tags.push("doktor");
  if (t.includes("acil") || t.includes("alarm")) tags.push("acil");
  if (t.includes("kurulum")) tags.push("kurulum");
  if (t.includes("carelio")) tags.push("carelio");
  return [...new Set(tags)];
}

async function findByTags(tags){
  if (!tags.length) return [];
  const col = collection(db,"chunks");
  // array-contains-any up to 10
  const qy  = query(col, where("tags","array-contains-any", tags.slice(0,10)), orderBy("createdAt","desc"), limit(20));
  const snap = await getDocs(qy);
  const rows = [];
  snap.forEach(d => rows.push({id:d.id, ...d.data()}));
  return rows;
}

async function fallbackRecent(){
  const col = collection(db,"chunks");
  const qy  = query(col, orderBy("createdAt","desc"), limit(20));
  const snap = await getDocs(qy);
  const rows = [];
  snap.forEach(d => rows.push({id:d.id, ...d.data()}));
  return rows;
}

function localFilter(rows, q){
  const t = normalize(q);
  const terms = [...new Set(t.split(/[^a-z0-9]+/).filter(Boolean))];
  const score = (r)=>{
    const text = normalize((r.text||"")+" "+(r.summary||"")+" "+(r.title||"")+" "+(r.docTitle||""));
    let s=0;
    for(const w of terms){ if (text.includes(w)) s+=1; }
    // tag matches are stronger
    if (Array.isArray(r.tags)) for (const tg of r.tags){ if (terms.includes(tg)) s+=2; }
    return s;
  };
  return rows.map(r => ({...r, _s:score(r)})).filter(r=>r._s>0).sort((a,b)=>b._s-a._s);
}

function chooseAnswer(q, rows){
  const t = normalize(q);
  const top3 = rows.slice(0,3);
  const sources = top3.map(r => `• ${r.docTitle || r.title || "Kaynak"} – ${r.source || "KB"}`);
  let text = "";

  if (t.includes("paket") && (t.includes("fiyat") || t.includes("ücret"))) {
    text = "Paket fiyatları için kısa anketi açıyorum. Cevaplarınıza göre en uygun teklif otomatik çıkar.";
    text += "\n\nKaynaklar:\n"+sources.join("\n");
    text += "\n\n[Anketi Aç](/anket.html)";
  } else if (t.includes("acil")) {
    text = "Acil durumda: çağrı merkezi tetiklenir, yakın bilgilendirilir, istenirse akıllı kapı kilidi açılır ve lokasyon paylaşılır.";
    text += "\n\nKaynaklar:\n"+sources.join("\n");
  } else {
    const best = rows[0];
    text = (best?.summary || best?.text || "Bilgiyi özetledim.") + "\n\nKaynaklar:\n" + sources.join("\n");
  }
  const keywords = ["carelio","paket","fiyat","doktor","acil","kurulum"];
  return { text, sources, keywords };
}

export async function ask(q){
  const tags = guessTags(q);
  let rows = await findByTags(tags);
  if (!rows.length) rows = await fallbackRecent();
  const filtered = localFilter(rows, q);
  const used = filtered.length ? filtered : rows;
  return chooseAnswer(q, used);
}

// Expose for inline use
window.CarelioRAG = { ask };
console.log("Carelio RAG client ready.");
// --- EXTRA NORMALIZE (safe append) ---
try{
  const __extra = [["careli","carelio"],["kareli","carelio"],["karelio","carelio"]];
  if (typeof NORMALIZE !== "undefined" && NORMALIZE instanceof Map) {
    __extra.forEach(([k,v])=>NORMALIZE.set(k,v));
  } else if (window.CARELIO && window.CARELIO.NORMALIZE instanceof Map) {
    __extra.forEach(([k,v])=>window.CARELIO.NORMALIZE.set(k,v));
  }
}catch(e){ console.warn("normalize extra skip:", e); }

// audit: 2025-09-06
