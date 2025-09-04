// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

admin.initializeApp();
const db = admin.firestore();
const { Storage } = require("@google-cloud/storage");
const gcs = new Storage();

function norm(s=''){
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
}
function chunkText(text, size=900, overlap=120){
  const res=[]; let i=0;
  while(i < text.length){
    const end = Math.min(text.length, i+size);
    res.push(text.slice(i,end));
    i = end - overlap;
    if(i<0) i=0;
  }
  return res;
}
function topKeywords(text, k=8){
  const stop = new Set('ve veya ile icin ama fakat ancak cunku mi mu ise de da ki ya yada hem'.split(' '));
  const freq = Object.create(null);
  for(const w of norm(text).split(' ')){
    if(w.length<3 || stop.has(w)) continue;
    freq[w] = (freq[w]||0)+1;
  }
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,k).map(x=>x[0]);
}

exports.indexUploadedDoc = functions.storage.object().onFinalize(async (object)=>{
  try{
    const bucket = gcs.bucket(object.bucket);
    const file = bucket.file(object.name);
    if(!object.name.startsWith('docs/')) return;
    const [buf] = await file.download();

    let text = '';
    if(object.contentType === 'application/pdf'){
      const data = await pdfParse(buf);
      text = data.text || '';
    } else if(object.contentType?.includes('word')){
      const data = await mammoth.extractRawText({ buffer: buf });
      text = data.value || '';
    } else { return; }

    text = text.replace(/\s+/g,' ').trim();
    const srcName = object.name.split('/').pop();

    const chunks = chunkText(text, 900, 120);
    const batch = db.batch();
    const col = db.collection('chunks');
    const now = admin.firestore.FieldValue.serverTimestamp();

    chunks.forEach((t)=>{
      const docRef = col.doc();
      batch.set(docRef, { text: t, src: object.name, srcName, keywords: topKeywords(t), ts: now });
    });
    await batch.commit();
    console.log('Indexed', chunks.length, 'chunks from', object.name);
  }catch(e){
    console.error('Index error', e);
  }
});
