// Soru Takibi · iPhone (web) sürümü ekranları. Veri ve kurallar cekirdek.js'te (Android ile birebir aynı).
(function () {
"use strict";
var ST = window.ST, RAPOR = window.RAPOR;
var KEY2 = "soruTakibi.v2", KEY1 = "soruTakibi.v1", KEYC = "soruTakibi.cihaz";
var $ = function (id) { return document.getElementById(id); };

// ================================================================== depolama
var prefs = {}, cihaz = {}, st;
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function yukle() {
  try { prefs = JSON.parse(lsGet(KEY2) || "null"); } catch (e) { prefs = null; }
  try { cihaz = JSON.parse(lsGet(KEYC) || "null") || {}; } catch (e) { cihaz = {}; }
  if (!prefs || typeof prefs !== "object") { prefs = {}; tasi(); }
}
/** 2.1 sürümünün verisini yeni biçime taşır (eski kayıt silinmez). */
function tasi() {
  var db = null;
  try { db = JSON.parse(lsGet(KEY1) || "null"); } catch (e) { db = null; }
  if (!db || typeof db !== "object") return;
  Object.keys(db.gunler || {}).forEach(function (k) { prefs["d_" + k] = JSON.stringify(db.gunler[k]); });
  Object.keys(db.program || {}).forEach(function (d) { prefs["program_" + d] = JSON.stringify(db.program[d]); });
  if (db.ad) prefs.ad = db.ad;
  if (db.uygAdi) prefs.uygAdi = db.uygAdi;
  if (db.ekDersler) prefs.ekDersler = db.ekDersler;
  if (db.ilkGun) prefs.ilkGun = db.ilkGun;
  if (db.kurulum) cihaz.kurulum = true;
  if (db.ipucuKapali) cihaz.ipucuKapali = true;
  if (db.sonYedek) cihaz.sonYedek = db.sonYedek;
  lsSet(KEY2, JSON.stringify(prefs)); cihazKaydet();
}
function cihazKaydet() { lsSet(KEYC, JSON.stringify(cihaz)); }
function veli() { return cihaz.mod === 2 && !!cihaz.adres; }
function ogrenci() { return cihaz.mod === 1 && !!cihaz.adres; }
function yeniStore() {
  st = new ST.Store(prefs, function () {
    if (!lsSet(KEY2, JSON.stringify(prefs))) toast("Kaydedilemedi: telefonda yer kalmamış olabilir");
    degisti();
  }, veli());
}

// ================================================================== canlı paylaşım
var gonderT = null;
function degisti() {
  if (!ogrenci()) return;
  cihaz.bekliyor = true; cihazKaydet();
  clearTimeout(gonderT);
  gonderT = setTimeout(function () { gonder(); }, 4000);
}
function adresGecerli(a) { return /^https:\/\/script\.google\.com\/.+\/exec/.test(a); }
function istek(adres, govde, keepalive) {
  var o = govde ? {method: "POST", body: govde, redirect: "follow", keepalive: !!keepalive} : {redirect: "follow", cache: "no-store"};
  return fetch(adres, o).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(function (t) { return JSON.parse(t); });
}
function gonder(cb, keepalive) {
  if (!ogrenci()) return;
  clearTimeout(gonderT);
  var govde = JSON.stringify({veri: st.yedek(), cihaz: "iPhone"});
  var bitti = function (ok, m) {
    if (ok) { cihaz.bekliyor = false; cihaz.sonGonderim = Date.now(); cihazKaydet(); }
    renderCanli();
    if (cb) cb(ok, m);
  };
  istek(cihaz.adres, govde, keepalive && govde.length < 60000).then(function (r) {
    bitti(!!r.ok, r.ok ? "Gönderildi" : "Betik hatası: " + (r.hata || ""));
  }).catch(function () {
    // Bazı durumlarda tarayıcı cevabı okuyamaz (yönlendirme); veri yine de gitmiş olabilir: kör gönderimle bir kez daha dene
    fetch(cihaz.adres, {method: "POST", body: govde, mode: "no-cors"}).then(function () { bitti(true, "Gönderildi"); })
      .catch(function () { bitti(false, "Gönderilemedi (internet yok olabilir)"); });
  });
}
var cekiliyor = false;
function cek(elle) {
  if (!veli() || cekiliyor) return;
  cekiliyor = true;
  $("veliText").textContent = "Öğrencinin verisi alınıyor…";
  istek(cihaz.adres).then(function (r) {
    cekiliyor = false;
    if (!r.ok) throw new Error("betik");
    if (!r.veri) { toast("Öğrencinin telefonundan henüz veri gelmedi"); return yenidenCiz(); }
    if (!elle && r.zaman === cihaz.sunucuZaman) return yenidenCiz();
    if (st.tamYukle(r.veri)) { cihaz.sunucuZaman = r.zaman; cihazKaydet(); lsSet(KEY2, JSON.stringify(prefs)); if (elle) toast("Güncellendi"); }
    else toast("Gelen veri okunamadı");
    yenidenCiz();
  }).catch(function () { cekiliyor = false; toast("Bağlanılamadı (internet yok olabilir)"); yenidenCiz(); });
}
function zamanYazi(t) {
  if (!t) return "henüz yok";
  var d = new Date(t), saat = ST.pad(d.getHours()) + ":" + ST.pad(d.getMinutes());
  if (ST.key(d) === ST.key(new Date())) return "bugün " + saat;
  return d.getDate() + " " + ST.AY[d.getMonth()] + " " + saat;
}
function renderCanli() {
  var t = $("canliText");
  if (ogrenci()) { t.hidden = false; t.textContent = "Canlı paylaşım açık · son gönderim: " + zamanYazi(cihaz.sonGonderim) + (cihaz.bekliyor ? " (yeni değişiklik gönderilecek)" : ""); }
  else t.hidden = true;
}

// ================================================================== yardımcılar
function el(tag, attrs, kids) {
  var e = document.createElement(tag);
  if (attrs) for (var a in attrs) {
    if (attrs[a] === null || attrs[a] === undefined) continue;
    if (a === "text") e.textContent = attrs[a];
    else if (a === "cls") e.className = attrs[a];
    else if (a.slice(0, 2) === "on") e.addEventListener(a.slice(2), attrs[a]);
    else e.setAttribute(a, attrs[a]);
  }
  (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return e;
}
var toastT;
function toast(msg) {
  var t = document.querySelector(".toast");
  if (!t) { t = el("div", {cls: "toast"}); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(function () { t.hidden = true; }, 2800);
}
function modal(build, onClose) {
  var root = $("modalRoot"), m = el("div", {cls: "modal"}), s = el("div", {cls: "sheet"});
  m.appendChild(s); root.appendChild(m);
  var kapandi = false;
  var close = function () { if (kapandi) return; kapandi = true; if (m.parentNode) root.removeChild(m); if (onClose) onClose(); };
  m.addEventListener("click", function (e) { if (e.target === m) close(); });
  build(s, close);
  return close;
}
function ask(title, msg, okText, onOk, extra) {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: title}));
    if (msg) s.appendChild(el("p", {text: msg, style: "white-space:pre-line"}));
    var b = el("div", {cls: "btns"});
    b.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: close}));
    if (extra) b.appendChild(el("button", {cls: "btn", text: extra[0], onclick: function () { close(); extra[1](); }}));
    b.appendChild(el("button", {cls: "btn fill", text: okText, onclick: function () { close(); onOk(); }}));
    s.appendChild(b);
  });
}
function pick(title, items, onPick, geri) {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: title}));
    var l = el("div", {cls: "list"});
    items.forEach(function (it, i) { l.appendChild(el("button", {text: it, onclick: function () { close(); onPick(i); }})); });
    s.appendChild(l);
    s.appendChild(el("button", {cls: "btn mt12", text: geri ? "Geri" : "Vazgeç", onclick: function () { close(); if (geri) geri(); }}));
  });
}
function askText(title, cur, onOk, opt) {
  opt = opt || {};
  modal(function (s, close) {
    s.appendChild(el("h3", {text: title}));
    var inp = el("input", {type: opt.sayi ? "number" : "text", inputmode: opt.sayi ? "numeric" : null, pattern: opt.sayi ? "[0-9]*" : null,
      value: cur, placeholder: opt.ipucu || "", autocapitalize: opt.sayi ? null : "sentences"});
    s.appendChild(inp);
    var b = el("div", {cls: "btns"});
    b.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: close}));
    b.appendChild(el("button", {cls: "btn fill", text: opt.ok || "Tamam", onclick: function () { close(); onOk(inp.value); }}));
    s.appendChild(b);
    setTimeout(function () { inp.focus(); if (inp.select) inp.select(); }, 60);
  });
}
function saltUyar() { toast("Veli modunda değiştirilemez; kayıtlar öğrencinin telefonundan girilir."); }
function paylas(file, yedekAdi, bitti) {
  if (navigator.canShare && navigator.canShare({files: [file]})) {
    navigator.share({files: [file]}).then(function () { bitti(true); }).catch(function (e) { if (e && e.name === "AbortError") return; resimGoster(file, bitti); });
  } else resimGoster(file, bitti);
}
function resimGoster(file, bitti) {
  var url = URL.createObjectURL(file);
  if (!/^image\//.test(file.type)) { var a = el("a", {href: url, download: file.name}); document.body.appendChild(a); a.click(); a.remove(); bitti(true); return; }
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Rapor resmi"}));
    s.appendChild(el("p", {text: "Resme uzun basıp \"Fotoğraflara Kaydet\" ya da \"Paylaş\" de, sonra WhatsApp'tan gönder."}));
    s.appendChild(el("img", {src: url, style: "width:100%;border-radius:12px;border:1px solid var(--line)"}));
    s.appendChild(el("button", {cls: "btn fill mt12", text: "Gönderdim", onclick: function () { close(); bitti(true); }}));
    s.appendChild(el("button", {cls: "btn mt8", text: "Kapat", onclick: close}));
  });
}

