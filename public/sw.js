const CACHE_NAME = 'familyos-cache-v3';

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

// Activate event — aggressively delete all old caches
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

// Fetch event — Network First strategy, but avoid caching HTML/navigation entirely
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  // Skip API requests and Chrome extensions
  if (e.request.url.includes('/api/') || e.request.url.startsWith('chrome-extension')) return;

  // For HTML navigation requests, force network and bypass service worker cache
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request).then((response) => {
          return response || new Response('<html><body><h2>אתה במצב לא מקוון. אנא בדוק את חיבור האינטרנט שלך.</h2></body></html>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  // Default Network-First for other assets
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
