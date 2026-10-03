# Canlı paylaşım kurulumu (bir kez, yaklaşık 15 dakika)

Öğrencinin telefonuna girilen kayıtlar velinin telefonunda (iPhone ya da Android) da görünür.
Veriler sadece kurulumu yapan velinin Google hesabındaki bir E-Tablo'da durur.

## 1. Google tarafı (bilgisayardan daha kolay)
1. drive.google.com → **Yeni → Google E-Tablolar**. Adını "Soru Takibi veri" yap.
2. Menüden **Uzantılar → Apps Script**.
3. Açılan sayfadaki yazıların hepsini sil. Bu depodaki **google-betik.gs** dosyasının tamamını kopyalayıp yapıştır. Üstteki disket simgesiyle kaydet.
4. Sağ üstte **Dağıt → Yeni dağıtım**. "Tür seçin" yanındaki dişliden **Web uygulaması**nı seç.
   - Şu kullanıcı olarak çalıştır: **Ben**
   - Erişimi olanlar: **Herkes**
5. **Dağıt**'a bas. İzin isterse hesabını seç → "Google bu uygulamayı doğrulamadı" çıkarsa **Gelişmiş → (proje adı) projesine git → İzin ver**.
6. Çıkan **Web uygulaması URL'si**ni kopyala (…/exec ile biter). Bu **bağlantı adresi**dir.

Adresi sadece aile içinde paylaş; adresi bilen veriyi görebilir.

## 2. Öğrencinin telefonu
Ayarlar → **Canlı paylaşım** → "Bu telefon öğrencinin" → adresi yapıştır → **Bağlantıyı dene** → **Kaydet**.
Bundan sonra her değişiklik birkaç saniye içinde gönderilir. İnternet yoksa bağlantı gelince gönderilir.

## 3. Velinin telefonu
- **Android:** Soru Takibi uygulamasını kur → Ayarlar → Canlı paylaşım → "Bu telefon velinin" → adres → Kaydet.
- **iPhone:** Safari'de uygulama adresini aç → Paylaş → Ana Ekrana Ekle → aç → "Veli" → adres → Kaydet.

Veli telefonu açıldığında öğrencinin son verisini alır; "Yenile" ile elle de alınır. Veli modunda kayıt girilemez.

Not: Betik her günün son halini "gunluk" sayfasında 30 gün saklar (yanlışlıkla silmeye karşı).