// ================================================================== görünümler
var views = ["main", "program", "ozet", "ayar"], aktif = "main";
function go(v) {
  if (v === "program" && st.salt) { toast("Veli modunda program öğrencinin telefonundan değiştirilir."); return; }
  aktif = v;
  views.forEach(function (x) { $("v-" + x).hidden = (x !== v); });
  window.scrollTo(0, 0);
  yenidenCiz();
}
function yenidenCiz() {
  if (aktif === "main") loadDay(); else if (aktif === "program") selectPDay(pDow); else if (aktif === "ozet") renderOzet(); else if (aktif === "ayar") renderAyar();
}
document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-go")); }); });

// ================================================================== ANA EKRAN
var sel = ST.bugun(), gun = null, unsent = [];
function selKey() { return ST.key(sel); }
function loadDay() {
  gun = st.load(selKey());
  $("nameTop").textContent = st.ad();
  $("appTitle").textContent = st.uygAdi();
  document.title = st.uygAdi();
  var salt = st.salt;
  $("veliBox").hidden = !salt;
  if (salt) $("veliText").textContent = "Öğrencinin telefonundan son veri: " + zamanYazi(cihaz.sunucuZaman);
  $("addLesson").hidden = salt; $("clearDay").hidden = salt; $("kitap").disabled = salt;
  $("progBtn").hidden = salt;
  renderUnsent(); renderTekrar(); renderWeek();
  $("dateTitle").textContent = ST.tarihYazi(sel);
  $("goToday").hidden = selKey() === ST.key(ST.bugun());
  var dw = ST.dow(sel);
  $("dayPill").textContent = st.program(dw).length ? "Programlı gün" : "Programda ders yok";
  $("dayPill").style.setProperty("--c", ST.GUN_RENK[dw]);
  $("kitap").checked = !!gun.kitap;
  $("pageNum").textContent = gun.sayfa;
  renderLessons(); renderTotals(); renderSent(); renderCanli();
  var hp = ST.pazartesi(sel), hz = ST.gunEkle(hp, 6);
  $("haftaBtn").textContent = "Haftalık koç raporunu gönder  (" + hp.getDate() + " " + ST.AY[hp.getMonth()] + " – " + hz.getDate() + " " + ST.AY[hz.getMonth()] + ")";
  $("haftaBtn").classList.toggle("pazar", ST.dow(sel) === 1);
}
function renderUnsent() {
  unsent = st.salt ? [] : st.gonderilmemis();
  var box = $("unsent"); box.innerHTML = ""; box.hidden = !unsent.length;
  if (!unsent.length) return;
  box.appendChild(el("div", {text: "Gönderilmemiş " + unsent.length + " gün var", style: "font-weight:800;color:var(--bad)"}));
  unsent.forEach(function (k) {
    var g = st.load(k), dl = g.kitap || g.kayitlar.some(function (x) { return x.dolu(); });
    box.appendChild(el("div", {cls: "r"}, [
      el("div", {cls: "col grow"}, [el("b", {text: ST.tarihYazi(ST.parse(k))}), el("span", {cls: "muted", style: "font-size:12px", text: dl ? "Girildi, gönderilmedi" : "Hiç girilmedi"})]),
      el("button", {cls: "link", text: "Aç", onclick: function () { sel = ST.parse(k); loadDay(); window.scrollTo(0, 0); }}),
      el("button", {cls: "link", style: "color:var(--muted);margin-left:10px", text: "Atla", onclick: function () {
        var g2 = st.load(k); g2.atla = true; st.save(g2); loadDay(); toast("Bu gün için artık hatırlatılmayacak");
      }})
    ]));
  });
}
function renderTekrar() {
  var l = st.salt ? [] : ST.tekrarBugun(st), b = $("tekrarBox");
  b.hidden = !l.length; b.innerHTML = "";
  if (!l.length) return;
  b.appendChild(el("b", {text: "Bugün yeniden çözülecek " + l.length + " eski yanlış ›", style: "color:var(--blue);display:block"}));
  b.appendChild(el("span", {cls: "muted small", text: "Cevaba bakmadan çöz, sonra doğru mu yanlış mı işaretle."}));
}
$("tekrarBox").onclick = function () {
  var l = ST.tekrarBugun(st);
  if (!l.length) return;
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Yeniden çöz · " + l.length + " soru"}));
    s.appendChild(el("p", {cls: "small", text: "Kitaptaki soruyu cevaba bakmadan yeniden çöz. Sonra cevap anahtarına bakıp işaretle."}));
    l.forEach(function (q) {
      var r = el("div", {cls: "tk"});
      var bas = el("b", {text: ST.kisaAd(q.ders) + " · " + q.yazi(), style: "display:block"});
      r.appendChild(bas);
      r.appendChild(el("div", {cls: "muted", style: "font-size:12px", text: (q.konu ? q.konu + " · " : "") + "ilk yanlış " + ST.tarihYazi(ST.parse(q.tarih)) + " · " + q.sebep + (q.asama > 0 ? " · " + q.asama + ". tekrar" : "")}));
      var cevap = function (dogru) {
        var dikkat = ST.GRUP[ST.sebepNo(q.sebep)] === ST.G_DIKKAT;
        ST.tekrarSonuc(st, q, dogru);
        r.innerHTML = ""; r.appendChild(bas);
        r.appendChild(el("div", {style: "font-weight:800;font-size:13px;color:" + (dogru ? "var(--ok)" : "var(--bad)"),
          text: dogru ? (q.bitti ? "✔ Tamamlandı, listeden çıktı." : "✔ Doğru. Sıradaki tekrar " + ST.ARALIK[q.asama] + " gün sonra.")
            : "✘ 2 gün sonra yeniden sorulacak." + (dikkat ? " Dikkat hatası değil, bilgi eksiği sayıldı." : "")}));
      };
      r.appendChild(el("div", {cls: "row mt8"}, [
        el("button", {cls: "btn okb", style: "padding:9px", text: "Doğru çözdüm", onclick: function () { cevap(true); }}),
        el("button", {cls: "btn badb", style: "padding:9px", text: "Yine yanlış", onclick: function () { cevap(false); }})]));
      s.appendChild(r);
    });
    s.appendChild(el("button", {cls: "btn mt12", text: "Kapat", onclick: close}));
  }, function () { renderTekrar(); });
};
function renderWeek() {
  var box = $("days"); box.innerHTML = "";
  var m = ST.pazartesi(sel), sk = selKey(), tk = ST.key(ST.bugun());
  for (var i = 0; i < 7; i++) (function (d) {
    var k = ST.key(d), dw = ST.dow(d), mark = "", cls = "";
    if (st.has(k)) { var g = st.load(k); if (g.gonderildi) { mark = "✓"; cls = "ok"; } else if (g.kayitlar.some(function (x) { return x.dolu(); })) mark = "•"; }
    if ((mark === "" || mark === "•") && unsent.indexOf(k) >= 0) { mark = "!"; cls = "bad"; }
    if (k === tk && mark === "") { mark = "bugün"; cls = "sm"; }
    var b = el("button", {cls: "day" + (k === sk ? " sel" : ""), onclick: function () { sel = d; loadDay(); }},
      [el("b", {text: ST.GUNK[dw]}), el("span", {text: String(d.getDate())}), el("i", {cls: cls, text: mark || " "})]);
    b.style.setProperty("--c", ST.GUN_RENK[dw]); box.appendChild(b);
  })(ST.gunEkle(m, i));
}
function renderLessons() {
  var box = $("lessons"); box.innerHTML = "";
  if (!gun.kayitlar.length) box.appendChild(el("p", {cls: "muted center", text: st.salt ? "Bu gün için kayıt yok." : "Bugün programda ders yok. Soru çözdüysen aşağıdan ders ekle."}));
  gun.kayitlar.forEach(function (r) { box.appendChild(card(r)); });
}
var ETIKET = ["Soru", "Doğru", "Yanlış"], ALAN = ["soru", "dogru", "yanlis"];
function card(k) {
  var res = el("div", {cls: "res"}), nums = [];
  var head = el("div", {cls: "top2"}, [
    el("div", {}, [el("span", {cls: "ad", text: k.ders}), el("div", {cls: "saat", text: k.saat || "Ek çalışma"}),
      k.ek && !st.salt ? el("button", {cls: "link danger", style: "font-size:13px", text: "Kaldır", onclick: function () { gun.kayitlar.splice(gun.kayitlar.indexOf(k), 1); changed(); renderLessons(); }}) : null]),
    res]);
  var steps = el("div", {cls: "steps"});
  ALAN.forEach(function (f, fi) {
    var num = el("button", {cls: "num", text: "0", onclick: function () {
      if (st.salt) return saltUyar();
      askText(k.ders + " – " + ETIKET[fi], k[f] || "", function (v) { setVal(k, fi, parseInt(v, 10) || 0); update(); }, {sayi: true});
    }});
    nums.push(num);
    var minus = el("button", {text: "−", onclick: function () { setVal(k, fi, k[f] - 1); update(); }});
    var plus = el("button", {text: "+", onclick: function () { setVal(k, fi, k[f] + 1); update(); }});
    longPress(plus, function () { setVal(k, fi, k[f] + 5); update(); });
    steps.appendChild(el("div", {}, [el("div", {cls: "lbl" + (fi === 1 ? " lab-d" : fi === 2 ? " lab-y" : ""), text: ETIKET[fi]}),
      el("div", {cls: "step" + (fi === 1 ? " d" : fi === 2 ? " y" : "")}, [minus, num, plus])]));
  });
  var neden = el("button", {cls: "neden", onclick: function () { yanlisSebep(k, function () { update(); changed(); }); }});
  function update() {
    ALAN.forEach(function (f, i) { nums[i].textContent = k[f]; });
    if (k.soru > 0) {
      var p = ST.basari(k.soru, k.dogru);
      res.textContent = "%" + p + " başarı\n" + k.bos() + " boş";
      res.style.color = p >= 75 ? "var(--ok)" : p < 50 ? "var(--bad)" : "var(--warn)";
    } else res.textContent = "";
    var n = k.isaretli();
    neden.hidden = !(k.yanlis > 0 || n > 0);
    neden.textContent = n === 0 ? "Yanlış soruları gir ›" : n > k.yanlis ? "Yanlış sorular  " + n + "/" + k.yanlis + " – fazla ›" : "Yanlış sorular  " + n + "/" + k.yanlis + " girildi ›";
    neden.style.color = n > k.yanlis ? "var(--bad)" : n === k.yanlis && k.yanlis > 0 ? "var(--ok)" : "var(--ink)";
  }
  update();
  return el("div", {cls: "card lesson"}, [head, steps, neden]);
}
function longPress(btn, fn) {
  var t = null, fired = false;
  btn.addEventListener("touchstart", function () { fired = false; t = setTimeout(function () { fired = true; fn(); }, 550); }, {passive: true});
  btn.addEventListener("touchend", function (e) { clearTimeout(t); if (fired) e.preventDefault(); });
  btn.addEventListener("touchmove", function () { clearTimeout(t); }, {passive: true});
  btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}
