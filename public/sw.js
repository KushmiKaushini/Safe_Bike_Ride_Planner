/**
 * Safe Bike Ride Planner — Service Worker
 * FIX-18: Enables PWA offline capability and app shell caching.
 *
 * Strategy:
 *   - App shell (HTML, CSS, JS): Cache-first → served instantly from cache
 *   - API calls (/api/*): Network-first → graceful offline error if unavailable
 *
 * Cache versioning: update CACHE_NAME to bust the cache on each deployment.
 */

const CACHE_NAME = 'bike-planner-v1';
const SHELL_ASSETS = [
  '/',
  '/css/style.css',
  '/js/auth.js',
  '/js/app.js',
  '/manifest.json',
];

// ---------------------------------------------------------------------------
// Install — pre-cache the app shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(SHELL_ASSETS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — remove stale caches from previous versions
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch — network-first for API, cache-first for shell
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API requests — always try to get fresh data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ success: false, error: 'You are offline. Please check your connection.' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );
    return;
  }

  // Cache-first for static shell assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      // Not in cache — fetch from network and cache the response
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
