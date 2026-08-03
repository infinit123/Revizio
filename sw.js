const CACHE_NAME = 'eon-revizii-v2';

// Fișierele care vor fi salvate pentru acces 100% offline
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
];

// 1. Instalare: Salvează fișierele în cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Salvare resurse în cache...');
      return cache.addAll(ASSETS);
    })
  );
  // Forțează activarea imediată a noului Service Worker
  self.skipWaiting();
});

// 2. Activare: Șterge cache-ul vechi dacă s-a schimbat versiunea (v1 -> v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Ștergere cache vechi:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptare cereri: Servește din cache dacă nu există conexiune la internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Returnează varianta din cache dacă există
      if (cachedResponse) {
        return cachedResponse;
      }
      // Altfel încearcă să ia fișierul de pe rețea
      return fetch(event.request).catch(() => {
        // Dacă ești offline și cererea este pentru o pagină, trimite index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