function setVal(k, f, v) {
  if (st.salt) return saltUyar();
  v = Math.max(0, Math.min(500, v | 0));
  if (f === 0) k.soru = v; else if (f === 1) k.dogru = v; else k.yanlis = v;
  if (f !== 0 && k.dogru + k.yanlis > k.soru) k.soru = k.dogru + k.yanlis;
  if (f === 0 && k.dogru + k.yanlis > k.soru) { k.dogru = Math.min(k.dogru, k.soru); k.yanlis = Math.max(0, k.soru - k.dogru); }
  changed();
}
function changed() {
  if (st.salt) { saltUyar(); loadDay(); return; }
  gun.gonderildi = false;
  st.save(gun);
  renderTotals(); renderSent(); renderWeek(); renderCanli();
}
function renderTotals() {
  var t = ST.toplam(gun.kayitlar), lab = ["Soru", "Doğru", "Yanlış", "Boş", "Net"], val = [t[0], t[1], t[2], t[3], ST.net(t[1], t[2])];
  var col = ["var(--ink)", "var(--ok)", "var(--bad)", "var(--ink)", "var(--blue)"], box = $("totals");
  box.innerHTML = "";
  for (var i = 0; i < 5; i++) box.appendChild(el("div", {}, [el("div", {cls: "lbl", text: lab[i]}), el("b", {text: String(val[i]), style: "color:" + col[i]})]));
}
function renderSent() {
  $("sentText").textContent = gun.gonderildi ? "✓ Bu günün raporu gönderildi" : "";
  $("hint").textContent = gun.gonderildi ? "Bir şey değiştirirsen tekrar gönderebilirsin." : "Rapor resim olarak hazırlanır; açılan menüden WhatsApp'ı ve kişiyi seçersin.";
}
$("prevW").onclick = function () { sel = ST.gunEkle(sel, -7); loadDay(); };
$("nextW").onclick = function () { sel = ST.gunEkle(sel, 7); loadDay(); };
$("goToday").onclick = function () { sel = ST.bugun(); loadDay(); };
$("kitap").onchange = function () { if (st.salt) return loadDay(); gun.kitap = this.checked; if (!gun.kitap) gun.sayfa = 0; $("pageNum").textContent = gun.sayfa; changed(); };
function setPages(v) {
  if (st.salt) return saltUyar();
  gun.sayfa = Math.max(0, Math.min(2000, v | 0)); $("pageNum").textContent = gun.sayfa;
  if (gun.sayfa > 0) { gun.kitap = true; $("kitap").checked = true; }
  changed();
}
$("pm").onclick = function () { setPages(gun.sayfa - 1); };
$("pp").onclick = function () { setPages(gun.sayfa + 1); };
longPress($("pp"), function () { setPages(gun.sayfa + 10); });
$("pageNum").onclick = function () { if (st.salt) return saltUyar(); askText("Kaç sayfa okudun?", gun.sayfa || "", function (v) { setPages(parseInt(v, 10) || 0); }, {sayi: true}); };
$("addLesson").onclick = function () {
  var l = st.dersListesi();
  pick("Hangi ders?", l, function (i) { var k = new ST.Kayit(); k.ders = l[i]; k.saat = ""; k.ek = true; gun.kayitlar.push(k); changed(); renderLessons(); });
};
$("clearDay").onclick = function () {
  ask("Bu gün temizlensin mi?", ST.tarihYazi(sel) + " için girilen tüm sayılar, eklenen dersler ve kitap bilgisi silinir. Gün, programdaki boş haline döner. WhatsApp'a gönderilmiş mesaj silinmez.", "Temizle",
    function () { st.sil(selKey()); loadDay(); toast("Gün temizlendi"); });
};
$("yenile").onclick = function () { cek(true); };

// ------------------------------------------------------------------ rapor gönder
function resimPaylas(cv, ad, sonra) {
  cv.toBlob(function (blob) { paylas(new File([blob], ad, {type: "image/png"}), false, sonra); }, "image/png");
}
$("send").onclick = function () {
  var k = selKey();
  var gonderGun = function () {
    var g = st.load(k);
    resimPaylas(RAPOR.gunluk(st, g), "rapor_" + k + ".png", function () {
      if (st.salt) return;
      gun.gonderildi = true; gun.atla = false; st.save(gun); renderSent(); renderUnsent(); renderWeek();
    });
  };
  if (k !== ST.key(ST.bugun())) ask("Bu rapor bugünün değil", "Göndermek üzere olduğun rapor: " + ST.tarihYazi(sel) + "\nBugün: " + ST.tarihYazi(ST.bugun()) + "\n\nEski bir günü göndermek istiyorsan devam et.",
    "Yine de gönder", gonderGun, ["Bugüne git", function () { sel = ST.bugun(); loadDay(); }]);
  else gonderGun();
};
$("haftaBtn").onclick = function () {
  resimPaylas(RAPOR.haftalik(st, sel), "haftalik_" + selKey() + ".png", function () { toast("Haftalık rapor hazırlandı"); });
};

