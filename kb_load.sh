#!/usr/bin/env bash
set -euo pipefail

# >>> PROJE ID'ni kontrol et (Firebase / GCP projen)
PROJECT_ID="carelio-web"

# Araçlar
command -v jq >/dev/null 2>&1 || { echo "jq yok, kurmaya çalışıyorum..."; (brew install jq || sudo apt-get install -y jq || true); }
TOKEN="$(gcloud auth print-access-token)"
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"
NOW="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

arr_json() {
  IFS=',' read -r -a A <<< "$1"
  printf '%s\n' "${A[@]}" | jq -R -s 'split("\n") | map(select(length>0)) | map({stringValue: .})'
}

create_kb_and_chunk () {
  local DOC_ID="$1" TITLE="$2" TAGS_CSV="$3" CONTENT="$4"

  echo ">>> KB: $TITLE"
  local TAGS_JSON KB_JSON

  TAGS_JSON="$(arr_json "$TAGS_CSV")"

  KB_JSON="$(jq -n \
    --arg t "$TITLE" \
    --arg c "$CONTENT" \
    --arg now "$NOW" \
    --argjson tags "$TAGS_JSON" \
    '{fields:{
      title:{stringValue:$t},
      content:{stringValue:$c},
      createdAt:{timestampValue:$now},
      tags:{arrayValue:{values:$tags}}
    }}')"

  KB_RESP="$(curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -X POST "$BASE/kb?documentId=$DOC_ID" -d "$KB_JSON")"

  KB_NAME="$(echo "$KB_RESP" | jq -r '.name')"
  KB_ID="${KB_NAME##*/}"
  echo "    -> KB id: $KB_ID"

  CHUNK_JSON="$(jq -n \
    --arg docId "$KB_ID" \
    --arg docTitle "$TITLE" \
    --arg text "$CONTENT" \
    --arg now "$NOW" \
    --argjson tags "$TAGS_JSON" \
    '{fields:{
      docId:{stringValue:$docId},
      docTitle:{stringValue:$docTitle},
      source:{stringValue:"KB"},
      text:{stringValue:$text},
      createdAt:{timestampValue:$now},
      tags:{arrayValue:{values:$tags}}
    }}')"

  CHUNK_RESP="$(curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -X POST "$BASE/chunks" -d "$CHUNK_JSON")"

  CHUNK_NAME="$(echo "$CHUNK_RESP" | jq -r '.name')"
  CHUNK_ID="${CHUNK_NAME##*/}"
  echo "    -> CHUNK id: $CHUNK_ID"
}

# ====== İÇERİKLER ======
CARELI_NEDIR_CONTENT=$'Carelio; yalnız yaşayan 65+ bireylerin ve engelli kullanıcıların güvenli, bağımsız ve kaliteli yaşamını desteklemek üzere tasarlanmış cihaz + yazılım + insani destek + sosyal etkiyi birleştiren bir “dijital refakatçi” ekosistemidir.\n\nTemel bileşenler:\n• Akıllı asistan cihazı (görüntülü görüşme, sesli komut, hatırlatmalar)\n• Düşme / SOS ve ev içi sensörleri\n• Sağlık takibi (tansiyon, nabız vb.) ve raporlama\n• Yapay zeka destekli analiz\n• 7/24 çağrı merkezi desteği\n• Ev otomasyonu entegrasyonları\n\nAmaç: Yalnızlık ve izolasyonu azaltmak, sağlık takibini kolaylaştırmak, acil durumlarda hızlı müdahale sağlamaktır.'
PAKETLER_CONTENT=$'Carelio; yıllık üyelik modeliyle esnek paketler sunar (örnek):\n\n• Temel: Akıllı asistan + SOS butonu + sınırlı destek\n• Plus: Temel + sağlık takibi + aylık doktor/hemşire görüşmesi\n• Pro: Plus + genişletilmiş sensör seti + 7/24 çağrı merkezi + öncelikli destek\n\nNot: Paket içeriği ve fiyatlar kurum/ihale/ülke koşullarına göre özelleştirilebilir.'
DOKTOR_CONTENT=$'Doktor görüşmesi işleyişi (özet):\n1) Kullanıcı sorusunu asistan üzerinden iletir ya da planlı randevu oluşturulur.\n2) Uygun hekim/hemşire atanır; görüntülü/telefon randevusu gerçekleştirilir.\n3) Ölçüm verileri ve notlar güvenli şekilde kayda alınır; gerekirse aileye bildirilir ve takip planı yapılır.'

# ====== ÇALIŞTIR ======
create_kb_and_chunk "carelio-nedir"           "Carelio nedir?"                         "genel,nedir,carelio" "$CARELI_NEDIR_CONTENT"
create_kb_and_chunk "paketler-neler"           "Paketler neler?"                        "paket,fiyat,carelio" "$PAKETLER_CONTENT"
create_kb_and_chunk "doktor-gorusmesi-nasil"   "Doktor görüşmesi nasıl çalışır?"       "doktor,görüşme,carelio" "$DOKTOR_CONTENT"

echo "✓ KB ve chunk kayıtları tamam."
echo "Kontrol: https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/-default-/data"
