// İnternet olmadan da açılsın diye dosyaları saklar. Her açılışta önce internetten yeni sürüm denenir,
// böylece GitHub'a konan yeni sürüm kendiliğinden gelir. Yeni sürümde CACHE adını değiştir.
var CACHE = "soru-takibi-2.15";
var FILES = ["./", "index.html", "app.js", "cekirdek.js", "rapor.js", "veri.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, {cache: "reload"}); })); }));
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return; // canlı paylaşım (Google) isteklerine karışma
  e.respondWith(fetch(e.request, {cache: "no-cache"}).then(function (r) {
    var copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request, {ignoreSearch: true}); }));
});
