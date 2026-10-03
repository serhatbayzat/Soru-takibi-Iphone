// Rapor resimleri: Android'deki ReportImage sınıfının karşılığı (günlük rapor + haftalık koç raporu). Genişlik 1080 px.
(function (kok) {
"use strict";
var ST = kok.ST;
var W = 1080, X0 = 72, RIGHT = W - 72, COLS = [X0, 380, 500, 625, 730];
var BG = "#F3F5FA", WHITE = "#FFFFFF", INK = "#1E2A4A", MUTED = "#5E6A86", LINE = "#DCE2EE", OK = "#23945A", BAD = "#D24848",
  WARN = "#B7791F", BLUE = "#2F6FD6", TILE = "#F7F9FD", ZEBRA = "#FAFBFE", TOTAL = "#E3ECFB", BOOK = "#F6DC7A", BOOK_OFF = "#ECEEF3";
var F = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

function renk(p) { return p >= 75 ? OK : p >= 50 ? WARN : BAD; }

function Ciz(h) {
  this.cv = document.createElement("canvas");
  this.cv.width = W; this.cv.height = h || 10;
  this.c = this.cv.getContext("2d");
}
var C = Ciz.prototype;
C.font = function (sz, b) { this.c.font = (b ? "700 " : "400 ") + sz + "px " + F; };
C.olc = function (s, sz, b) { this.font(sz, b); return this.c.measureText(s).width; };
/** top: yazının üst kenarı; al: 0 sol, 1 orta, 2 sağ */
C.text = function (s, x, top, sz, b, col, al) {
  var c = this.c; this.font(sz, b); c.fillStyle = col; c.textBaseline = "alphabetic";
  c.textAlign = al === 1 ? "center" : al === 2 ? "right" : "left";
  c.fillText(s, x, top + sz * 0.93); // Android'deki "top - ascent" yaklaşık karşılığı
};
C.rr = function (l, t, r, b, rad, fill, stroke) {
  var c = this.c; rad = Math.min(rad, (r - l) / 2, (b - t) / 2);
  c.beginPath(); c.moveTo(l + rad, t); c.arcTo(r, t, r, b, rad); c.arcTo(r, b, l, b, rad); c.arcTo(l, b, l, t, rad); c.arcTo(l, t, r, t, rad); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = 2; c.strokeStyle = stroke; c.stroke(); }
};
C.rect = function (l, t, r, b, col) { this.c.fillStyle = col; this.c.fillRect(l, t, r - l, b - t); };
C.sar = function (parca, sz, b, ayrac) {
  var out = [], cur = "", s = this;
  parca.forEach(function (pc) { var t = cur ? cur + ayrac + pc : pc; if (s.olc(t, sz, b) > RIGHT - X0 && cur) { out.push(cur); cur = pc; } else cur = t; });
  if (cur) out.push(cur);
  return out;
};
C.kisalt = function (s, sz, b) { while (this.olc(s, sz, b) > RIGHT - X0 && s.length > 10) s = s.slice(0, -2) + "…"; return s; };
C.kelimeSar = function (s, sz, b, gen) {
  var out = [], cur = "", me = this;
  s.split(" ").forEach(function (w) { var t = cur ? cur + " " + w : w; if (me.olc(t, sz, b) > gen && cur) { out.push(cur); cur = w; } else cur = t; });
  if (cur) out.push(cur);
  return out;
};
C.row = function (y, name, t, bg, bold) {
  if (bg) this.rr(X0 - 16, y + 6, RIGHT + 16, y + 92, 18, bg);
  var max = COLS[1] - 30 - X0 + 10, ns = 34, n = name;
  while (this.olc(n, ns, true) > max && ns > 26) ns -= 1;
  if (this.olc(n, ns, true) > max) n = ST.kisaAd(name);
  this.text(n, COLS[0], y + 30 + (34 - ns) / 2, ns, true, INK, 0);
  var cc = [INK, OK, BAD, MUTED];
  for (var i = 0; i < 4; i++) this.text(String(t[i]), COLS[i + 1] + 60, y + 30, 34, bold, cc[i], 2);
  var pct = ST.basari(t[0], t[1]), pc = renk(pct), bx = RIGHT - 150;
  this.rr(bx, y + 42, RIGHT, y + 56, 7, LINE);
  this.rr(bx, y + 42, bx + Math.max(14, 150 * pct / 100), y + 56, 7, pc);
  this.text("%" + pct, RIGHT, y + 2, 26, true, pc, 2);
  return y + 98;
};

// ------------------------------------------------------------------ günlük rapor
function gunluk(st, g) {
  var by = {}, sira = [];
  g.kayitlar.forEach(function (k) {
    if (!k.dolu()) return;
    if (!by[k.ders]) { by[k.ders] = [0, 0, 0, 0]; sira.push(k.ders); }
    var t = by[k.ders]; t[0] += k.soru; t[1] += k.dogru; t[2] += k.yanlis; t[3] += k.bos();
  });
  var top = [0, 0, 0, 0];
  sira.forEach(function (d) { for (var i = 0; i < 4; i++) top[i] += by[d][i]; });
  var rows = sira.length;
  var sebep = ST.SEBEPLER.map(function () { return 0; }), grup = ST.GRUP_AD.map(function () { return 0; });
  var testBy = {}, testSira = [];
  g.kayitlar.forEach(function (k) {
    var c = ST.sebepSay(k);
    for (var i = 0; i < c.length; i++) { sebep[i] += c[i]; if (ST.GRUP[i] !== ST.G_YOK) grup[ST.GRUP[i]] += c[i]; }
    k.konular.forEach(function (ko) {
      var sn = ST.sebepNo(ko.length > 4 ? ko[4] : ST.KONU_EKSIGI);
      var key = ST.kisaAd(k.ders);
      if (ko[2]) { var sayi = /^[0-9]/.test(ko[2]) && ko[2].indexOf("Hafta") < 0; key += " · " + (sayi ? "Test " + ko[2] : ko[2]); }
      if (ko[1]) key += " · " + ko[1];
      if (!testBy[key]) { testBy[key] = []; testSira.push(key); }
      testBy[key].push([ko[3], sn, ko[0]]);
    });
  });
  var olcer = new Ciz(10);
  var gParca = [], dParca = [];
  grup.forEach(function (v, i) { if (v > 0) gParca.push(ST.GRUP_AD[i] + " " + v); });
  sebep.forEach(function (v, i) { if (v > 0) dParca.push(ST.KISA[i] + " " + v); });
  var satirlar = olcer.sar(gParca, 30, true, "   ·   "), detay = olcer.sar(dParca, 23, false, "  ·  ");
  var kutular = [], kutuH = 0;
  testSira.forEach(function (key) {
    var sp = [], konular = [], hepKonu = true;
    testBy[key].forEach(function (q) {
      if (q[1] !== 0) hepKonu = false;
      sp.push((q[0] ? "S" + q[0] + " " : "") + ST.KISA[q[1]]);
      if (q[2] && konular.indexOf(q[2]) < 0) konular.push(q[2]);
    });
    var konu = konular.join(" / "), ss = olcer.sar(sp, 25, true, "  ·  ");
    kutular.push([key, konu, ss, hepKonu ? "#FFF4E0" : "#FDF1F1"]);
    kutuH += 16 + 40 + (konu ? 34 : 0) + ss.length * 36 + 12 + 12;
  });
  var sebepVar = gParca.length > 0;
  var sebepH = !sebepVar ? 0 : 36 + 40 + satirlar.length * 46 + detay.length * 34 + (kutular.length ? 24 + 40 + kutuH : 0);
  var H = 470 + 44 + rows * 98 + (rows > 0 ? 8 + 98 : 90) + sebepH + 36 + 110 + 150 + 30;
  var z = new Ciz(H), c = z.c;
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  z.rr(24, 24, W - 24, H - 24, 40, WHITE);
  var cal = ST.parse(g.tarih), dayCol = ST.GUN_RENK[ST.dow(cal)];
  z.rr(24, 24, W - 24, 250, 40, dayCol); z.rect(24, 200, W - 24, 250, dayCol);
  z.text(ST.trBuyuk(st.ad()), X0, 62, 30, true, MUTED, 0);
  var tarih = ST.tarihYazi(cal), ts = 58;
  while (z.olc(tarih, ts, true) > 640 && ts > 40) ts -= 2;
  z.text(tarih, X0, 104, ts, true, INK, 0);
  z.text("Günlük soru raporu", X0, 184, 28, false, MUTED, 0);
  var gp = ST.basari(top[0], top[1]), cx = W - 180, cy = 137, r = 86;
  c.fillStyle = WHITE; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.lineWidth = 16; c.lineCap = "round"; c.strokeStyle = LINE; c.beginPath(); c.arc(cx, cy, r - 16, 0, Math.PI * 2); c.stroke();
  if (gp > 0) { c.strokeStyle = renk(gp); c.beginPath(); c.arc(cx, cy, r - 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * gp / 100); c.stroke(); }
  z.text("%" + gp, cx, cy - 40, 44, true, INK, 1);
  z.text("başarı", cx, cy + 12, 24, false, MUTED, 1);
  var lab = ["SORU", "DOĞRU", "YANLIŞ", "BOŞ", "NET"], val = ["" + top[0], "" + top[1], "" + top[2], "" + top[3], ST.net(top[1], top[2])];
  var col = [INK, OK, BAD, MUTED, BLUE], tw = (RIGHT - X0 - 4 * 16) / 5, x = X0, y = 290;
  for (var i = 0; i < 5; i++) {
    z.rr(x, y, x + tw, y + 130, 22, TILE, LINE);
    z.text(lab[i], x + tw / 2, y + 20, 22, true, MUTED, 1);
    var vs = 46; while (z.olc(val[i], vs, true) > tw - 16 && vs > 28) vs -= 2;
    z.text(val[i], x + tw / 2, y + 56 + (46 - vs) / 2, vs, true, col[i], 1);
    x += tw + 16;
  }
  y = 470;
  var hdr = ["DERS", "SORU", "DOĞRU", "YANLIŞ", "BOŞ"];
  z.text(hdr[0], COLS[0], y, 22, true, MUTED, 0);
  for (i = 1; i < 5; i++) z.text(hdr[i], COLS[i] + 60, y, 22, true, MUTED, 2);
  z.text("BAŞARI", RIGHT, y, 22, true, MUTED, 2);
  y += 44;
  z.rect(X0, y - 1.5, RIGHT, y + 1.5, LINE);
  if (!rows) { z.text("Bu gün için soru girilmedi.", W / 2, y + 30, 32, false, MUTED, 1); y += 90; }
  else {
    sira.forEach(function (d, j) { y = z.row(y, d, by[d], j % 2 === 0 ? ZEBRA : null, false); });
    z.rect(X0, y + 2.5, RIGHT, y + 5.5, INK);
    y += 8;
    y = z.row(y, "TOPLAM", top, TOTAL, true);
  }
  if (sebepVar) {
    y += 36;
    z.text("YANLIŞLARIN SEBEBİ", X0, y, 22, true, MUTED, 0); y += 40;
    satirlar.forEach(function (sl) { z.text(sl, X0, y, 30, true, INK, 0); y += 46; });
    detay.forEach(function (sl) { z.text(sl, X0, y, 23, false, MUTED, 0); y += 34; });
    if (kutular.length) {
      y += 24;
      z.text("YANLIŞ SORULAR", X0, y, 22, true, MUTED, 0); y += 40;
      kutular.forEach(function (kt) {
        var hh = 16 + 40 + (kt[1] ? 34 : 0) + kt[2].length * 36 + 12;
        z.rr(X0 - 16, y, RIGHT + 16, y + hh, 16, kt[3]);
        var yy = y + 14;
        z.text(z.kisalt(kt[0], 28, true), X0, yy, 28, true, INK, 0); yy += 40;
        if (kt[1]) { z.text(z.kisalt(kt[1], 23, false), X0, yy, 23, false, MUTED, 0); yy += 34; }
        kt[2].forEach(function (sl) { z.text(sl, X0, yy, 25, true, BAD, 0); yy += 36; });
        y += hh + 12;
      });
      y -= 12;
    }
  }
  y += 36;
  if (g.kitap) {
    z.rr(X0, y, RIGHT, y + 110, 24, BOOK);
    z.text("Kitap okundu", X0 + 34, y + 22, 36, true, INK, 0);
    z.text("Yatmadan önce", X0 + 34, y + 66, 24, false, "#5A5028", 0);
    z.text((g.sayfa > 0 ? g.sayfa + " sayfa  " : "") + "✔", RIGHT - 34, y + 32, 40, true, INK, 2);
  } else {
    z.rr(X0, y, RIGHT, y + 110, 24, BOOK_OFF);
    z.text("Kitap okunmadı", X0 + 34, y + 36, 34, true, MUTED, 0);
  }
  y += 150;
  z.text(st.uygAdi(), W / 2, y, 24, false, MUTED, 1);
  return z.cv;
}

// ------------------------------------------------------------------ haftalık koç raporu
function fark(v, birim) { return v === 0 ? "aynı" : (v > 0 ? "▲ " : "▼ ") + Math.abs(v) + birim; }
function haftalik(st, gun) {
  var r = ST.hafta(st, gun), h = r.h, o = r.onceki;
  var pzt = ST.pazartesi(gun), paz = ST.gunEkle(pzt, 6), oVar = o.soru > 0, dersMin = ST.esik(st, "dersMinSoru");
  var olcer = new Ciz(10), metinW = RIGHT - X0 - 44, madde = [], maddeH = 0;
  r.cumleler.forEach(function (c) { var l = olcer.kelimeSar(c, 27, false, metinW); madde.push(l); maddeH += l.length * 40 + 18; });
  var dip = r.dipnot ? olcer.kelimeSar(r.dipnot, 22, false, RIGHT - X0) : [];
  var dersler = h.ders.entries().filter(function (e) { return e[1][0] > 0; }).map(function (e) { return e[0]; });
  var G = h.sebepli, grupGoster = G > 0, tekrar = r.tekrarlayan.slice(0, 6);
  var H = 290 + 170 + 50 + 50 + maddeH + 10 + 50 + 44 + Math.max(1, dersler.length) * 66
    + (grupGoster ? 50 + ST.GRUP_AD.length * 58 : 0) + 50 + Math.max(1, tekrar.length) * 62 + 50 + 4 * 42
    + (dip.length ? 20 + dip.length * 32 : 0) + 110;
  var z = new Ciz(H), c = z.c;
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  z.rr(24, 24, W - 24, H - 24, 40, WHITE);
  var band = "#CFE0FA";
  z.rr(24, 24, W - 24, 250, 40, band); z.rect(24, 200, W - 24, 250, band);
  z.text(ST.trBuyuk(st.ad()), X0, 62, 30, true, MUTED, 0);
  z.text("Haftalık koç raporu", X0, 104, 56, true, INK, 0);
  z.text(pzt.getDate() + " " + ST.AY[pzt.getMonth()] + " – " + paz.getDate() + " " + ST.AY[paz.getMonth()] + " " + paz.getFullYear()
    + (oVar ? (r.gunSayisi < 7 ? "   ·   ▲▼ geçen haftanın ilk " + r.gunSayisi + " günüyle" : "   ·   ▲▼ geçen haftaya göre") : ""), X0, 184, 26, false, MUTED, 0);
  var bs = ST.basari(h.soru, h.dogru), bo = ST.basari(o.soru, o.dogru);
  var lab = ["SORU", "DOĞRU", "YANLIŞ", "NET", "BAŞARI"], val = ["" + h.soru, "" + h.dogru, "" + h.yanlis, ST.net(h.dogru, h.yanlis), "%" + bs];
  var nh = h.dogru - h.yanlis / 3, no = o.dogru - o.yanlis / 3;
  var df = [h.soru - o.soru, h.dogru - o.dogru, h.yanlis - o.yanlis, Math.round(nh - no), bs - bo], iyi = [true, true, false, true, true];
  var col = [INK, OK, BAD, BLUE, renk(bs)], tw = (RIGHT - X0 - 4 * 16) / 5, x = X0, y = 290;
  for (var i = 0; i < 5; i++) {
    z.rr(x, y, x + tw, y + 170, 22, TILE, LINE);
    z.text(lab[i], x + tw / 2, y + 18, 22, true, MUTED, 1);
    var vs = 46; while (z.olc(val[i], vs, true) > tw - 16 && vs > 28) vs -= 2;
    z.text(val[i], x + tw / 2, y + 54 + (46 - vs) / 2, vs, true, col[i], 1);
    if (oVar) z.text(fark(df[i], i === 4 ? " puan" : ""), x + tw / 2, y + 118, 21, true, df[i] === 0 ? MUTED : ((df[i] > 0) === iyi[i] ? OK : BAD), 1);
    x += tw + 16;
  }
  y += 170 + 50;
  z.text("DEĞERLENDİRME", X0, y, 22, true, MUTED, 0); y += 50;
  madde.forEach(function (l) {
    c.fillStyle = BLUE; c.beginPath(); c.arc(X0 + 10, y + 18, 7, 0, Math.PI * 2); c.fill();
    l.forEach(function (sl) { z.text(sl, X0 + 44, y, 27, false, INK, 0); y += 40; });
    y += 18;
  });
  y += 10;
  z.text("DERS DERS", X0, y, 22, true, MUTED, 0); y += 44;
  z.text("SORU", 600, y, 20, true, MUTED, 2); z.text("BAŞARI", 780, y, 20, true, MUTED, 2);
  z.text(oVar ? "GEÇEN HAFTA" : "HEDEF", RIGHT, y, 20, true, MUTED, 2); y += 34;
  if (!dersler.length) { z.text("Bu hafta kayıt yok.", X0, y, 28, false, MUTED, 0); y += 66; }
  dersler.forEach(function (d) {
    var t = h.ders.get(d), to = o.ders.get(d), b = ST.basari(t[0], t[1]), hd = ST.hedef(st, d);
    z.text(d.length > 16 ? ST.kisaAd(d) : d, X0, y, 30, true, INK, 0);
    z.text("" + t[0], 600, y, 30, false, INK, 2);
    if (t[0] < dersMin) z.text("az veri", 780, y + 4, 24, false, MUTED, 2);
    else z.text("%" + b, 780, y, 30, true, hd > 0 ? (b >= hd ? OK : BAD) : renk(b), 2);
    var sag = oVar && to && to[0] > 0 ? "%" + ST.basari(to[0], to[1]) + " (" + to[0] + " soru)" : hd > 0 ? "hedef %" + hd : "–";
    z.text(sag, RIGHT, y + 4, 24, false, MUTED, 2);
    y += 66;
  });
  if (grupGoster) {
    y += 6;
    z.text("YANLIŞLAR NEDEN OLDU?  (" + G + " yanlış" + (h.hatali > 0 ? ", ayrıca " + h.hatali + " hatalı soru" : "") + ")", X0, y, 22, true, MUTED, 0); y += 44;
    var gr = [WARN, "#8A4FD1", BAD, BLUE, MUTED];
    for (i = 0; i < ST.GRUP_AD.length; i++) {
      var pc = ST.round(h.grup[i] * 100 / G);
      z.text(ST.GRUP_AD[i], X0, y, 28, true, INK, 0);
      z.text(h.grup[i] + "  (%" + pc + ")", RIGHT, y, 28, true, h.grup[i] > 0 ? gr[i] : MUTED, 2);
      var bx = 345, bw = RIGHT - 190 - bx;
      z.rr(bx, y + 12, bx + bw, y + 26, 7, LINE);
      if (pc > 0) z.rr(bx, y + 12, bx + Math.max(14, bw * pc / 100), y + 26, 7, gr[i]);
      y += 58;
    }
  }
  y += 6;
  z.text("TEKRARLAYAN KONULAR  (son 4 haftada " + ST.esik(st, "konuN") + "+ yanlış)", X0, y, 22, true, MUTED, 0); y += 44;
  if (!tekrar.length) { z.text("Tekrarlayan konu yok.", X0, y, 28, false, OK, 0); y += 62; }
  tekrar.forEach(function (e) {
    z.rr(X0 - 16, y - 8, RIGHT + 16, y + 48, 14, "#FDF1F1");
    var sag = e[1][0] + " yanlış" + (e[1][1] > 0 ? " (bu hafta " + e[1][1] + ")" : ""), sw = z.olc(sag, 24, true), ad = e[0];
    while (z.olc(ad, 27, true) > RIGHT - X0 - sw - 30 && ad.length > 10) ad = ad.slice(0, -2) + "…";
    z.text(ad, X0, y, 27, true, INK, 0);
    z.text(sag, RIGHT, y + 3, 24, true, BAD, 2);
    y += 62;
  });
  y += 6;
  z.text("YENİDEN ÇÖZME VE DÜZENLİLİK", X0, y, 22, true, MUTED, 0); y += 44;
  z.text("Eski yanlışlardan bu hafta çözülen: " + r.tkCozulen + (r.tkCozulen > 0 ? "  (doğru " + r.tkDogru + ")" : "") + "   ·   bekleyen: " + r.tkBekleyen, X0, y, 25, false, INK, 0); y += 42;
  z.text("Kayıt girilen gün: " + h.girisGun + " / " + r.gunSayisi + (oVar ? "   (geçen hafta " + o.girisGun + ")" : ""), X0, y, 25, false, INK, 0); y += 42;
  z.text("Rapor gönderilen gün: " + h.gonderilen + "   ·   boş bırakılan soru: " + h.bos, X0, y, 25, false, INK, 0); y += 42;
  z.text("Kitap: " + h.kitapGun + " gün" + (h.sayfa > 0 ? ", " + h.sayfa + " sayfa" : ""), X0, y, 25, false, INK, 0); y += 42;
  if (dip.length) { y += 20; dip.forEach(function (sl) { z.text(sl, X0, y, 22, false, MUTED, 0); y += 32; }); }
  y += 40;
  z.text(st.uygAdi() + " · öneriler araştırmaya dayalı kurallarla üretildi", W / 2, y, 22, false, MUTED, 1);
  return z.cv;
}

kok.RAPOR = {gunluk: gunluk, haftalik: haftalik};
})(window);
