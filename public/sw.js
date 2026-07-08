const CACHE_NAME = 'familyos-cache-v1';

// Install event — cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      '/',
      '/dashboard',
      '/manifest.json',
      '/icon-192.png',
      '/icon-512.png'
    ]))
  );
});

// Fetch event — serve from cache, fallback to network
self.addEventListener('fetch', (e) => {
  // We only want to cache GET requests for now
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    }).catch(() => {
      // Offline fallback could go here
      return new Response('Offline');
    })
  );
});