// ================================================================== YANLIŞ SORULAR
var GRUP_RENK = ["var(--g0)", "var(--g1)", "var(--g2)", "var(--g3)", "var(--g4)"];
function sRenk(i) { var g = ST.GRUP[i]; return g < 0 ? "var(--muted)" : GRUP_RENK[g]; }
function yanlisSebep(k, onChange) {
  var kapat = null;
  var ac = function () {
    kapat = modal(function (s, close) {
      var n = k.isaretli();
      s.appendChild(el("h3", {text: k.ders + " · " + k.yanlis + " yanlış"}));
      s.appendChild(el("div", {style: "font-weight:800;font-size:14px;color:" + (n > k.yanlis ? "var(--bad)" : n === k.yanlis ? "var(--ok)" : "var(--muted)"),
        text: n + " / " + k.yanlis + " yanlış soru girildi" + (n > k.yanlis ? " (fazla)" : "")}));
      k.konular.forEach(function (ko, idx) {
        var sn = ST.sebepNo(ko.length > 4 ? ko[4] : ST.KONU_EKSIGI), gg = ST.GRUP[sn];
        var alt = ST.kaynakYazi(ko);
        var bilgi = el("button", {cls: "col", onclick: function () {
          if (st.salt) return;
          close();
          sebepSor(ST.kaynakYazi(ko), "", sn, 0, function (s2) { k.konular[idx] = [ko[0], ko[1], ko[2], ko[3], ST.SEBEPLER[s2]]; ac(); }, ac);
        }}, [el("b", {text: alt || "Kaynak yok"}), ko[0] ? el("span", {cls: "muted small", text: ko[0]}) : null,
          el("span", {style: "font-weight:800;font-size:14px;color:" + sRenk(sn), text: ST.SEBEPLER[sn] + (st.salt ? "" : "  ✎")})]);
        s.appendChild(el("div", {cls: "ys " + (gg === ST.G_BILGI ? "g0" : gg < 0 ? "gy" : "gx")}, [bilgi,
          st.salt ? null : el("button", {cls: "link danger", style: "padding:6px 4px 6px 10px", text: "Sil", onclick: function () { k.konular.splice(idx, 1); close(); ac(); }})]));
      });
      k.neden.forEach(function (v, i) {
        if (!v) return;
        s.appendChild(el("div", {cls: "row mt8"}, [el("b", {cls: "grow muted", style: "font-size:14px", text: ST.NEDENLER[i] + " × " + v + "  (sorusu girilmemiş)"}),
          st.salt ? null : el("button", {cls: "link danger", text: "Sil", onclick: function () { k.neden[i]--; close(); ac(); }})]));
      });
      if (st.salt) s.appendChild(el("p", {cls: "small mt10", text: "Veli modu: sadece izleme. Değişiklik öğrencinin telefonundan yapılır."}));
      else {
        s.appendChild(el("button", {cls: "btn fill mt12", text: "+ Yanlış soru ekle", onclick: function () {
          if (k.yanlis - k.isaretli() <= 0) { toast("Yanlış sayısı kadar (" + k.yanlis + ") soru girilebilir"); return; }
          close(); kaynakSec();
        }}));
        s.appendChild(el("p", {cls: "small mt8", text: "Kitabı ve testi seç, yanlış soruları işaretle; sonra her soru için sebebini seç. Sebebi değiştirmek için soruya dokun."}));
      }
      s.appendChild(el("button", {cls: "btn mt8", text: "Tamam", onclick: function () { close(); onChange(); }}));
    }, null);
  };
  var bosYer = function () { return k.yanlis - k.isaretli(); };

  function sebepSor(soruYazi, sira, secili, kalan, cb, vazgec) {
    modal(function (s, close) {
      s.appendChild(el("h3", {text: soruYazi + (sira ? "  (" + sira + ")" : "") + " · neden yanlış?"}));
      var hepsi = el("input", {type: "checkbox"});
      if (kalan > 0) s.appendChild(el("label", {cls: "radio"}, [hepsi, "Bu sebebi kalan " + kalan + " soruya da uygula"]));
      var sonGrup = -2;
      ST.SIRA.forEach(function (i) {
        var g = ST.GRUP[i];
        if (g !== sonGrup) { sonGrup = g; s.appendChild(el("div", {cls: "gb", style: "color:" + (g < 0 ? "var(--muted)" : GRUP_RENK[g]), text: g < 0 ? "Diğer" : ST.GRUP_AD[g]})); }
        s.appendChild(el("button", {cls: "sb" + (i === secili ? " on" : ""), onclick: function () { close(); cb(i, hepsi.checked); }},
          [el("b", {style: "color:" + sRenk(i), text: ST.SEBEPLER[i]}), el("span", {text: ST.ACIKLAMA[i]})]));
      });
      s.appendChild(el("button", {cls: "btn mt12", text: "Vazgeç", onclick: function () { close(); if (vazgec) vazgec(); }}));
    });
  }
  /** aday: [konu, kaynak, test, soru] listesi; her biri için sebep sorulur. */
  function ekle(aday, i) {
    if (i >= aday.length) return ac();
    if (bosYer() <= 0) { toast((aday.length - i) + " soru eklenmedi: yanlış sayısı (" + k.yanlis + ") doldu"); return ac(); }
    var x = aday[i], kalan = Math.min(aday.length - i - 1, bosYer() - 1);
    sebepSor(ST.kaynakYazi(x), aday.length > 1 ? (i + 1) + "/" + aday.length : "", -1, kalan, function (sn, hepsine) {
      if (hepsine) {
        var j = i;
        for (; j < aday.length && bosYer() > 0; j++) k.konular.push([aday[j][0], aday[j][1], aday[j][2], aday[j][3], ST.SEBEPLER[sn]]);
        if (j < aday.length) toast((aday.length - j) + " soru eklenmedi: yanlış sayısı (" + k.yanlis + ") doldu");
        ac();
      } else { k.konular.push([x[0], x[1], x[2], x[3], ST.SEBEPLER[sn]]); ekle(aday, i + 1); }
    }, ac);
  }
  function kaynakSec() {
    var kl = ST.kitaplarDers(st, k.ders);
    if (!kl.length) return konuSec();
    pick("Hangi kitaptan?", kl.map(function (x) { return "📘 " + x.ad; }).concat(["✎ Başka kaynak / elle gir"]), function (w) {
      if (w < kl.length) kitapKonu(kl[w]); else konuSec();
    }, ac);
  }
  function kitapKonu(kitap) {
    pick(kitap.ad + (kitap.haftalik ? " · hangi hafta?" : " · konu"), kitap.konular.map(function (ko) {
      var tn = ko.tema ? ko.tema.slice(0, ko.tema.indexOf(".") > 0 ? ko.tema.indexOf(".") : 0) : "";
      return (tn ? tn + ". tema · " : "") + ko.ad;
    }), function (w) { kitapTest(kitap, kitap.konular[w]); }, kaynakSec);
  }
  function kitapTest(kitap, ko) {
    if (ko.testler.length === 1) return sorulariTikle(kitap, ko, 0);
    pick(ko.ad, ko.testler.map(function (n, i) { return "Test " + (ko.ilkTest + i) + "  ·  " + n + " soru"; }), function (w) { sorulariTikle(kitap, ko, w); }, function () { kitapKonu(kitap); });
  }
  function sorulariTikle(kitap, ko, ti) {
    var n = ko.testler[ti], sec = [], bos = bosYer();
    modal(function (s, close) {
      s.appendChild(el("h3", {text: (kitap.haftalik ? ko.ad : "Test " + (ko.ilkTest + ti)) + " · yanlış soruları işaretle (en çok " + bos + ")"}));
      var g = el("div", {cls: "qgrid"});
      for (var i = 0; i < n; i++) (function (i) {
        var b = el("button", {text: String(i + 1), onclick: function () { sec[i] = !sec[i]; b.classList.toggle("on", !!sec[i]); }});
        g.appendChild(b);
      })(i);
      s.appendChild(g);
      var bt = el("div", {cls: "btns"});
      bt.appendChild(el("button", {cls: "btn", text: "Geri", onclick: function () { close(); kitapTest(kitap, ko); }}));
      bt.appendChild(el("button", {cls: "btn fill", text: "Ekle", onclick: function () {
        close();
        if (kitap.haftalik) return haftaKonusu(kitap, ko, sec, n);
        var aday = [];
        for (var i = 0; i < n; i++) if (sec[i]) aday.push([ST.kayitAdi(ko), kitap.ad, String(ko.ilkTest + ti), String(i + 1)]);
        st.kaynakEkle(kitap.ad);
        ekle(aday, 0);
      }}));
      s.appendChild(bt);
    });
  }
  function haftaKonusu(kitap, hafta, sec, n) {
    var bilinen = st.haftaKonu(kitap.ad, hafta.ad);
    if (bilinen) return haftaEkle(kitap, hafta, sec, n, bilinen);
    var l = ST.konuListesi(k.ders).slice();
    st.ekKonular(k.ders).forEach(function (x) { if (l.indexOf(x) < 0) l.push(x); });
    pick(hafta.ad + " föyünün konusu ne? (bir kez sorulur)", l.concat(["✎ Listede yok, kendim yazayım", "Bilmiyorum, konusuz kaydet"]), function (w) {
      if (w < l.length) { st.setHaftaKonu(kitap.ad, hafta.ad, l[w]); haftaEkle(kitap, hafta, sec, n, l[w]); }
      else if (w === l.length) askText("Konu", "", function (t) {
        t = t.trim();
        if (!t) t = hafta.ad; else { st.ekKonuEkle(k.ders, t); st.setHaftaKonu(kitap.ad, hafta.ad, t); }
        haftaEkle(kitap, hafta, sec, n, t);
      }, {ipucu: "Konu adı"});
      else haftaEkle(kitap, hafta, sec, n, hafta.ad);
    }, ac);
  }
  function haftaEkle(kitap, hafta, sec, n, konu) {
    var aday = [];
    for (var i = 0; i < n; i++) if (sec[i]) aday.push([konu, kitap.ad, hafta.ad, String(i + 1)]);
    st.kaynakEkle(kitap.ad);
    ekle(aday, 0);
  }
  function konuSec() {
    var l = ST.konuListesi(k.ders).slice();
    st.ekKonular(k.ders).forEach(function (x) { if (l.indexOf(x) < 0) l.push(x); });
    pick(k.ders + " · sorunun konusu?", l.concat(["✎ Listede yok, kendim yazayım"]), function (w) {
      if (w < l.length) kaynakSor(l[w]);
      else askText("Konu", "", function (t) { t = t.trim(); if (!t) return ac(); st.ekKonuEkle(k.ders, t); kaynakSor(t); }, {ipucu: "Konu adı", ok: "Devam"});
    }, ac);
  }
  function kaynakSor(konu) {
    modal(function (s, close) {
      s.appendChild(el("h3", {text: "Yanlış soru"}));
      s.appendChild(el("b", {text: konu}));
      var ks = st.kaynaklar();
      var dl = el("datalist", {id: "kaynakOneri"}, ks.map(function (x) { return el("option", {value: x}); }));
      s.appendChild(el("div", {cls: "lbl mt12", text: "Kaynak (kitap / yayın)"}));
      var kay = el("input", {type: "text", list: "kaynakOneri", value: ks[0] || "", placeholder: "örn. Fenomen 6B", autocapitalize: "words"});
      s.appendChild(kay); s.appendChild(dl);
      var test = el("input", {type: "text", placeholder: "örn. 4"}), soru = el("input", {type: "text", placeholder: "örn. 2 veya 2, 5, 9"});
      s.appendChild(el("div", {cls: "row mt12", style: "align-items:flex-start"}, [
        el("div", {cls: "grow"}, [el("div", {cls: "lbl", text: "Test no"}), test]),
        el("div", {cls: "grow"}, [el("div", {cls: "lbl", text: "Soru no"}), soru])]));
      s.appendChild(el("p", {cls: "small mt8", text: "Hepsi isteğe bağlı; boş bırakılabilir."}));
      var bt = el("div", {cls: "btns"});
      bt.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: function () { close(); ac(); }}));
      bt.appendChild(el("button", {cls: "btn fill", text: "Ekle", onclick: function () {
        close();
        var kk = kay.value.trim(), sq = soru.value.trim(), tt = test.value.trim();
        st.kaynakEkle(kk);
        var parca = sq ? sq.split(/[,\s]+/).filter(Boolean) : [""];
        ekle(parca.map(function (p) { return [konu, kk, tt, p.trim()]; }), 0);
      }}));
      s.appendChild(bt);
    });
  }
  ac();
}

