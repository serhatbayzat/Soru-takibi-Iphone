// Çevrimdışı çalışma için önbellek. Güncellemede CACHE adını değiştir.
var CACHE='deyim-v1';
var DOSYALAR=['./','index.html','manifest.webmanifest','ikon-180.png','ikon-192.png','ikon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(DOSYALAR)}));self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x.indexOf('deyim-')===0 && x!==CACHE}).map(function(x){return caches.delete(x)}))}));self.clients.claim()});
self.addEventListener('fetch',function(e){e.respondWith(fetch(e.request).then(function(r){var k=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,k)});return r}).catch(function(){return caches.match(e.request).then(function(r){return r||caches.match('index.html')})}))});
