// sw.js
const CACHE_NAME = "revizio-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/css/base.css",
  "/css/theme.css",
  "/css/layout.css",
  "/css/components.css",
  "/css/typography.css",
  "/js/app.js",
  "/js/router.js",
  "/modules/pwa-manager.js",
  "/modules/theme-manager.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).catch(() => caches.match("/index.html"));
    })
  );
});