// ================================================================== PROGRAM
var SIRA7 = [2, 3, 4, 5, 6, 7, 1], pDow = ST.dow(ST.bugun()), plist = [];
function selectPDay(dw) {
  pDow = dw; plist = st.program(dw);
  var t = $("ptabs"); t.innerHTML = "";
  SIRA7.forEach(function (d) { var b = el("button", {cls: d === dw ? "sel" : "", text: ST.GUNK[d], onclick: function () { selectPDay(d); }}); b.style.setProperty("--c", ST.GUN_RENK[d]); t.appendChild(b); });
  $("pday").textContent = ST.GUN[dw]; renderSlots();
}
function psave() { st.saveProgram(pDow, plist); }
function renderSlots() {
  var box = $("slots"); box.innerHTML = "";
  if (!plist.length) box.appendChild(el("p", {cls: "muted center", text: "Bu gün için ders yok. \"+ Ders ekle\" ile ekleyebilirsin."}));
  plist.forEach(function (x, i) {
    box.appendChild(el("div", {cls: "card slot", style: i ? "margin-top:8px" : ""}, [
      el("div", {cls: "col"}, [
        el("button", {cls: "ad", text: x.ders, onclick: function () { pickLesson(function (d) { x.ders = d; psave(); renderSlots(); }); }}),
        el("button", {cls: "saat", text: (x.saat || "Saat ekle") + "  ✎", onclick: function () { pickTime(x.saat, function (s) { x.saat = s; psave(); renderSlots(); }); }})]),
      el("button", {cls: "ic", text: "↑", style: i ? "" : "visibility:hidden", onclick: function () { var a = plist.splice(i, 1)[0]; plist.splice(i - 1, 0, a); psave(); renderSlots(); }}),
      el("button", {cls: "ic danger", text: "✕", onclick: function () { ask(x.ders + " çıkarılsın mı?", "Bu günün programından çıkarılır.", "Çıkar", function () { plist.splice(i, 1); psave(); renderSlots(); }); }})
    ]));
  });
}
function pickLesson(cb) {
  var l = st.dersListesi();
  pick("Ders seç", l.concat(["Başka ders yaz…"]), function (i) {
    if (i < l.length) return cb(l[i]);
    askText("Ders adı", "", function (v) { v = (v || "").trim(); if (!v) return; st.dersEkle(v); cb(v); });
  });
}
function parseRange(s) { var m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(s || ""); return m ? [+m[1], +m[2], +m[3], +m[4]] : [18, 30, 19, 0]; }
function fmt(h, m) { return ST.pad(h % 24) + ":" + ST.pad(m % 60); }
function pickTime(cur, cb) {
  var r = parseRange(cur);
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Ders saati"}));
    var a = el("input", {type: "time", value: fmt(r[0], r[1])}), b = el("input", {type: "time", value: fmt(r[2], r[3])});
    s.appendChild(el("div", {cls: "lbl", text: "Başlangıç"})); s.appendChild(a);
    s.appendChild(el("div", {cls: "lbl mt12", text: "Bitiş"})); s.appendChild(b);
    var bt = el("div", {cls: "btns"});
    bt.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: close}));
    bt.appendChild(el("button", {cls: "btn fill", text: "Tamam", onclick: function () { close(); if (a.value && b.value) cb(a.value + "–" + b.value); }}));
    s.appendChild(bt);
  });
}
$("addSlot").onclick = function () {
  pickLesson(function (d) {
    var bas = 18 * 60 + 30;
    if (plist.length) { var r = parseRange(plist[plist.length - 1].saat); bas = r[2] * 60 + r[3] + 5; }
    var son = bas + 30, x = new ST.Kayit();
    x.ders = d; x.saat = fmt(Math.floor(bas / 60), bas % 60) + "–" + fmt(Math.floor(son / 60), son % 60);
    plist.push(x); psave(); renderSlots();
  });
};
$("copyDay").onclick = function () {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: ST.GUN[pDow] + " programı hangi günlere kopyalansın?"}));
    var boxes = [];
    SIRA7.forEach(function (d) { if (d === pDow) return; var cb = el("input", {type: "checkbox"}); boxes.push([d, cb]); s.appendChild(el("label", {cls: "radio"}, [cb, ST.GUN[d]])); });
    var bt = el("div", {cls: "btns"});
    bt.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: close}));
    bt.appendChild(el("button", {cls: "btn fill", text: "Kopyala", onclick: function () {
      var n = 0; boxes.forEach(function (x) { if (x[1].checked) { st.saveProgram(x[0], plist); n++; } }); close(); toast(n + " güne kopyalandı");
    }}));
    s.appendChild(bt);
  });
};

