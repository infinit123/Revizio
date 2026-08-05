const CACHE_NAME = 'finora-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './css/animations.css',
  './css/utilities.css',
  './js/app.js',
  './js/config.js',
  './js/core/router.js',
  './js/core/store.js',
  './js/core/security.js',
  './js/core/pwa.js',
  './js/db/database.js',
  './js/db/schemas.js',
  './js/db/migrations.js',
  './js/engine/worker.js',
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
  './js/utils/formatters.js',
  './js/utils/haptics.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
