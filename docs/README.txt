Carelio • Üyelik ve Panel (auth.html + panel.html)

1) Bu iki dosyayı projenizin PUBLIC klasörüne kopyalayın:
   ~/google_web/projeler/carelio-web/public

2) Her iki dosyada da firebaseConfig içindeki
   API_KEY ve APP_ID alanlarını kendi proje değerlerinizle değiştirin.
   (Firebase Console → Project settings → Web app (</>) → Config)

3) Firebase Console → Authentication:
   - Sign-in method: Google (Enable), Facebook (Enable - opsiyonel)
   - Authorized domains: carelio-web.web.app (+ preview domainleriniz)

4) Firestore → Rules (kişiye özel erişim için öneri):
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /users/{uid}/{doc=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }

5) Menüde Üye Girişi linkini /auth.html yapın.
   Giriş yapan kullanıcı otomatik /panel.html’e yönlendirilir.

6) Yayın:
   cd ~/google_web/projeler/carelio-web
   firebase deploy --only hosting
