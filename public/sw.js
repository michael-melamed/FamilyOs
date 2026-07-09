const CACHE_NAME = 'familyos-cache-v2';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event — cache core assets
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force immediate activation
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activate event — delete old caches to prevent stale root path
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages immediately
  );
});

// Fetch event — Network First strategy
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then((response) => {
        return response || new Response('Offline');
      });
    })
  );
});