// ================================================================== ÖZET
var period = 0;
document.querySelectorAll("#seg button").forEach(function (b) {
  b.onclick = function () { period = +b.getAttribute("data-p"); document.querySelectorAll("#seg button").forEach(function (x) { x.classList.toggle("on", x === b); }); renderOzet(); };
});
function renderOzet() {
  var now = ST.bugun(), from = null, to = null;
  if (period === 0) { var m = ST.pazartesi(now), e = ST.gunEkle(m, 6); from = ST.key(m); to = ST.key(e); $("range").textContent = m.getDate() + " " + ST.AY[m.getMonth()] + " – " + e.getDate() + " " + ST.AY[e.getMonth()]; }
  else if (period === 1) { from = ST.key(new Date(now.getFullYear(), now.getMonth(), 1, 12)); to = ST.key(new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)); $("range").textContent = ST.AY[now.getMonth()] + " " + now.getFullYear(); }
  else $("range").textContent = "Tüm kayıtlar";
  var by = {}, sira = ST.DERSLER.slice(), gunSay = 0, sayfa = 0, kitapGun = 0;
  st.allKeys().forEach(function (k) {
    if (from && (k < from || k > to)) return;
    var g = st.load(k), any = false;
    if (g.kitap) { kitapGun++; sayfa += g.sayfa; }
    g.kayitlar.forEach(function (x) { if (!x.dolu()) return; any = true; (by[x.ders] = by[x.ders] || []).push(x); if (sira.indexOf(x.ders) < 0) sira.push(x.ders); });
    if (any) gunSay++;
  });
  var box = $("sumTable"); box.innerHTML = "";
  var all = []; sira.forEach(function (n) { if (by[n]) all = all.concat(by[n]); });
  if (!all.length) box.appendChild(el("p", {cls: "muted center", text: "Bu dönemde henüz kayıt yok."}));
  else {
    var tb = el("table"), th = el("tr");
    ["Ders", "Soru", "D", "Y", "Net", "%"].forEach(function (h) { th.appendChild(el("th", {text: h})); }); tb.appendChild(th);
    var line = function (n, t, bold) {
      var p = ST.basari(t[0], t[1]);
      tb.appendChild(el("tr", {style: bold ? "font-weight:800" : ""}, [el("td", {text: n}), el("td", {text: String(t[0])}), el("td", {cls: "d", text: String(t[1])}), el("td", {cls: "y", text: String(t[2])}),
        el("td", {text: ST.net(t[1], t[2])}), el("td", {text: "%" + p, style: "color:" + (p >= 75 ? "var(--ok)" : p >= 50 ? "var(--warn)" : "var(--bad)")})]));
    };
    sira.forEach(function (n) { if (by[n]) line(n, ST.toplam(by[n])); });
    line("Toplam", ST.toplam(all), true);
    box.appendChild(tb);
    box.appendChild(el("p", {cls: "muted", style: "font-size:13px;margin:8px 0 0", text: gunSay + " gün çalışma kaydı"}));
  }
  if (kitapGun) box.appendChild(el("p", {style: "font-weight:800;margin:10px 0 0", text: "📖 " + kitapGun + " gün kitap okundu, toplam " + sayfa + " sayfa"}));
  if (period === 0) {
    var dr = ST.hafta(st, ST.bugun());
    box.appendChild(el("h3", {cls: "sec", text: "Bu haftanın değerlendirmesi"}));
    box.appendChild(el("div", {cls: "muted small", text: "Haftalık koç raporunda da bu cümleler gider."}));
    dr.cumleler.forEach(function (c) { box.appendChild(el("p", {style: "margin:8px 0 0", text: "• " + c})); });
    if (dr.dipnot) box.appendChild(el("p", {cls: "muted small", style: "margin:8px 0 0", text: dr.dipnot}));
  }
  sebepler(box, all);
}
function sebepler(box, all) {
  var n = ST.SEBEPLER.length, top = ST.SEBEPLER.map(function () { return 0; }), dersBy = {}, dersSira = [], konuBy = {}, konuSira = [], yanlis = 0;
  all.forEach(function (k) {
    yanlis += k.yanlis;
    if (!dersBy[k.ders]) { dersBy[k.ders] = ST.SEBEPLER.map(function () { return 0; }); dersSira.push(k.ders); }
    var c = ST.sebepSay(k);
    for (var i = 0; i < n; i++) { dersBy[k.ders][i] += c[i]; top[i] += c[i]; }
    k.konular.forEach(function (ko) {
      if (!ko[0] || (ko.length > 4 && ko[4] === ST.HATALI)) return;
      var key = ST.kisaAd(k.ders) + " · " + ST.mufredat(k.ders, ko[0]);
      if (!konuBy[key]) { konuBy[key] = 0; konuSira.push(key); }
      konuBy[key]++;
    });
  });
  var isaretli = top.reduce(function (a, b) { return a + b; }, 0);
  if (!isaretli) return;
  box.appendChild(el("h3", {cls: "sec", text: "Yanlış sebepleri"}));
  box.appendChild(el("div", {cls: "muted small", text: yanlis + " yanlışın " + isaretli + " tanesinin sebebi girilmiş"}));
  top.forEach(function (v, i) {
    if (!v) return;
    var pct = ST.round(v * 100 / isaretli);
    box.appendChild(el("div", {cls: "row mt8"}, [el("b", {cls: "grow", text: ST.SEBEPLER[i]}), el("b", {style: "color:" + (i === 0 ? "var(--warn)" : "var(--bad)"), text: v + "  (%" + pct + ")"})]));
    box.appendChild(el("div", {cls: "bar"}, [el("i", {style: "width:" + pct + "%;background:" + (i === 0 ? "#F0C77A" : "#E7A3A3")})]));
  });
  box.appendChild(el("h4", {style: "margin:16px 0 0", text: "Ders ders"}));
  dersSira.forEach(function (d) {
    var b = []; dersBy[d].forEach(function (v, i) { if (v) b.push(ST.SEBEPLER[i] + " " + v); });
    if (b.length) box.appendChild(el("div", {cls: "mt8"}, [el("b", {text: d}), el("div", {cls: "muted small", text: b.join(" · ")})]));
  });
  if (konuSira.length) {
    var l = konuSira.map(function (k, i) { return [k, konuBy[k], i]; }).sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; });
    box.appendChild(el("h4", {style: "margin:16px 0 0", text: "En çok yanlış yapılan konular"}));
    l.slice(0, 10).forEach(function (x) { box.appendChild(el("div", {cls: "row mt8"}, [el("span", {cls: "grow", text: x[0]}), el("b", {style: "color:var(--warn)", text: "×" + x[1]})])); });
  }
}

