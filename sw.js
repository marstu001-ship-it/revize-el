var CACHE_NAME = 'revize-el-v9.21-20260506';
var URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&family=Courier+Prime:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Instalace — uložit vše do cache. {cache:'reload'} obchází HTTP cache
// prohlížeče, aby se vždy uložil opravdu nejnovější obsah ze serveru
// (bez tohoto kroku může prohlížeč z HTTP cache vrátit starou verzi
// a SW by ji uložil dál jako "novou").
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE.map(function(url) {
        return new Request(url, { cache: 'reload' });
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Aktivace — smazat staré cache verze + převzít kontrolu nad otevřenými
// záložkami (clients.claim) a poslat jim zprávu, ať se reloadnou.
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

// Network-first strategie pro HTML (navigace) a pro samotný sw.js —
// uživatel vždycky dostane nejnovější stránku, když je online.
// Offline: fallback na cache.
// Stale-while-revalidate pro ostatní assety (fonty, CDN script) — rychlé,
// ale na pozadí aktualizuje cache.
self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = new URL(req.url);
  var isNavigate = req.mode === 'navigate' ||
                   (req.method === 'GET' && req.headers.get('accept') &&
                    req.headers.get('accept').indexOf('text/html') !== -1);
  var isSameOrigin = url.origin === self.location.origin;
  var isHtmlOrSw = isSameOrigin && (isNavigate ||
                                     url.pathname.endsWith('/sw.js') ||
                                     url.pathname.endsWith('/index.html') ||
                                     url.pathname.endsWith('/manifest.json'));

  if (isHtmlOrSw) {
    // Network-first: zkus síť, při neúspěchu (offline) fallback na cache
    e.respondWith(
      fetch(req).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(req).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Stale-while-revalidate pro vše ostatní
  e.respondWith(
    caches.match(req).then(function(cached) {
      var fetchPromise = fetch(req).then(function(response) {
        if (response && response.status === 200 && req.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function() { return cached; });
      return cached || fetchPromise;
    })
  );
});
