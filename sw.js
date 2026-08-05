const CACHE_NAME = 'finora-cache-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './js/config.js',
  './js/app.js',
  './js/utils/haptics.js',
  './js/db/database.js',
  './js/engine/analytics.js',
  './js/engine/forecasting.js',
  './js/engine/habits.js',
  './js/backup/validator.js',
  './js/backup/exporter.js',
  './js/backup/importer.js',
  './js/core/security.js',
  './js/ui/components/fn-button.js',
  './js/ui/components/fn-card.js',
  './js/ui/components/fn-metric.js',
  './js/ui/components/fn-sheet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque'
          ) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => cachedResponse || Promise.reject());

      if (cachedResponse) {
        return cachedResponse;
      }
      return fetchPromise;
    })
  );
});

