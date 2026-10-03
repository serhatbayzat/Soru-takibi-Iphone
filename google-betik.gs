/**
 * Soru Takibi · canlı paylaşım betiği (Google Apps Script)
 *
 * Öğrencinin telefonu verisini buraya gönderir, velinin telefonu buradan okur.
 * Veri, bu betiğin bağlı olduğu Google E-Tablo'da durur (sadece sizin Google hesabınızda).
 *
 * KURULUM (bir kez):
 *  1. Google Drive'da yeni bir E-Tablo açın (adı ör. "Soru Takibi veri").
 *  2. Menü: Uzantılar → Apps Script. Açılan sayfadaki her şeyi silip bu dosyanın tamamını yapıştırın, kaydedin.
 *  3. Sağ üstte Dağıt → Yeni dağıtım → (dişli) Web uygulaması.
 *       Şu kullanıcı olarak çalıştır: Ben
 *       Erişimi olanlar: Herkes
 *     Dağıt → izin isteğinde hesabınızı seçip "İzin ver" (gerekirse Gelişmiş → ... projesine git).
 *  4. Çıkan "Web uygulaması" adresini (…/exec ile biter) kopyalayın.
 *     Bu adres "bağlantı adresi"dir: öğrencinin ve velilerin uygulamasında Ayarlar → Canlı paylaşım'a yapıştırılır.
 *     Adresi sadece aile içinde paylaşın; adresi bilen veriyi görebilir.
 */

var PARCA = 45000;        // bir hücreye yazılan en çok karakter
var GUNLUK_SAKLA = 30;    // kaç günlük kopya saklansın (yanlışlıkla silmeye karşı)

function doGet(e) {
  var s = sayfa_('veri');
  var zaman = Number(s.getRange(1, 1).getValue()) || 0;
  var veri = oku_(s, 1);
  return json_({ok: true, zaman: zaman, veri: veri});
}

function doPost(e) {
  var kilit = LockService.getScriptLock();
  kilit.waitLock(20000);
  try {
    var metin = e && e.postData ? e.postData.contents : '';
    var o = JSON.parse(metin);                    // {veri: "<yedek metni>", cihaz: "..."}
    var veri = String(o.veri || '');
    if (veri.indexOf('"gunler"') < 0) return json_({ok: false, hata: 'gecersiz'});
    var simdi = Date.now();
    var s = sayfa_('veri');
    s.clear();
    yaz_(s, 1, simdi, veri);
    s.getRange(1, 2).setValue(o.cihaz || '');
    // günün son hali ayrı sayfada (en çok GUNLUK_SAKLA gün)
    var g = sayfa_('gunluk');
    var bugun = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var son = g.getLastRow();
    var satir = son + 1;
    if (son > 0 && g.getRange(son, 1).getValue() === '~' + bugun) satir = son;
    g.getRange(satir, 1, 1, Math.max(g.getMaxColumns(), 2)).clearContent();
    g.getRange(satir, 1).setValue('~' + bugun);
    var parcalar = bol_(veri);
    if (g.getMaxColumns() < parcalar.length + 1) g.insertColumnsAfter(g.getMaxColumns(), parcalar.length + 1 - g.getMaxColumns());
    g.getRange(satir, 2, 1, parcalar.length).setValues([parcalar]);
    if (g.getLastRow() > GUNLUK_SAKLA) g.deleteRows(1, g.getLastRow() - GUNLUK_SAKLA);
    return json_({ok: true, zaman: simdi});
  } catch (err) {
    return json_({ok: false, hata: String(err)});
  } finally {
    kilit.releaseLock();
  }
}

function sayfa_(ad) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(ad) || ss.insertSheet(ad);
}

function bol_(veri) {
  var out = [];
  // her parçanın başına "~" konur: hücre "=" ile başlayıp formül sanılmasın, sayıya çevrilmesin
  for (var i = 0; i < veri.length; i += PARCA) out.push('~' + veri.substring(i, i + PARCA));
  if (!out.length) out.push('~');
  return out;
}

/** 1. sütun: 1. satır zaman, 2. satırdan itibaren metin parçaları. */
function yaz_(s, sutun, zaman, veri) {
  var p = bol_(veri);
  s.getRange(1, sutun).setValue(zaman);
  var v = p.map(function (x) { return [x]; });
  s.getRange(2, sutun, v.length, 1).setValues(v);
}

function oku_(s, sutun) {
  var n = s.getLastRow();
  if (n < 2) return '';
  return s.getRange(2, sutun, n - 1, 1).getValues().map(function (r) { return String(r[0]).substring(1); }).join('');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
