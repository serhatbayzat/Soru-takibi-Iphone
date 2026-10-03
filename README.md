# Soru Takibi – iPhone sürümü

Öğrencinin haftalık ders programına göre her gün çözdüğü soru, doğru ve yanlış sayılarını, yanlış soruları
ve sebeplerini girip raporu resim olarak WhatsApp'tan gönderdiği web uygulaması. Android sürümüyle aynı
özelliklere ve aynı yedek biçimine sahiptir (yanlış soru girişi, yeniden çözme, haftalık koç raporu, kitaplar,
canlı paylaşım).

**Kullanım:** Adresi iPhone'da Safari ile açın → Paylaş → **Ana Ekrana Ekle**.

- Veriler kullanan kişinin telefonunda tutulur; bu depoya gelmez.
- Canlı paylaşım (öğrenci → veli) için: [KURULUM.md](KURULUM.md)
- Yeni sürüm bu depoya konunca uygulama bir sonraki açılışta kendiliğinden güncellenir.

Geliştirici notu: `veri.js` Android kaynağından `tools/web_veri.py` ile üretilir; `cekirdek.js` Android'deki
Store/Kaynaklar/Konular/Tekrar/Degerlendirme sınıflarının birebir karşılığıdır. Güncellemede `sw.js` içindeki
`CACHE` adı değiştirilir.