// ================================================================== AYARLAR
function renderAyar() {
  $("adInput").value = st.ad(); $("uygInput").value = st.uygAdi();
  $("adInput").disabled = $("uygInput").disabled = st.salt;
  $("sonYedek").textContent = cihaz.sonYedek ? "Son yedek: " + zamanYazi(cihaz.sonYedek) : "Henüz yedek alınmadı.";
  $("sonYedek").style.color = cihaz.sonYedek ? "var(--ok)" : "var(--bad)";
  var m = cihaz.adres ? cihaz.mod || 0 : 0;
  $("canliDurum").textContent = m === 1 ? "Açık · bu telefon öğrencinin; veriler gönderiliyor. Son gönderim: " + zamanYazi(cihaz.sonGonderim)
    : m === 2 ? "Açık · bu telefon velinin; sadece izleniyor. Son veri: " + zamanYazi(cihaz.sunucuZaman)
    : "Kapalı. Açarsan öğrencinin girdiği kayıtlar velinin telefonunda da görünür.";
  $("canliDurum").style.color = m ? "var(--ok)" : "var(--muted)";
  $("surum").textContent = "Soru Takibi · iPhone sürümü " + ST.VERI.SURUM + " (Android " + ST.VERI.SURUM + " ile aynı)";
}
$("saveAyar").onclick = function () {
  if (st.salt) return saltUyar();
  var a = $("adInput").value.trim(), u = $("uygInput").value.trim();
  st.setAd(a || "Öğrenci"); st.setUygAdi(u || "Soru Takibi"); toast("Kaydedildi");
};
$("canliBtn").onclick = function () { canliAyar(); };
function canliAyar() {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Canlı paylaşım"}));
    s.appendChild(el("p", {cls: "small", text: "Öğrencinin telefonu her değişiklikten sonra verileri velinin Google hesabındaki betiğe gönderir. Velinin telefonu (iPhone ya da Android) açılınca oradan alır. Kurulum için betiğin adresi gerekir."}));
    var mod = cihaz.adres ? cihaz.mod || 0 : 0, r = [];
    ["Kapalı", "Bu telefon öğrencinin (verileri gönderir)", "Bu telefon velinin (sadece izler)"].forEach(function (t, i) {
      var inp = el("input", {type: "radio", name: "canliMod"}); if (i === mod) inp.checked = true; r.push(inp);
      s.appendChild(el("label", {cls: "radio"}, [inp, t]));
    });
    s.appendChild(el("div", {cls: "lbl mt12", text: "Bağlantı adresi (…/exec ile biter)"}));
    var adres = el("input", {type: "url", value: cihaz.adres || "", placeholder: "https://script.google.com/macros/s/…/exec", autocapitalize: "off", autocorrect: "off", style: "font-size:14px"});
    s.appendChild(adres);
    var durum = el("p", {cls: "small", style: "margin:6px 0 0"});
    s.appendChild(durum);
    s.appendChild(el("button", {cls: "btn soft mt8", text: "Bağlantıyı dene", onclick: function () {
      var a = adres.value.trim();
      if (!adresGecerli(a)) { durum.textContent = "Adres https://script.google.com/ ile başlamalı ve /exec ile bitmeli."; durum.style.color = "var(--bad)"; return; }
      durum.textContent = "Deneniyor…"; durum.style.color = "var(--muted)";
      istek(a).then(function (o) {
        durum.textContent = !o.ok ? "Betik hata verdi" : !o.zaman ? "Bağlantı çalışıyor (henüz veri yok)" : "Bağlantı çalışıyor · son veri " + zamanYazi(o.zaman);
        durum.style.color = o.ok ? "var(--ok)" : "var(--bad)";
      }).catch(function () { durum.textContent = "Bağlanılamadı. Adresi ve betiğin \"Herkes\" erişimiyle dağıtıldığını kontrol et."; durum.style.color = "var(--bad)"; });
    }}));
    s.appendChild(el("button", {cls: "btn soft mt8", text: "Adresi diğer veliye gönder", onclick: function () {
      var a = adres.value.trim();
      if (!adresGecerli(a)) return toast("Önce geçerli bir adres yaz");
      var metin = "Soru Takibi canlı paylaşım adresi (uygulamada Ayarlar → Canlı paylaşım'a yapıştır):\n" + a;
      if (navigator.share) navigator.share({text: metin}).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(a).then(function () { toast("Adres kopyalandı"); });
    }}));
    var bt = el("div", {cls: "btns"});
    bt.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: close}));
    bt.appendChild(el("button", {cls: "btn fill", text: "Kaydet", onclick: function () {
      var yeni = r.findIndex(function (x) { return x.checked; }), a = adres.value.trim();
      if (yeni !== 0 && !adresGecerli(a)) { toast("Adres geçersiz; kaydedilmedi."); return; }
      close();
      if (yeni === 2 && !veli() && st.allKeys().length) {
        ask("Bu telefon velinin mi?", "Veli modunda bu telefondaki kayıtların yerine öğrencinin telefonundaki kayıtlar gelir ve burada kayıt girilemez.\n\nÖğrencinin kendi telefonunda bunu seçme; orada \"öğrencinin\" seçilmeli.",
          "Evet, velinin", function () { lsSet("soruTakibi.veliOncesi", JSON.stringify(prefs)); canliKaydet(yeni, a); });
        return;
      }
      canliKaydet(yeni, a);
    }}));
    s.appendChild(bt);
  });
}
function canliKaydet(mod, a) {
  cihaz.mod = mod;
  if (mod !== 0) cihaz.adres = a;
  cihaz.sunucuZaman = 0;
  cihazKaydet();
  yeniStore();
  if (mod === 1) gonder(function (ok, m) { toast(ok ? "Canlı paylaşım açıldı, veriler gönderildi ✓" : m); });
  else if (mod === 2) { cihaz.kurulum = true; cihazKaydet(); cek(true); }
  else toast("Canlı paylaşım kapatıldı");
  yenidenCiz();
}

// ------------------------------------------------------------------ kitaplar
$("kitapBtn").onclick = function () { kitapAyar(); };
function kitapAyar() {
  if (st.salt) return toast("Veli modunda kitaplar öğrencinin telefonundan değiştirilir.");
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Kitaplar"}));
    s.appendChild(el("button", {cls: "btn fill", text: "+ Yeni kitap ekle", onclick: function () { close(); yeniKitap(); }}));
    s.appendChild(el("p", {cls: "small mt8", text: "Kullanmadığın kitabı çıkarırsan yanlış soru eklerken listede görünmez. Daha önce girilmiş sorular silinmez."}));
    var gizli = ST.kitapGizli(st), hepsi = ST.kitaplarGomulu().concat(ST.kitapParse(st.metin("kitapEk", ""), true)), son = null;
    st.dersListesi().forEach(function (ders) {
      hepsi.forEach(function (k) {
        if (!k.ders || ders.indexOf(k.ders) !== 0) return;
        if (ders !== son) { son = ders; s.appendChild(el("div", {cls: "gb", style: "color:var(--blue);font-size:14px;margin-top:16px", text: ders})); }
        var kapali = gizli.indexOf(k.ad) >= 0 && !k.kullanici;
        s.appendChild(el("div", {cls: "kitap"}, [
          el("span", {cls: "grow", style: kapali ? "color:var(--muted)" : "font-weight:700", text: (k.kullanici ? "✎ " : "") + k.ad}),
          el("button", {cls: "link" + (kapali ? "" : " danger"), text: kapali ? "Geri al" : k.kullanici ? "Sil" : "Çıkar", onclick: function () {
            if (kapali) ST.kitapGeriAl(st, k.ad); else ST.kitapSil(st, k);
            close(); kitapAyar();
          }})]));
      });
    });
    s.appendChild(el("button", {cls: "btn mt12", text: "Kapat", onclick: close}));
  });
}
function yeniKitap() {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Yeni kitap"}));
    s.appendChild(el("div", {cls: "lbl", text: "Kitabın adı"}));
    var ad = el("input", {type: "text", placeholder: "örn. Yayınevi 6. Sınıf Matematik Soru Bankası", autocapitalize: "words"});
    s.appendChild(ad);
    s.appendChild(el("div", {cls: "lbl mt12", text: "Ders"}));
    var dersler = st.dersListesi(), ders = el("select", {style: "width:100%;font:inherit;font-size:17px;padding:11px;border:1.5px solid var(--line);border-radius:12px;background:var(--field)"},
      dersler.map(function (d) { return el("option", {value: d, text: d}); }));
    s.appendChild(ders);
    s.appendChild(el("p", {cls: "small mt12", text: "Konular (içindekiler sırasıyla). Testlerin soru sayısı farklıysa \"Soru\" kutusuna virgülle yaz: 12,12,10"}));
    var konular = el("div"), satirlar = [];
    var satirEkle = function () {
      var k = el("input", {type: "text", placeholder: "Konu adı"}), t = el("input", {type: "text", inputmode: "numeric", placeholder: "Test"}),
        q = el("input", {type: "text", inputmode: "decimal", placeholder: "Soru"});
      konular.appendChild(el("div", {cls: "row mt8"}, [el("div", {style: "flex:3;min-width:0"}, [k]), el("div", {style: "flex:1;min-width:0"}, [t]), el("div", {style: "flex:1.3;min-width:0"}, [q])]));
      satirlar.push([k, t, q]);
    };
    satirEkle(); satirEkle();
    s.appendChild(konular);
    s.appendChild(el("button", {cls: "btn soft mt8", text: "+ Konu ekle", onclick: satirEkle}));
    var bt = el("div", {cls: "btns"});
    bt.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: function () { close(); kitapAyar(); }}));
    bt.appendChild(el("button", {cls: "btn fill", text: "Kaydet", onclick: function () {
      var kad = ad.value.trim(), kl = [];
      satirlar.forEach(function (x) {
        var n = x[0].value.trim(), tm = ST.testMetni(x[1].value, x[2].value);
        if (n && tm) kl.push([n, tm]);
      });
      if (!kad || !kl.length) { toast("Kitap adı ve en az bir konu (test ve soru sayısıyla) gerekli."); return; }
      ST.kitapEkle(st, ST.kitapMetni(kad, ders.value, kl));
      close(); toast("Kitap eklendi ✓"); kitapAyar();
    }}));
    s.appendChild(bt);
  });
}

