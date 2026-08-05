const CACHE_NAME = 'finora-v1.0.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './css/animations.css',
  './css/utilities.css',
  './js/app.js',
  './js/config.js',
  './js/core/security.js',
  './js/db/database.js',
  './js/engine/analytics.js',
  './js/engine/habits.js',
  './js/engine/forecasting.js',
  './js/backup/exporter.js',
  './js/backup/importer.js',
  './js/backup/validator.js',
  './js/ui/components/fn-card.js',
  './js/ui/components/fn-button.js',
  './js/ui/components/fn-sheet.js',
  './js/ui/components/fn-metric.js',
  './js/utils/haptics.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
