// Soru Takibi çekirdeği: Android sürümündeki Store, Kaynaklar, Konular, Tekrar ve Degerlendirme
// sınıflarının birebir JavaScript karşılığı. Ekran kodu yok; Node'da da çalışır (testler için).
(function (kok) {
"use strict";
var V = kok.VERI || (typeof require !== "undefined" ? require("./veri.js") : null);

// ================================================================== tarih yardımcıları
var GUN = ["", "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
var GUNK = ["", "Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
var GUN_RENK = ["", "#F2C4DE", "#F7C9CF", "#F8C98B", "#F6DC7A", "#BFE0A8", "#B5DDF0", "#D7C8F0"];
function pad(n) { return (n < 10 ? "0" : "") + n; }
function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parse(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0); }
function dow(d) { return d.getDay() + 1; } // 1 = Pazar … 7 = Cumartesi (Android Calendar ile aynı)
function bugun() { var d = new Date(); d.setHours(12, 0, 0, 0); return d; }
function gunEkle(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function tarihYazi(d) { return d.getDate() + " " + AY[d.getMonth()] + " " + GUN[dow(d)]; }
function pazartesi(d) { return gunEkle(d, -((dow(d) + 5) % 7)); }
function trBuyuk(s) { return s.toLocaleUpperCase("tr-TR"); }
function round(x) { return Math.floor(x + 0.5); } // Java Math.round
function basari(s, d) { return s > 0 ? round(d * 100 / s) : 0; }
function net(d, y) {
  var n = Math.round((d - y / 3) * 100) / 100;
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, "").replace(".", ",");
}

// ================================================================== Store
var SEBEPLER = V.SEBEPLER, NEDENLER = V.SEBEPLER.slice(1), GRUP = V.GRUP, GRUP_AD = V.GRUP_AD, KISA = V.KISA;
var KONU_EKSIGI = SEBEPLER[0], HATALI = SEBEPLER[11];
var G_BILGI = 0, G_OKUMA = 1, G_DIKKAT = 2, G_ZAMAN = 3, G_TAHMIN = 4, G_YOK = -1;
var DERSLER = V.DERSLER, SAATLER = V.SAATLER;
var VARSAYILAN = {2: ["Sosyal Bilgiler", "Matematik", "Matematik", "Fen ve Teknoloji", "İngilizce"],
  3: ["Sosyal Bilgiler", "Matematik", "Fen ve Teknoloji", "Türkçe", "İngilizce"],
  4: ["Din K. ve A. Bil.", "Matematik", "Matematik", "İngilizce", "Türkçe"],
  5: ["İngilizce", "Fen ve Teknoloji", "Türkçe", "Almanca", "Matematik"],
  6: ["Sosyal Bilgiler", "Türkçe", "Matematik", "Din K. ve A. Bil.", "Fen ve Teknoloji"]};

function sebepNo(ad) { var i = SEBEPLER.indexOf(ad); return i < 0 ? 0 : i; }
function sbp(ko) { return ko.length > 4 ? ko[4] : KONU_EKSIGI; }

function Kayit() { this.ders = ""; this.saat = ""; this.soru = 0; this.dogru = 0; this.yanlis = 0; this.ek = false;
  this.neden = NEDENLER.map(function () { return 0; }); this.konular = []; }
Kayit.prototype.isaretli = function () { var n = this.konular.length; this.neden.forEach(function (x) { n += x; }); return n; };
Kayit.prototype.bos = function () { return Math.max(0, this.soru - this.dogru - this.yanlis); };
Kayit.prototype.dolu = function () { return this.soru > 0 || this.dogru > 0 || this.yanlis > 0; };

function sebepSay(k) {
  var c = SEBEPLER.map(function () { return 0; });
  k.konular.forEach(function (ko) { c[sebepNo(sbp(ko))]++; });
  for (var i = 0; i < k.neden.length && i + 1 < c.length; i++) c[i + 1] += k.neden[i];
  return c;
}

/**
 * prefs: Android SharedPreferences("veri") ile aynı anahtarlar (d_YYYY-MM-DD, program_N, ad, ...).
 * kaydet(): prefs değişince çağrılır (localStorage'a yazmak ve canlı paylaşım için).
 */
function Store(prefs, kaydet, salt) {
  this.sp = prefs;
  this.kaydet = kaydet || function () {};
  this.salt = !!salt;
}
var S = Store.prototype;
S.get = function (k, def) { return Object.prototype.hasOwnProperty.call(this.sp, k) ? this.sp[k] : def; };
S.put = function (k, v) { if (v === null || v === undefined) delete this.sp[k]; else this.sp[k] = v; };
S.yazildi = function () { this.kaydet(); };
S.has = function (k) { return Object.prototype.hasOwnProperty.call(this.sp, "d_" + k); };
S.sil = function (k) { if (this.salt) return; this.put("d_" + k, null); this.yazildi(); };
S.ilkGun = function () { var v = this.get("ilkGun", null); if (!v) { v = key(bugun()); this.sp.ilkGun = v; this.kaydet(); } return v; };
S.gonderilmemis = function () {
  var out = [], ilk = this.ilkGun(), c = bugun();
  for (var i = 1; i <= 14; i++) {
    c = gunEkle(c, -1);
    var k = key(c);
    if (k < ilk) break;
    var g = this.load(k);
    if (g.gonderildi || g.atla) continue;
    var dl = g.kitap;
    g.kayitlar.forEach(function (x) { if (x.dolu()) dl = true; });
    if (dl || this.program(dow(c)).length) out.unshift(k);
  }
  return out;
};
S.load = function (k) {
  var g = {tarih: k, kayitlar: [], kitap: false, sayfa: 0, gonderildi: false, atla: false};
  var s = this.get("d_" + k, null);
  if (s !== null) {
    try {
      var o = JSON.parse(s);
      g.kitap = !!o.kitap; g.sayfa = o.sayfa | 0; g.gonderildi = !!o.gonderildi; g.atla = !!o.atla;
      (o.k || []).forEach(function (r) {
        var x = new Kayit();
        x.ders = r.d || ""; x.saat = r.s || ""; x.soru = r.q | 0; x.dogru = r.t | 0; x.yanlis = r.y | 0; x.ek = !!r.ek;
        var na = r.n || [];
        for (var j = 0; j < na.length && j < x.neden.length; j++) x.neden[j] = na[j] | 0;
        (r.ke || []).forEach(function (ko) {
          x.konular.push([ko.k || "", ko.ka || "", ko.t || "", ko.s || "", ko.n === undefined ? KONU_EKSIGI : String(ko.n)]);
        });
        g.kayitlar.push(x);
      });
      var bos = !g.kitap && g.sayfa === 0 && !g.gonderildi && !g.atla;
      g.kayitlar.forEach(function (x) { if (x.dolu() || x.ek) bos = false; });
      if (!bos) return g;
      g.kayitlar = [];
    } catch (e) { g.kayitlar = []; }
  }
  g.kayitlar = this.program(dow(parse(k)));
  return g;
};
S.program = function (dw) {
  var s = this.get("program_" + dw, null), out = [];
  if (s !== null) {
    try {
      JSON.parse(s).forEach(function (r) { var x = new Kayit(); x.ders = r.d || ""; x.saat = r.s || ""; out.push(x); });
      return out;
    } catch (e) { out = []; }
  }
  (VARSAYILAN[dw] || []).forEach(function (d, i) { var x = new Kayit(); x.ders = d; x.saat = SAATLER[i]; out.push(x); });
  return out;
};
S.saveProgram = function (dw, list) {
  if (this.salt) return;
  this.put("program_" + dw, JSON.stringify(list.map(function (x) { return {d: x.ders, s: x.saat || ""}; })));
  this.yazildi();
};
S.dersListesi = function () {
  var l = DERSLER.slice();
  for (var dw = 1; dw <= 7; dw++) this.program(dw).forEach(function (k) { if (l.indexOf(k.ders) < 0) l.push(k.ders); });
  this.get("ekDersler", "").split("\n").forEach(function (d) { d = d.trim(); if (d && l.indexOf(d) < 0) l.push(d); });
  return l;
};
S.dersEkle = function (ad) { if (this.salt) return; this.put("ekDersler", this.get("ekDersler", "") + "\n" + ad); this.yazildi(); };
S.save = function (g) {
  if (this.salt) return;
  var o = {kitap: g.kitap, sayfa: g.sayfa, gonderildi: g.gonderildi, atla: g.atla, k: g.kayitlar.map(function (x) {
    var r = {d: x.ders, s: x.saat, q: x.soru, t: x.dogru, y: x.yanlis, ek: x.ek};
    if (x.isaretli() > 0) {
      r.n = x.neden.slice();
      r.ke = x.konular.map(function (ko) { return {k: ko[0], ka: ko[1], t: ko[2], s: ko[3], n: sbp(ko)}; });
    }
    return r;
  })};
  this.put("d_" + g.tarih, JSON.stringify(o));
  this.yazildi();
};
S.allKeys = function () { return Object.keys(this.sp).filter(function (k) { return k.slice(0, 2) === "d_"; }).map(function (k) { return k.slice(2); }); };

function ekAnahtar(k) {
  return k === "tekrar" || k === "tekrarBas" || k.indexOf("esik_") === 0 || k.indexOf("hedef_") === 0
    || k.indexOf("ekKonu_") === 0 || k.indexOf("hk_") === 0 || k === "kaynaklar" || k === "kitapEk" || k === "kitapGizli";
}
/** Android'deki Store.yedek() ile aynı biçim. */
S.yedek = function () {
  var sp = this.sp, g = {}, pr = {}, ek = {};
  this.allKeys().forEach(function (k) { try { g[k] = JSON.parse(sp["d_" + k]); } catch (e) { g[k] = {}; } });
  for (var dw = 1; dw <= 7; dw++) if (sp["program_" + dw] !== undefined) pr[String(dw)] = JSON.parse(sp["program_" + dw]);
  Object.keys(sp).forEach(function (k) { if (ekAnahtar(k) && typeof sp[k] === "string") ek[k] = sp[k]; });
  var kisiler = [];
  try { kisiler = JSON.parse(this.get("kisiler", "[]")); } catch (e) {}
  return JSON.stringify({uygulama: "SoruTakibi", gunler: g, ad: this.ad(), tel: this.get("tel", ""), kisiler: kisiler,
    uygAdi: this.uygAdi(), program: pr, ekDersler: this.get("ekDersler", ""), ek: ek});
};
function yedekNesne(metin) {
  var t = String(metin).trim(), a = t.indexOf("{"), b = t.lastIndexOf("}");
  return JSON.parse(t.slice(a, b + 1));
}
/** Yedek metnini geri yükler; yüklenen gün sayısı, hata olursa -1. Eski iPhone (2.1) ve Android yedeklerini okur. */
S.geriYukle = function (metin) {
  try {
    var o = yedekNesne(metin), sp = this.sp, n = 0;
    if (o.prefs) { // Android'in çok öğrencili eski yedeği
      Object.keys(o.prefs).forEach(function (k) {
        var v = o.prefs[k].v;
        if (/^d_\d{4}-\d{2}-\d{2}$/.test(k)) { sp[k] = v; n++; }
        else if (/^program_[1-7]$/.test(k) || k === "ad" || k === "ekDersler" || k === "uygAdi") sp[k] = v;
      });
      this.kaydet();
      return n;
    }
    var g = o.gunler;
    if (!g || typeof g !== "object") return -1;
    Object.keys(g).forEach(function (k) { sp["d_" + k] = JSON.stringify(g[k]); n++; });
    if (o.ad !== undefined) sp.ad = String(o.ad);
    if (o.tel !== undefined) sp.tel = String(o.tel);
    if (o.kisiler !== undefined) sp.kisiler = JSON.stringify(o.kisiler);
    if (o.uygAdi !== undefined) sp.uygAdi = String(o.uygAdi);
    if (o.ekDersler !== undefined) sp.ekDersler = String(o.ekDersler);
    var ek = o.ek || {};
    Object.keys(ek).forEach(function (k) { if (ekAnahtar(k)) sp[k] = String(ek[k]); });
    var pr = o.program || {};
    for (var dw = 1; dw <= 7; dw++) if (pr[String(dw)]) sp["program_" + dw] = JSON.stringify(pr[String(dw)]);
    this.kaydet();
    return n;
  } catch (e) { return -1; }
};
/** Canlı paylaşım (veli): kayıtları silip gelen verinin aynısını yükler. */
S.tamYukle = function (metin) {
  if (yedekGunleri(metin) === null) return false;
  var sp = this.sp;
  Object.keys(sp).forEach(function (k) { if (k.slice(0, 2) === "d_" || k.indexOf("program_") === 0 || ekAnahtar(k)) delete sp[k]; });
  return this.geriYukle(metin) >= 0;
};
function yedekGunleri(metin) {
  try {
    var o = yedekNesne(metin), g = o.gunler;
    if (!g && o.prefs) { g = {}; Object.keys(o.prefs).forEach(function (k) { if (/^d_\d{4}-\d{2}-\d{2}$/.test(k)) g[k.slice(2)] = JSON.parse(o.prefs[k].v); }); }
    if (!g || typeof g !== "object") return null;
    return Object.keys(g).filter(function (k) {
      var d = g[k] || {}, dl = !!d.kitap || (d.sayfa | 0) > 0;
      (d.k || []).forEach(function (r) { if ((r.q | 0) > 0 || (r.t | 0) > 0 || (r.y | 0) > 0) dl = true; });
      return dl;
    }).sort();
  } catch (e) { return null; }
}
S.metin = function (k, def) { return this.get(k, def); };
S.setMetin = function (k, v) { if (this.salt) return; this.put(k, v); this.yazildi(); };
S.kaynaklar = function () { return this.get("kaynaklar", "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); };
S.kaynakEkle = function (k) {
  if (this.salt) return;
  k = (k || "").trim(); if (!k) return;
  var l = this.kaynaklar().filter(function (x) { return x !== k; });
  l.unshift(k); while (l.length > 20) l.pop();
  this.put("kaynaklar", l.join("\n")); this.yazildi();
};
S.ekKonular = function (ders) { return this.get("ekKonu_" + ders, "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); };
S.ekKonuEkle = function (ders, konu) {
  if (this.salt) return;
  var l = this.ekKonular(ders); if (l.indexOf(konu) >= 0) return;
  l.push(konu); this.put("ekKonu_" + ders, l.join("\n")); this.yazildi();
};
S.haftaKonu = function (kitap, hafta) { return this.get("hk_" + kitap + "_" + hafta, ""); };
S.setHaftaKonu = function (kitap, hafta, konu) { if (this.salt) return; this.put("hk_" + kitap + "_" + hafta, konu); this.yazildi(); };
S.uygAdi = function () { return this.get("uygAdi", "Soru Takibi"); };
S.setUygAdi = function (v) { if (this.salt) return; this.put("uygAdi", v); this.yazildi(); };
S.ad = function () { return this.get("ad", "Öğrenci"); };
S.setAd = function (v) { if (this.salt) return; this.put("ad", v); this.yazildi(); };

function toplam(list) {
  var s = 0, d = 0, y = 0;
  list.forEach(function (k) { s += k.soru; d += k.dogru; y += k.yanlis; });
  return [s, d, y, Math.max(0, s - d - y)];
}
function kisaAd(d) {
  var k;
  if (d.indexOf("Sosyal") === 0) k = "Sosyal";
  else if (d.indexOf("Fen") === 0) k = "Fen";
  else if (d.indexOf("Din") === 0) k = "Din K.";
  else if (d.indexOf("İngilizce") === 0) k = "İngilizce";
  else k = d;
  return k.length > 9 ? k.slice(0, 9) : k;
}
function kaynakYazi(ko) {
  var b = "";
  if (ko[1]) b += ko[1];
  if (ko[2]) {
    var sayi = /^[0-9]/.test(ko[2]) && ko[2].indexOf("Hafta") < 0;
    b += (b ? " · " : "") + (sayi ? "Test " + ko[2] : ko[2]);
  }
  if (ko[3]) b += (b ? " · " : "") + "Soru " + ko[3];
  return b;
}

// ================================================================== Kaynaklar (kitaplar)
var GENEL = ["Gerçek Yaşam Problemleri", "Geometrik Şekiller", "Tema Değerlendirme", "Değerlendirme Sınavı", "Konu Değerlendirme Sınavı", "Bölüm Değerlendirme"];
function kayitAdi(ko) {
  var a = ko.ad;
  var genel = a.indexOf("Bağlam") === 0 || GENEL.indexOf(a) >= 0 || a.indexOf("Ünite Değerlendirme") === 0 || a.indexOf("Ünite Denemesi") === 0;
  return genel ? a + " (" + ko.tema.replace(/^\d+\. [^·]+ · /, "") + ")" : a;
}
var trSirala = typeof Intl !== "undefined" ? new Intl.Collator("tr-TR").compare : function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };
function kitapParse(veri, kullanici) {
  var out = [], k = null, tema = "";
  String(veri || "").split("\n").forEach(function (sat) {
    sat = sat.trim();
    if (!sat) return;
    try {
      if (sat[0] === "#") {
        var p = sat.slice(1).split("|");
        k = {ad: p[0], ders: p.length > 1 ? p[1] : "", haftalik: p.length > 2 && p[2] === "H", kullanici: !!kullanici, konular: []};
        out.push(k); tema = "";
      } else if (sat.indexOf("T|") === 0) tema = sat.slice(2);
      else if (sat.indexOf("H|") === 0 && k) {
        var q = sat.split("|"), hs = parseInt(q[1], 10), qs = parseInt(q[2], 10);
        for (var h = 1; h <= hs; h++) k.konular.push({tema: "", ad: h + ". Hafta", testler: [qs], ilkTest: 1});
      } else if (sat.indexOf("K|") === 0 && k) {
        var r = sat.split("|"), t = r[2].split(",").map(function (x) { var n = parseInt(x.trim(), 10); if (isNaN(n)) throw 0; return n; });
        k.konular.push({tema: tema, ad: r[1], testler: t, ilkTest: r.length > 3 ? parseInt(r[3], 10) : 1});
      }
    } catch (e) { /* bozuk satır atlanır */ }
  });
  out.sort(function (a, b) { return trSirala(a.ad, b.ad); });
  return out;
}
var gomulu = null;
function kitaplarGomulu() { if (!gomulu) gomulu = kitapParse(V.KITAP_VERI, false); return gomulu; }
function kitapGizli(st) { return st.metin("kitapGizli", "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
function kitaplar(st) {
  var g = kitapGizli(st);
  var out = kitaplarGomulu().filter(function (k) { return g.indexOf(k.ad) < 0; }).concat(kitapParse(st.metin("kitapEk", ""), true));
  out.sort(function (a, b) { return trSirala(a.ad, b.ad); });
  return out;
}
function kitaplarDers(st, ders) { return kitaplar(st).filter(function (k) { return ders && k.ders && ders.indexOf(k.ders) === 0; }); }
function temiz(s) { return String(s).replace(/\|/g, "/").replace(/\n/g, " ").replace(/#/g, "").trim(); }
function kitapMetni(ad, ders, konular) {
  return "#" + temiz(ad) + "|" + ders + "\n" + konular.map(function (k) { return "K|" + temiz(k[0]) + "|" + k[1] + "\n"; }).join("");
}
function kitapEkle(st, blok) { var v = st.metin("kitapEk", ""); st.setMetin("kitapEk", (v === "" || /\n$/.test(v) ? v : v + "\n") + blok); }
function kitapSil(st, k) {
  if (k.kullanici) {
    var atla = false, b = [];
    st.metin("kitapEk", "").split("\n").forEach(function (sat) {
      if (sat[0] === "#") atla = sat.slice(1).split("|")[0] === k.ad;
      if (!atla && sat.trim()) b.push(sat);
    });
    st.setMetin("kitapEk", b.length ? b.join("\n") + "\n" : null);
  } else {
    var g = kitapGizli(st); if (g.indexOf(k.ad) < 0) g.push(k.ad);
    st.setMetin("kitapGizli", g.join("\n"));
  }
}
function kitapGeriAl(st, ad) { var g = kitapGizli(st).filter(function (x) { return x !== ad; }); st.setMetin("kitapGizli", g.length ? g.join("\n") : null); }
/** Test sayısı ve soru kutusundan "12,12,10"; geçersizse null. */
function testMetni(testSayisi, soru) {
  soru = String(soru || "").trim(); if (!soru) return null;
  if (soru.indexOf(",") >= 0) {
    var p = soru.split(",").map(function (x) { return parseInt(x.trim(), 10); });
    if (p.some(function (n) { return !(n > 0 && n <= 200); })) return null;
    return p.join(",");
  }
  var q = parseInt(soru, 10), t = String(testSayisi || "").trim() === "" ? 1 : parseInt(testSayisi, 10);
  if (!(q > 0 && q <= 200 && t > 0 && t <= 100)) return null;
  var a = []; for (var i = 0; i < t; i++) a.push(q);
  return a.join(",");
}

// ================================================================== Konular (müfredat)
var KONU = V.KONU;
function konuListesi(ders) {
  if (!ders) return [];
  if (ders.indexOf("Matematik") === 0) return KONU.MATEMATIK;
  if (ders.indexOf("Türkçe") === 0) return KONU.TURKCE;
  if (ders.indexOf("Fen") === 0) return KONU.FEN;
  if (ders.indexOf("Sosyal") === 0) return KONU.SOSYAL;
  if (ders.indexOf("İngilizce") === 0) return KONU.INGILIZCE;
  if (ders.indexOf("Din") === 0) return KONU.DIN;
  if (ders.indexOf("Almanca") === 0) return KONU.ALMANCA;
  return [];
}
var ESLE_DERS = ["Matematik", "Türkçe", "Fen", "Sosyal", "Din"];
var ESLE = V.ESLE.map(function (g) { return g.map(function (r) { return [new RegExp(r[0]), r[1]]; }); });
function esle(ders, ad) {
  if (ders == null || ad == null) return null;
  if (konuListesi(ders).indexOf(ad) >= 0) return ad;
  var s = ad.replace(/I/g, "ı").replace(/İ/g, "i").toLocaleLowerCase("tr-TR");
  s = s.replace(/^\d+\. (deneme|ölçek|gün) · /, "");
  for (var d = 0; d < ESLE_DERS.length; d++) {
    if (ders.indexOf(ESLE_DERS[d]) !== 0) continue;
    var g = ESLE[d];
    for (var i = 0; i < g.length; i++) if (g[i][0].test(s)) return g[i][1];
    return null;
  }
  return null;
}
function mufredat(ders, ad) { var m = esle(ders, ad); return m !== null ? m : ad; }

// ================================================================== Tekrar (aralıklı yeniden çözme)
var ARALIK = [2, 7, 30];
function tkId(tarih, ders, ko) { return tarih + "|" + ders + "|" + ko[1] + "|" + ko[2] + "|" + ko[3]; }
function tkDurum(st) { try { return JSON.parse(st.metin("tekrar", "{}")); } catch (e) { return {}; } }
function tkBas(st) {
  var b = st.metin("tekrarBas", null);
  if (b === null) { b = key(gunEkle(bugun(), -14)); st.setMetin("tekrarBas", b); }
  return b;
}
function TkSoru() {}
TkSoru.prototype.yazi = function () { return kaynakYazi([this.konu, this.kaynak, this.test, this.soru]); };
function tekrarHepsi(st) {
  var out = [], b = tkBas(st), d = tkDurum(st);
  st.allKeys().sort().forEach(function (k) {
    if (k < b) return;
    st.load(k).kayitlar.forEach(function (x) {
      x.konular.forEach(function (ko) {
        if (!ko[3].trim()) return;
        if (ko.length > 4 && ko[4] === HATALI) return;
        var s = new TkSoru();
        s.id = tkId(k, x.ders, ko); s.tarih = k; s.ders = x.ders; s.konu = ko[0]; s.kaynak = ko[1]; s.test = ko[2]; s.soru = ko[3];
        s.sebep = ko.length > 4 ? ko[4] : KONU_EKSIGI; s.gecmis = []; s.tasindi = false;
        var o = d[s.id];
        if (!o) { s.asama = 0; s.sonraki = key(gunEkle(parse(k), ARALIK[0])); }
        else {
          s.asama = o.s | 0; s.sonraki = o.d !== undefined ? o.d : key(gunEkle(parse(k), ARALIK[0])); s.tasindi = !!o.t;
          (o.h || []).forEach(function (h) { s.gecmis.push(h); });
        }
        s.bitti = s.asama >= ARALIK.length;
        out.push(s);
      });
    });
  });
  return out;
}
function tekrarBugun(st) { var b = key(bugun()); return tekrarHepsi(st).filter(function (s) { return !s.bitti && s.sonraki <= b; }); }
function tekrarSonuc(st, s, dogru) {
  var b = key(bugun());
  s.gecmis.push(b + (dogru ? ":D" : ":Y"));
  if (dogru) { s.asama++; s.bitti = s.asama >= ARALIK.length; s.sonraki = s.bitti ? "" : key(gunEkle(bugun(), ARALIK[s.asama])); }
  else { if (GRUP[sebepNo(s.sebep)] === G_DIKKAT) s.tasindi = true; s.asama = 0; s.sonraki = key(gunEkle(bugun(), ARALIK[0])); }
  var d = tkDurum(st);
  d[s.id] = {s: s.asama, d: s.sonraki, t: s.tasindi, h: s.gecmis.slice()};
  st.setMetin("tekrar", JSON.stringify(d));
}

// ================================================================== Degerlendirme (haftalık koç raporu)
var ESIKLER = V.ESIKLER;
function esik(st, k) {
  for (var i = 0; i < ESIKLER.length; i++) if (ESIKLER[i][0] === k) {
    var v = parseInt(String(st.metin("esik_" + k, ESIKLER[i][2])).trim(), 10);
    return isNaN(v) || !/^\s*-?\d+\s*$/.test(String(st.metin("esik_" + k, ESIKLER[i][2]))) ? parseInt(ESIKLER[i][2], 10) : v;
  }
  return 0;
}
function hedef(st, ders) { var t = String(st.metin("hedef_" + ders, "0")).trim(); return /^-?\d+$/.test(t) ? parseInt(t, 10) : 0; }
function katsayi(ders) { return ders.indexOf("Türkçe") === 0 || ders.indexOf("Matematik") === 0 || ders.indexOf("Fen") === 0 ? 4 : 1; }

/** Sıralı sözlük (Java LinkedHashMap). */
function Harita() { this.k = []; this.v = {}; }
Harita.prototype.get = function (a) { return Object.prototype.hasOwnProperty.call(this.v, a) ? this.v[a] : null; };
Harita.prototype.put = function (a, b) { if (!Object.prototype.hasOwnProperty.call(this.v, a)) this.k.push(a); this.v[a] = b; };
Harita.prototype.has = function (a) { return Object.prototype.hasOwnProperty.call(this.v, a); };
Harita.prototype.entries = function () { var s = this; return this.k.map(function (a) { return [a, s.v[a]]; }); };
Harita.prototype.keys = function () { return this.k.slice(); };

function Hafta() {
  this.soru = 0; this.dogru = 0; this.yanlis = 0; this.bos = 0; this.girisGun = 0; this.gonderilen = 0; this.kitapGun = 0; this.sayfa = 0;
  this.grup = GRUP_AD.map(function () { return 0; }); this.sebep = SEBEPLER.map(function () { return 0; });
  this.sebepli = 0; this.ders = new Harita(); this.konu = new Harita(); this.hatali = 0;
}
function tekrarHarita(st) { var m = {}; tekrarHepsi(st).forEach(function (s) { m[s.id] = s; }); return m; }
function topla(st, pzt, tk, gunSayisi) {
  if (!tk) tk = tekrarHarita(st);
  if (gunSayisi === undefined) gunSayisi = 7;
  var h = new Hafta();
  DERSLER.forEach(function (d) { h.ders.put(d, [0, 0, 0]); });
  var c = pzt;
  for (var i = 0; i < gunSayisi; i++, c = gunEkle(c, 1)) {
    var k = key(c);
    if (!st.has(k)) continue;
    var g = st.load(k), any = false;
    g.kayitlar.forEach(function (x) {
      if (!x.dolu()) return;
      any = true;
      h.soru += x.soru; h.dogru += x.dogru; h.yanlis += x.yanlis; h.bos += x.bos();
      var t = h.ders.get(x.ders);
      if (!t) { t = [0, 0, 0]; h.ders.put(x.ders, t); }
      t[0] += x.soru; t[1] += x.dogru; t[2] += x.yanlis;
      for (var j = 0; j < x.neden.length && j + 1 < h.sebep.length; j++) {
        var gj = GRUP[j + 1];
        h.sebep[j + 1] += x.neden[j];
        if (gj === G_YOK) { h.hatali += x.neden[j]; continue; }
        h.grup[gj] += x.neden[j];
        h.sebepli += x.neden[j];
      }
      x.konular.forEach(function (ko) {
        var sn = sebepNo(sbp(ko)), ts = tk[tkId(k, x.ders, ko)];
        h.sebep[sn]++;
        if (GRUP[sn] === G_YOK) { h.hatali++; return; }
        var gr = ts && ts.tasindi ? G_BILGI : GRUP[sn];
        h.grup[gr]++;
        h.sebepli++;
        if (!ko[0]) return;
        var ad = kisaAd(x.ders) + " · " + mufredat(x.ders, ko[0]);
        var v = h.konu.get(ad);
        if (!v) { v = [0, 0, 0, 0]; h.konu.put(ad, v); }
        v[0]++;
        if (gr === G_BILGI) v[1]++;
        if (gr === G_DIKKAT) v[2]++;
        if (gr === G_TAHMIN) v[3]++;
      });
    });
    if (any) h.girisGun++;
    if (g.gonderildi) h.gonderilen++;
    if (g.kitap) { h.kitapGun++; h.sayfa += g.sayfa; }
  }
  return h;
}
function yuzde(a, b) { return b > 0 ? round(a * 100 / b) : 0; }
function kisalt0(ad) { return ad.replace(/^[^·]+· /, ""); }
function enCok(h, idx, adet) {
  var l = h.konu.entries().slice();
  l = stabilSirala(l, function (a, b) { return b[1][idx] - a[1][idx]; });
  var out = [];
  for (var i = 0; i < l.length && out.length < adet; i++) { if (l[i][1][idx] === 0) break; out.push(kisalt0(l[i][0])); }
  return out.join(", ");
}
function stabilSirala(l, cmp) {
  return l.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return cmp(a[0], b[0]) || a[1] - b[1]; }).map(function (x) { return x[0]; });
}
function medyan(l) {
  var s = l.slice().sort(function (a, b) { return a - b; }), n = s.length;
  return n === 0 ? 0 : n % 2 === 1 ? s[(n - 1) / 2] : round((s[n / 2 - 1] + s[n / 2]) / 2);
}
function Aday(o, k, m) { this.oncelik = o; this.anahtar = k; this.metin = m; this.seri = 1; }

function hafta(st, gun, tk, derin) {
  if (!tk) tk = tekrarHarita(st);
  if (derin === undefined) derin = true;
  var r = {son6: [], cumleler: [], anahtarlar: {}, dipnot: "", tekrarlayan: [], tkCozulen: 0, tkDogru: 0, tkBekleyen: 0, tkTasinan: 0, gunSayisi: 7};
  var pzt = pazartesi(gun);
  for (var w = 5; w >= 0; w--) r.son6.push(topla(st, gunEkle(pzt, -7 * w), tk));
  var h = r.son6[5], o = r.son6[4];
  var bug = bugun(), pzBit = gunEkle(pzt, 6);
  if (key(bug) >= key(pzt) && key(bug) < key(pzBit)) {
    r.gunSayisi = (dow(bug) + 5) % 7 + 1;
    o = topla(st, gunEkle(pzt, -7), tk, r.gunSayisi);
  }
  r.h = h; r.onceki = o;
  var minY = esik(st, "minYanlis"), dersMin = esik(st, "dersMinSoru");
  var G = h.sebepli, grupOK = G >= minY, guclu = [], oncelik = [];

  // tekrarlayan konular (son 4 hafta)
  var dort = new Harita();
  for (w = 2; w <= 5; w++) r.son6[w].konu.entries().forEach(function (e) {
    var v = dort.get(e[0]); if (!v) { v = [0, 0]; dort.put(e[0], v); }
    v[0] += e[1][0]; if (w === 5) v[1] += e[1][0];
  });
  var konuN = esik(st, "konuN");
  dort.entries().forEach(function (e) { if (e[1][0] >= konuN) r.tekrarlayan.push(e); });
  r.tekrarlayan = stabilSirala(r.tekrarlayan, function (a, b) { return b[1][0] !== a[1][0] ? b[1][0] - a[1][0] : b[1][1] - a[1][1]; });

  // yeniden çözme
  var bas = key(pzt), son = key(gunEkle(pzt, 6)), bk = key(bugun()), tasinanKonu = [];
  Object.keys(tk).forEach(function (id) {
    var s = tk[id];
    if (!s.bitti && s.sonraki <= bk) r.tkBekleyen++;
    s.gecmis.forEach(function (g) {
      var t = g.slice(0, 10);
      if (t < bas || t > son) return;
      r.tkCozulen++;
      if (/:D$/.test(g)) r.tkDogru++;
      else if (GRUP[sebepNo(s.sebep)] === G_DIKKAT) {
        r.tkTasinan++;
        var k = !s.konu ? s.yazi() : mufredat(s.ders, s.konu);
        if (tasinanKonu.indexOf(k) < 0) tasinanKonu.push(k);
      }
    });
  });

  // ---- güçlü yönler
  var eski = eskiTekrarlayan(r, konuN);
  for (var i = 0; i < eski.length; i++) {
    var ek0 = eski[i][0];
    if (!r.son6[4].konu.has(ek0) && !h.konu.has(ek0)) {
      guclu.push(new Aday(5, "E7:" + ek0, kisalt0(ek0) + " konusunda son 2 haftada yanlış yok. Yeniden çözme çalışması sonuç vermiş görünüyor."));
      break;
    }
  }
  if (r.tkCozulen >= 3 && r.tkDogru * 100 >= 70 * r.tkCozulen)
    guclu.push(new Aday(4, "TK", "Bu hafta eski yanlışlardan " + r.tkCozulen + " tanesi yeniden çözüldü, " + r.tkDogru + " tanesi doğru."));
  var cokGun = esik(st, "cokGun"), azGun = esik(st, "azGun"), gs = r.gunSayisi, eksikGun = 7 - gs;
  var gunYazi = gs < 7 ? "Bu hafta şu ana kadar " + gs + " günün " : "7 günün ";
  if (h.girisGun >= cokGun - eksikGun && h.girisGun > 0)
    guclu.push(new Aday(3, "R12cok", gunYazi + h.girisGun + ekDe(h.girisGun) + " kayıt girildi, düzenli çalışma sürüyor."));

  // ---- öncelikler
  if (r.tkTasinan > 0)
    oncelik.push(new Aday(7, "E2", "Dikkat hatası diye işaretlenen " + r.tkTasinan + " soru yeniden çözümde de yanlış çıktı ("
      + join(tasinanKonu, 2) + "). Bunlar bilgi eksiği olabilir; bilgi grubuna taşındı."));
  var hk = h.konu.entries();
  for (i = 0; i < hk.length; i++) {
    var onc = o.konu.get(hk[i][0]);
    if (hk[i][1][2] > 0 && onc && onc[2] > 0) {
      oncelik.push(new Aday(7, "E3:" + hk[i][0], kisalt0(hk[i][0]) + " konusunda yanlışlar {H} haftadır 'dikkat/işlem' diye işaretleniyor. Aynı konuda tekrar ettiği için bilgi eksiği olabilir."));
      break;
    }
  }
  if (r.tekrarlayan.length) {
    var e = r.tekrarlayan[0], ad = e[0];
    oncelik.push(new Aday(8 + (katsayi(dersAdi(ad)) === 4 ? 1 : 0), "R10:" + ad, kisalt0(ad) + " son 4 haftada " + e[1][0]
      + " kez yanlış yapıldı; kalıcı bir eksik olabilir. Öneri: Bu konunun yanlış soruları yeniden çözülsün, koç kısa bir konu tekrarı planlayabilir."));
  }
  h.ders.keys().forEach(function (d) {
    var hd = hedef(st, d);
    if (hd <= 0) return;
    var b = [];
    for (var w2 = 2; w2 <= 5; w2++) { var t = r.son6[w2].ders.get(d); if (t && t[0] >= dersMin) b.push(basari(t[0], t[1])); }
    if (b.length === 4) {
      var alt = true, ust = true;
      b.forEach(function (x) { if (x >= hd) alt = false; if (x <= hd) ust = false; });
      if (alt) { oncelik.push(new Aday(7 + (katsayi(d) === 4 ? 1 : 0), "R8alt:" + d, d + " son {N} haftadır hedefin (%" + hd + ") altında (ortanca %" + medyan(b) + "). Çalışma planı gözden geçirilmeli; gelecek hafta bu derse bir oturum daha ayrılabilir.")); return; }
      if (ust) { guclu.push(new Aday(5, "R8ust:" + d, d + " son {N} haftadır hedefin (%" + hd + ") üstünde. Hedef yükseltilebilir.")); return; }
    }
    if (b.length >= 2 && medyan(b) < hd)
      oncelik.push(new Aday(5 + (katsayi(d) === 4 ? 1 : 0), "R9:" + d, d + ": son haftalarda başarı ortancası %" + medyan(b) + ", hedef %" + hd + ". Öneri: Gelecek hafta bu derse bir oturum daha ayrılsın."
        + (katsayi(d) === 4 ? " LGS'de Türkçe, Matematik ve Fen 4 kat ağırlıklıdır." : "")));
  });
  var E6 = "Bu hafta " + h.bos + " soru boş bırakıldı. Hiç fikir yoksa boş bırakmak doğru; ama bir şık emin elenebiliyorsa işaretlemek ortalamada kazandırır.";
  if (grupOK) {
    var bilgi = h.grup[G_BILGI], dikkat = h.grup[G_DIKKAT], tahmin = h.grup[G_TAHMIN], okuma = h.grup[G_OKUMA];
    if (yuzde(okuma, G) >= esik(st, "okumaOran")) oncelik.push(new Aday(6, "E4", "Öğrencinin işaretlediğine göre yanlışların %" + yuzde(okuma, G)
      + ek(yuzde(okuma, G)) + " okuma-anlama kaynaklı (soruyu anlamama, yanlış okuma, olumsuz kök, grafik/tablo). Öneri: Çözmeden önce verileni ve isteneni ayrı ayrı yazsın, soruyu kendi cümlesiyle anlatsın. Bu, Türkçe dahil tüm dersleri etkileyen ortak bir beceri."));
    if (yuzde(bilgi, G) > esik(st, "bilgiOran")) {
      var kk = enCok(h, 1, 2);
      oncelik.push(new Aday(6, "R1", "Öğrencinin işaretlediğine göre bu haftaki yanlışların %" + yuzde(bilgi, G) + ek(yuzde(bilgi, G)) + " bilgi kaynaklı"
        + (kk ? "; en çok " + kk : "") + ". Öneri: Bu konulardaki yanlış soruları cevaba bakmadan yeniden çözsün; konu anlatımını tekrar okumak yerine kendini test etsin."));
      var enFazla = 0, ad2 = "";
      h.konu.entries().forEach(function (e2) { if (e2[1][1] > enFazla) { enFazla = e2[1][1]; ad2 = e2[0]; } });
      if (bilgi >= minY && yuzde(enFazla, bilgi) >= esik(st, "tekKonuOran"))
        oncelik.push(new Aday(4, "E5:" + ad2, "Bilgi yanlışları " + kisalt0(ad2) + " konusunda toplanıyor. Tekrar soruları tek konudan blok halinde değil, eski konularla karışık çözülsün."));
    }
    if (yuzde(dikkat, G) > esik(st, "dikkatOran"))
      oncelik.push(new Aday(5, "R2", "Yanlışların %" + yuzde(dikkat, G) + ek(yuzde(dikkat, G)) + " dikkat kaynaklı görünüyor; konuyu bilen öğrencilerde bu sık görülür. Öneri: Bu soruları 2–3 gün sonra yardımsız yeniden çözsün; doğru çözerse dikkat hatası olduğu kesinleşir. İşlem bitince sonucu şıklarla karşılaştırmadan önce sorunun ne istediğine tekrar baksın."));
    if (yuzde(tahmin, G) > esik(st, "tahminOran")) {
      var k3 = enCok(h, 3, 2);
      oncelik.push(new Aday(5, "R4", "Yanlışların %" + yuzde(tahmin, G) + ek(yuzde(tahmin, G)) + " tahminle işaretlenmiş; bu genelde konuların henüz oturmadığını gösterir"
        + (k3 ? " (" + k3 + ")" : "") + ". LGS'de hiç fikir yokken işaretlemek de boş bırakmak da ortalamada aynıdır; en az bir şık emin elenebiliyorsa işaretlemek kazandırır."));
    }
    if (h.bos >= minY && h.bos >= h.yanlis && yuzde(tahmin, G) <= esik(st, "tahminOran")) oncelik.push(new Aday(3, "E6", E6));
  } else if (h.bos >= minY && h.bos >= h.yanlis && h.yanlis > 0) {
    oncelik.push(new Aday(3, "E6", E6));
  }
  if (h.sebep[5] >= esik(st, "sureN"))
    oncelik.push(new Aday(4, "R3", h.sebep[5] + " soruda süre yetmedi. Öneri: Önce doğruluğa odaklansın; haftada bir kısa bölümü süre tutarak çözsün (sayısalda soru başına ~2 dk, sözelde ~1,5 dk). Takıldığı soruyu işaretleyip geçsin, sonra dönsün."));
  if (h.sebep[6] >= esik(st, "kokN"))
    oncelik.push(new Aday(2, "R5", h.sebep[6] + " soruda 'değildir / yanlıştır' gibi olumsuz ifade gözden kaçmış. Öneri: Soruyu okurken bu kelimeleri daire içine alsın."));
  if (h.sebep[2] >= esik(st, "isaretN"))
    oncelik.push(new Aday(2, "R6", h.sebep[2] + " soruda doğru bulunup yanlış şık işaretlenmiş. Öneri: İşaretlemeden önce bulduğu sonucu şıkla bir kez daha karşılaştırsın."));
  if (h.sebep[8] >= esik(st, "grafikN"))
    oncelik.push(new Aday(2, "R7", h.sebep[8] + " yanlış grafik, tablo veya görsel okumadan geliyor. Öneri: Soruya geçmeden önce grafiğin neyi gösterdiğini (başlık, eksenler, birim) bir cümleyle söylesin."));
  if (h.girisGun < azGun - eksikGun)
    oncelik.push(new Aday(3, "R12az", (gs < 7 ? gunYazi : "Bu hafta 7 günün ") + h.girisGun + ekDe(h.girisGun) + " kayıt var. Kısa ama her güne yayılan çalışma, aynı sürede tek seferde yapılandan daha kalıcıdır."));

  var bosHafta = h.girisGun === 0 && h.soru === 0;
  if (!(bosHafta && !derin)) guclu.concat(oncelik).forEach(function (x) { r.anahtarlar[x.anahtar] = true; });

  // süreklilik
  if (derin && (guclu.length || oncelik.length)) {
    var onceki = [];
    guclu.concat(oncelik).forEach(function (x) {
      var w3 = 0;
      while (w3 < 8) {
        if (onceki.length <= w3) onceki.push(hafta(st, gunEkle(pzt, -7 * (w3 + 1)), tk, false).anahtarlar);
        if (!onceki[w3][x.anahtar]) break;
        w3++;
      }
      x.seri = w3 + 1;
      if (x.seri >= 2) {
        if (x.metin.indexOf("{H}") >= 0 || x.metin.indexOf("{N}") >= 0) x.metin = x.metin.split("{H}").join(String(x.seri + 1)).split("{N}").join(String(x.seri + 3));
        else x.metin = "Üst üste " + x.seri + ". hafta: " + x.metin;
        if (oncelik.indexOf(x) >= 0) x.oncelik += Math.min(x.seri - 1, 3);
      }
    });
  }
  var cmp = function (a, b) { return b.oncelik - a.oncelik; };
  guclu = stabilSirala(guclu, cmp); oncelik = stabilSirala(oncelik, cmp);
  if (guclu.length) r.cumleler.push(sade(guclu[0].metin));
  for (i = 0; i < oncelik.length; i++) {
    if (r.cumleler.length >= 3) break;
    var m = sade(oncelik[i].metin);
    if (r.cumleler.indexOf(m) < 0) r.cumleler.push(m);
  }
  if (!r.cumleler.length && h.soru > 0) r.cumleler.push("Bu hafta öne çıkan bir sorun görünmüyor. Yanlış soruların yeniden çözülmesine devam edilsin.");
  var girilen = G + h.hatali;
  if (h.yanlis > 0 && yuzde(girilen, h.yanlis) < esik(st, "sebepOran"))
    r.dipnot = "Bu hafta yanlışların %" + yuzde(girilen, h.yanlis) + ekE(yuzde(girilen, h.yanlis)) + " sebep seçildi; sebepler eksik olunca öneriler daha az isabetli olur.";
  else if (h.yanlis > 0 && !grupOK)
    r.dipnot = "Sebebi girilen yanlış sayısı (" + G + ") yüzde yorumu için az; sadece sayılar gösterildi.";
  return r;
}
function eskiTekrarlayan(r, konuN) {
  var m = new Harita();
  for (var w = 0; w <= 3; w++) r.son6[w].konu.entries().forEach(function (e) {
    var v = m.get(e[0]); if (!v) { v = [0]; m.put(e[0], v); } v[0] += e[1][0];
  });
  return m.entries().filter(function (e) { return e[1][0] >= konuN; });
}
function dersAdi(konuKey) {
  var k = konuKey.split(" · ")[0];
  for (var i = 0; i < DERSLER.length; i++) if (kisaAd(DERSLER[i]) === k) return DERSLER[i];
  return k;
}
function join(l, n) { var s = l.slice(0, n).join(", "); return l.length > n ? s + " …" : s; }
function okunus(n) {
  var bir = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
  var on = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
  n = Math.abs(n);
  var w;
  if (n === 0) w = "sıfır"; else if (n % 10 !== 0) w = bir[n % 10]; else if (n % 100 !== 0) w = on[Math.floor(n / 10) % 10];
  else if (n % 1000 !== 0) w = "yüz"; else w = "bin";
  var son = "e";
  for (var i = w.length - 1; i >= 0; i--) if ("aeıioöuü".indexOf(w[i]) >= 0) { son = w[i]; break; }
  return [son, "aeıioöuü".indexOf(w[w.length - 1]) >= 0];
}
function dortlu(v) { return "ei".indexOf(v) >= 0 ? "i" : "aı".indexOf(v) >= 0 ? "ı" : "ou".indexOf(v) >= 0 ? "u" : "ü"; }
function ek(n) { var o = okunus(n); return "'" + (o[1] ? "s" : "") + dortlu(o[0]); }
function ekDe(n) { var v = okunus(n)[0]; return ek(n) + "n" + ("eiöü".indexOf(v) >= 0 ? "de" : "da"); }
function ekE(n) { var v = okunus(n)[0]; return ek(n) + "n" + ("eiöü".indexOf(v) >= 0 ? "e" : "a"); }
function sade(m) { return m.split("{H}").join("iki").split("{N}").join("4"); }

var API = {
  VERI: V, GUN: GUN, GUNK: GUNK, AY: AY, GUN_RENK: GUN_RENK, SEBEPLER: SEBEPLER, NEDENLER: NEDENLER, ACIKLAMA: V.ACIKLAMA, KISA: KISA,
  GRUP: GRUP, GRUP_AD: GRUP_AD, SIRA: V.SIRA, KONU_EKSIGI: KONU_EKSIGI, HATALI: HATALI, DERSLER: DERSLER, SAATLER: SAATLER,
  G_BILGI: G_BILGI, G_OKUMA: G_OKUMA, G_DIKKAT: G_DIKKAT, G_ZAMAN: G_ZAMAN, G_TAHMIN: G_TAHMIN, G_YOK: G_YOK,
  pad: pad, key: key, parse: parse, dow: dow, bugun: bugun, gunEkle: gunEkle, tarihYazi: tarihYazi, pazartesi: pazartesi, trBuyuk: trBuyuk,
  basari: basari, net: net, round: round, sebepNo: sebepNo, sebepSay: sebepSay, Kayit: Kayit, Store: Store, toplam: toplam, kisaAd: kisaAd,
  kaynakYazi: kaynakYazi, yedekGunleri: yedekGunleri, ekAnahtar: ekAnahtar,
  kayitAdi: kayitAdi, kitapParse: kitapParse, kitaplarGomulu: kitaplarGomulu, kitaplar: kitaplar, kitaplarDers: kitaplarDers, kitapGizli: kitapGizli,
  kitapMetni: kitapMetni, kitapEkle: kitapEkle, kitapSil: kitapSil, kitapGeriAl: kitapGeriAl, testMetni: testMetni,
  konuListesi: konuListesi, esle: esle, mufredat: mufredat,
  ARALIK: ARALIK, tekrarHepsi: tekrarHepsi, tekrarBugun: tekrarBugun, tekrarSonuc: tekrarSonuc,
  ESIKLER: ESIKLER, esik: esik, hedef: hedef, katsayi: katsayi, topla: topla, hafta: hafta, ek: ek, ekDe: ekDe, ekE: ekE
};
if (typeof module !== "undefined") module.exports = API; else kok.ST = API;
})(typeof window !== "undefined" ? window : this);
