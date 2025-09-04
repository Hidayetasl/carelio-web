Carelio • Minimal Auth + Panel (Firebase Hosting uyumlu)

Dosyalar:
- uye-girisi.html  → Google ile giriş (signInWithPopup). Girişliyse otomatik panel.html'e gider.
- panel.html       → Auth guard (giriş yoksa üye girişine atar), kullanıcı adı/foto ve çıkış butonu.

Kurulum:
1) İki dosyayı Firebase Hosting projenizin 'public/' klasörüne kopyalayın.
2) Firebase Console → Authentication → Sign-in method → Google'ı ENABLE yapın (yaptınız).
3) domain/authorized domain listesinde kendi alan adınız varsa ekli olduğundan emin olun.
4) `firebase deploy`

Notlar:
- Firebase init.js dosyası Hosting tarafından otomatik sağlanır (/__/firebase/init.js).
- İsterseniz panel.html'i sekmeli geniş panele büyütebilirsiniz (benzeri bir sürüm daha önce paylaşıldı).
