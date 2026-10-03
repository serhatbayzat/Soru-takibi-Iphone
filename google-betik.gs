// Soru Takibi canlı paylaşım betiği. Kurulum: KURULUM.md
var PARCA = 45000, GUNLUK_SAKLA = 30;

function doGet(e) {
  var s = sayfa_('veri');
  return json_({ok: true, zaman: Number(s.getRange(1, 1).getValue()) || 0, veri: oku_(s)});
}

function doPost(e) {
  var kilit = LockService.getScriptLock();
  kilit.waitLock(20000);
  try {
    var o = JSON.parse(e.postData.contents);
    var veri = String(o.veri || '');
    if (veri.indexOf('"gunler"') < 0) return json_({ok: false, hata: 'gecersiz'});
    var simdi = Date.now();
    var s = sayfa_('veri');
    s.clear();
    s.getRange(1, 1).setValue(simdi);
    s.getRange(1, 2).setValue(o.cihaz || '');
    var p = bol_(veri);
    s.getRange(2, 1, p.length, 1).setValues(p.map(function (x) { return [x]; }));
    var g = sayfa_('gunluk');
    var bugun = '~' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var son = g.getLastRow(), satir = son + 1;
    if (son > 0 && g.getRange(son, 1).getValue() === bugun) satir = son;
    if (g.getMaxColumns() < p.length + 1) g.insertColumnsAfter(g.getMaxColumns(), p.length + 1 - g.getMaxColumns());
    g.getRange(satir, 1, 1, g.getMaxColumns()).clearContent();
    g.getRange(satir, 1, 1, p.length + 1).setValues([[bugun].concat(p)]);
    if (g.getLastRow() > GUNLUK_SAKLA) g.deleteRows(1, g.getLastRow() - GUNLUK_SAKLA);
    return json_({ok: true, zaman: simdi});
  } catch (err) {
    return json_({ok: false, hata: String(err)});
  } finally {
    kilit.releaseLock();
  }
}

// Betik bir E-Tablo'ya bağlı değilse kendi tablosunu açar ("Soru Takibi Veri (betik)").
function tablo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty('tablo');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (x) {} }
  ss = SpreadsheetApp.create('Soru Takibi Veri (betik)');
  pr.setProperty('tablo', ss.getId());
  return ss;
}

function sayfa_(ad) {
  var ss = tablo_();
  return ss.getSheetByName(ad) || ss.insertSheet(ad);
}

// Her parçanın başına "~": hücre formül ya da sayı sanılmasın.
function bol_(veri) {
  var out = [];
  for (var i = 0; i < veri.length; i += PARCA) out.push('~' + veri.substring(i, i + PARCA));
  return out.length ? out : ['~'];
}

function oku_(s) {
  var n = s.getLastRow();
  if (n < 2) return '';
  return s.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]).substring(1); }).join('');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Kurulumda bir kez "Çalıştır" ile izin vermek için.
function kurulum() { sayfa_('veri'); }
