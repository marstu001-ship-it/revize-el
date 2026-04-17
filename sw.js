var CACHE_NAME = 'revize-el-v1.1-20260417';
var URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&family=Courier+Prime:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Instalace — uložit vše do cache
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Aktivace — smazat staré cache verze
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — nejdřív cache, pak síť (network fallback)
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Na pozadí aktualizuj cache z internetu (stale-while-revalidate)
        var fetchPromise = fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {});
        return cached;
      }
      // Není v cache — zkus síť, při úspěchu ulož do cache
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200 && e.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
