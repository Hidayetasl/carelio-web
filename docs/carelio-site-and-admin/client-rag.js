// client-rag.js
export async function initClientRAG({ getDocs, collection, db }){
  const kbSnap = await getDocs(collection(db,'kb'));
  const kb = kbSnap.docs.map(d=>({id:d.id, ...d.data()}));

  const chSnap = await getDocs(collection(db,'chunks'));
  const chunks = chSnap.docs.map(d=>({id:d.id, ...d.data()}));

  return { kb, chunks };
}

function norm(s=''){
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9ğüşiöç ]/gi,' ').replace(/\s+/g,' ').trim();
}
function score(q, text){
  const qs = norm(q).split(' ');
  const ts = norm(text);
  let s=0;
  for(const w of qs){ if(w.length>2 && ts.includes(w)) s++; }
  return s;
}

export function answerWithRAG(q, kb, chunks){
  let bestKB = kb.map(it=>({it, s: score(q, it.q + ' ' + (it.tags||[]).join(' ') + ' ' + it.a)}))
                 .sort((a,b)=>b.s-a.s).slice(0,2);

  if(bestKB[0]?.s>=2){
    return { type:'kb', text: bestKB[0].it.a };
  }

  let bestCH = chunks.map(it=>({it, s: score(q, (it.text||'') + ' ' + (it.keywords||[]).join(' '))}))
                     .sort((a,b)=>b.s-a.s)[0];
  if(bestCH && bestCH.s>=2){
    const src = bestCH.it.srcName || bestCH.it.src || 'doküman';
    const text = (bestCH.it.text||'').slice(0,400) + '…';
    return { type:'doc', text: `${text}\n\nKaynak: ${src}` };
  }

  return { type:'fallback', text:'Bunu doğrudan bulamadım. Daha netleştirebilir misiniz (örn. paket fiyatları, kurulum adımları)?' };
}
// audit: 2025-09-06
