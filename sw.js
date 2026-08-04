/* ==========================================================================
   E.ON Asist Complet — Revizii Gaz
   Service Worker — offline-first, versioned, auto-updating
   ========================================================================== */

'use strict';

// Bump this on every deploy to invalidate old caches automatically.
const SW_VERSION = 'v3';
const PRECACHE = `revizii-precache-${SW_VERSION}`;
const RUNTIME_CACHE = `revizii-runtime-${SW_VERSION}`;
const CACHE_ALLOWLIST = [PRECACHE, RUNTIME_CACHE];

// Everything required for the app shell to boot fully offline.
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon-152.png',
  './icons/apple-touch-icon-167.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

// ----------------------------------------------------------------------
// INSTALL — precache the app shell, then activate immediately.
// ----------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // addAll is atomic-ish per resource; use allSettled so one missing
      // asset (e.g. an icon not yet generated) doesn't abort the whole install.
      await Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
      self.skipWaiting();
    })()
  );
});

// ----------------------------------------------------------------------
// ACTIVATE — clean up old cache versions, take control of open pages,
// and enable navigation preload for faster first paint on navigations.
// ----------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !CACHE_ALLOWLIST.includes(key))
          .map((key) => caches.delete(key))
      );

      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch (e) { /* unsupported */ }
      }

      await self.clients.claim();
    })()
  );
});

// ----------------------------------------------------------------------
// Allow the page to force an immediate update (skip waiting) via postMessage.
// ----------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ----------------------------------------------------------------------
// Strategy helpers
// ----------------------------------------------------------------------
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    throw err;
  }
}

async function networkFirst(request, cacheName, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || networkFetch;
}

// ----------------------------------------------------------------------
// FETCH — route requests to the right strategy.
// ----------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // don't intercept mutating requests

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigations (HTML page loads) — network-first with navigation preload
  // and an offline fallback page if nothing is available.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, preload.clone());
            return preload;
          }
          return await networkFirst(request, RUNTIME_CACHE, 4000);
        } catch (err) {
          const shellCache = await caches.open(PRECACHE);
          const shell = await shellCache.match('./index.html');
          return shell || (await shellCache.match('./offline.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // App shell static assets — cache-first (versioned, safe to serve stale-never
  // since a new SW version gets a new cache name entirely).
  if (isSameOrigin && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.includes('/icons/')
  )) {
    event.respondWith(
      cacheFirst(request, PRECACHE).catch(async () => {
        const cache = await caches.open(PRECACHE);
        return (await cache.match('./offline.html')) || Response.error();
      })
    );
    return;
  }

  // Everything else same-origin — stale-while-revalidate for a good balance
  // of freshness and speed.
  if (isSameOrigin) {
    event.respondWith(
      staleWhileRevalidate(request, RUNTIME_CACHE).then(
        (res) => res || caches.match('./offline.html')
      )
    );
    return;
  }

  // Cross-origin (e.g. fonts/CDN fallbacks) — network-first, fall back to cache.
  event.respondWith(
    networkFirst(request, RUNTIME_CACHE, 4000).catch(() => caches.match(request))
  );
});

// ----------------------------------------------------------------------
// BACKGROUND SYNC — placeholder hook for future server sync. Currently the
// app is fully local (localStorage), but this keeps the door open for a
// future backend without requiring another full rewrite, and satisfies
// offline-write durability where supported by the browser.
// ----------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'revizii-sync') {
    event.waitUntil(
      (async () => {
        // No remote backend today — this resolves immediately. Reserved
        // for future use (e.g. syncing backups to a cloud endpoint).
        return Promise.resolve();
      })()
    );
  }
});