// ------------------------------------------------------------------ koç ayarları
$("kocBtn").onclick = function () {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Koç ayarları"}));
    s.appendChild(el("p", {cls: "small", text: "Bu değerler haftalık koç raporundaki değerlendirme cümlelerini belirler. Çoğu araştırmadan değil tasarım tercihinden gelir; koç kendi öğrencisine göre değiştirebilir."}));
    s.appendChild(el("h4", {style: "margin:12px 0 0", text: "Ders başarı hedefleri (%)"}));
    s.appendChild(el("div", {cls: "muted small", text: "Boş bırakılırsa o ders için hedef yorumu yapılmaz. Örnek: 70"}));
    var dersler = st.dersListesi(), hedefler = dersler.map(function (d) { return satir(s, d, st.metin("hedef_" + d, "")); });
    s.appendChild(el("h4", {style: "margin:16px 0 0", text: "Eşikler"}));
    var esikler = ST.ESIKLER.map(function (e) {
      var i = satir(s, e[1], String(ST.esik(st, e[0])));
      s.appendChild(el("div", {cls: "muted", style: "font-size:11px", text: e[3] + " (varsayılan " + e[2] + ")"}));
      return i;
    });
    var bt = el("div", {cls: "btns"});
    bt.appendChild(el("button", {cls: "btn", text: "Vazgeç", onclick: close}));
    if (!st.salt) {
      bt.appendChild(el("button", {cls: "btn", text: "Varsayılan", onclick: function () {
        ST.ESIKLER.forEach(function (e) { st.setMetin("esik_" + e[0], null); }); close(); toast("Eşikler varsayılana döndü (ders hedefleri korundu)");
      }}));
      bt.appendChild(el("button", {cls: "btn fill", text: "Kaydet", onclick: function () {
        dersler.forEach(function (d, i) { var v = hedefler[i].value.trim(); st.setMetin("hedef_" + d, v === "" ? null : v); });
        ST.ESIKLER.forEach(function (e, i) { var v = esikler[i].value.trim(); st.setMetin("esik_" + e[0], v === "" || v === e[2] ? null : v); });
        close(); toast("Koç ayarları kaydedildi");
      }}));
    }
    s.appendChild(bt);
  });
  function satir(s, baslik, deger) {
    var i = el("input", {type: "text", inputmode: "numeric", value: deger});
    if (st.salt) i.disabled = true;
    s.appendChild(el("div", {cls: "ayr"}, [el("span", {cls: "grow", text: baslik}), i]));
    return i;
  }
};

// ------------------------------------------------------------------ yedek
$("yedekAl").onclick = function () {
  var file = new File([st.yedek()], "SoruTakibi_yedek_" + ST.key(ST.bugun()) + ".json", {type: "application/json"});
  paylas(file, true, function () { cihaz.sonYedek = Date.now(); cihazKaydet(); renderAyar(); toast("Yedek hazır ✓"); });
};
$("yedekYukle").onclick = function () {
  if (st.salt) return toast("Veli modunda yedek yüklenmez; veriler öğrencinin telefonundan gelir.");
  $("yedekFile").value = ""; $("yedekFile").click();
};
$("yedekFile").onchange = function () {
  var f = this.files[0]; if (!f) return;
  var rd = new FileReader(); rd.onload = function () { geriYukle(String(rd.result)); }; rd.readAsText(f);
};
function geriYukle(text) {
  var gunler = ST.yedekGunleri(text);
  if (gunler === null) { toast("Bu dosya bir Soru Takibi yedeği değil ya da bozuk."); return; }
  var msg = gunler.length ? ("Bu yedekte " + gunler.length + " günlük kayıt var:\n" + gunler.slice(-6).map(function (k) { return "• " + ST.tarihYazi(ST.parse(k)); }).join("\n")
    + (gunler.length > 6 ? "\n… ve daha eski " + (gunler.length - 6) + " gün" : "") + "\n\nYedekteki günler bu telefondaki aynı günlerin üzerine yazılır. Yedekte olmayan günler silinmez.")
    : "⚠ Bu yedekte soru girilmiş hiç gün yok. Sadece program ve ayarlar geri gelir.";
  ask("Yedek geri yüklensin mi?", msg, "Geri yükle", function () {
    lsSet("soruTakibi.geriYuklemedenOnce", JSON.stringify(prefs));
    var n = st.geriYukle(text);
    cihaz.kurulum = true; cihazKaydet();
    toast(n < 0 ? "Geri yüklenemedi" : "Geri yüklendi ✓"); go("main");
  });
}

// ================================================================== ilk açılış
function ilkKurulum() {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Hoş geldin"}));
    s.appendChild(el("p", {text: "Bu telefonda uygulamayı kim kullanacak?"}));
    s.appendChild(el("button", {cls: "btn fill", text: "Öğrenci (soruları burada gireceğim)", onclick: function () { close(); ogrenciKur(); }}));
    s.appendChild(el("button", {cls: "btn mt8", text: "Veli (öğrencinin telefonundaki kayıtları izleyeceğim)", onclick: function () { close(); cihaz.kurulum = true; cihazKaydet(); canliAyar(); }}));
    s.appendChild(el("button", {cls: "btn mt8", text: "Yedekten geri yükle", onclick: function () { close(); cihaz.kurulum = true; cihazKaydet(); $("yedekFile").value = ""; $("yedekFile").click(); }}));
  });
}
function ogrenciKur() {
  modal(function (s, close) {
    s.appendChild(el("h3", {text: "Öğrenci"}));
    s.appendChild(el("p", {text: "Uygulamayı kullanacak öğrencinin adını yaz. Raporlarda bu ad görünür."}));
    var ad = el("input", {type: "text", placeholder: "Öğrencinin adı", autocapitalize: "words"}); s.appendChild(ad);
    s.appendChild(el("div", {cls: "lbl mt16", text: "Ders programı"}));
    var r1 = el("input", {type: "radio", name: "pr"}), r2 = el("input", {type: "radio", name: "pr"});
    r1.checked = true;
    s.appendChild(el("label", {cls: "radio"}, [r1, "Boş başla, derslerimi kendim gireceğim"]));
    s.appendChild(el("label", {cls: "radio"}, [r2, "Örnek programla başla (sonra değiştiririm)"]));
    s.appendChild(el("button", {cls: "btn fill mt12", text: "Başla", onclick: function () {
      st.setAd(ad.value.trim() || "Öğrenci"); cihaz.kurulum = true; cihazKaydet(); st.ilkGun();
      if (r1.checked) for (var d = 1; d <= 7; d++) st.saveProgram(d, []);
      close();
      if (r1.checked) { toast("Şimdi her günün derslerini ekle"); go("program"); } else go("main");
    }}));
  });
}

// ================================================================== başlangıç
yukle();
yeniStore();
if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
var standalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
if (!standalone && !cihaz.ipucuKapali) $("installTip").hidden = false;
$("tipClose").onclick = function () { cihaz.ipucuKapali = true; cihazKaydet(); $("installTip").hidden = true; };
go("main");
if (!cihaz.kurulum && !st.allKeys().length) ilkKurulum(); else if (!cihaz.kurulum) { cihaz.kurulum = true; cihazKaydet(); }
if (veli()) cek(false); else if (ogrenci() && cihaz.bekliyor) gonder();
document.addEventListener("visibilitychange", function () {
  if (document.hidden) { if (ogrenci() && cihaz.bekliyor) gonder(null, true); return; }
  if (aktif === "main" && selKey() !== ST.key(ST.bugun()) && !st.has(selKey())) sel = ST.bugun();
  yenidenCiz();
  if (veli()) cek(false); else if (ogrenci() && cihaz.bekliyor) gonder();
});
setInterval(function () { if (!document.hidden && veli()) cek(false); }, 60000);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  // yeni sürüm gelince sayfayı bir kez yenile
  var yenilendi = false, vardi = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () { if (yenilendi || !vardi) return; yenilendi = true; location.reload(); });
}
})();
