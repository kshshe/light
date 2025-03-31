// Cache name with version to allow for future updates
const CACHE_NAME = 'light-app-cache-v1';

// Install event - caches all js, css, html files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache core app files
        return cache.addAll([
          '/',
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches if needed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => {
          return name !== CACHE_NAME;
        }).map((name) => {
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - dynamically cache files on first access
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isAssetFile = 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.html') ||
    url.pathname === '/';

  if (isAssetFile) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached response if available
          if (cachedResponse) {
            return cachedResponse;
          }

          // Otherwise fetch from network and cache
          return fetch(event.request)
            .then((response) => {
              // Check if response is valid
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response - one to return, one to cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseToCache))
                .catch(() => {});

              return response;
            });
        })
    );
  } else {
    // For non-asset files, try network first, then fall back to cache
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
}); 