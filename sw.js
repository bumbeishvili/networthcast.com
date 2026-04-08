const CACHE_NAME = 'networthcast-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/_styles/main.css',
  '/_js/app.js',
  '/_js/state.js',
  '/_js/i18n.js',
  '/_js/forecast.js',
  '/_js/chart.js',
  '/_js/slider.js',
  '/_js/sections.js',
  '/_js/profiles.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: pre-cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, cache-first for assets
self.addEventListener('fetch', e => {
  const req = e.request;

  // Skip non-GET and cross-origin
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // HTML: network first, fall back to cache
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else: cache first, fall back to network
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      });
    })
  );
});
