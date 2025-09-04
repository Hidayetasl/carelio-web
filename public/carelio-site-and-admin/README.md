# Carelio – Ziyaretçi Asistan (RAG) + Yönetim Paneli
Bu paket iki parçadan oluşur:
- **asistan-sesli-rag.html** → Ziyaretçilerin kullanacağı sesli asistan. KB + PDF/DOCX parçalarından yanıt üretir.
- **admin.html** → Soru–Cevap (KB) ekleme ve PDF/DOCX yükleme paneli (Storage fallback içeren sürüm).

Ayrıca:
- `client-rag.js` → Chat için basit RAG mantığı
- `functions/index.js` → PDF/DOCX metin çıkarma + chunklama (Cloud Functions)
- `firestore.rules`, `storage.rules` → Güvenlik kuralları

## Dağıtım (Firebase Hosting)
- **Ziyaretçi sayfası:** `asistan-sesli-rag.html` → örn. `/asistan.html`
- **Admin paneli:** `admin.html` → örn. `/admin.html`

## Gerekli hizmetler
- Firestore (okuma: herkes, yazma: sadece admin e-postaları)
- Storage (docs klasörü; yazma: sadece admin)
- Cloud Functions (indexer): PDF/DOCX'ten metin çıkarıp Firestore `chunks` koleksiyonuna yazar.

## Hızlı kurulum
1) Hosting’e `asistan-sesli-rag.html`, `admin.html`, `client-rag.js` dosyalarını yükleyin.
2) Firestore ve Storage kurallarını yükleyin.
3) `functions/` klasöründe:
   ```bash
   cd functions
   npm init -y
   npm i pdf-parse mammoth firebase-admin firebase-functions @google-cloud/storage
   firebase deploy --only functions
   ```
4) `admin.html`’e gidin → giriş yapın → KB ekleyin, PDF/DOCX yükleyin.
5) Ziyaretçi sayfasını açın → sesli/metin soru sorun.

## Notlar
- TTS/STT: Chrome/Edge önerilir. iOS Safari'de STT sınırlı olabilir.
- Anket: “fiyat / paket / öneri” gibi niyetlerde kısa anket teklifi otomatik görünür; “Evet” denince `https://carelio-web.web.app/anket.html` açılır.
