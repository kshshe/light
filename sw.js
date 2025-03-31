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

// Fetch event - network-first strategy for all requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response - one to return, one to cache
        const responseToCache = response.clone();
        
        // Cache the fetched response
        caches.open(CACHE_NAME)
          .then((cache) => {
            if (response.status === 200) {
              try {
                cache.put(event.request, responseToCache)
              } catch {}
            }
          })
          .catch(() => {});
          
        return response;
      })
      .catch(() => {
        // If network fetch fails, try to return from cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            return cachedResponse || Promise.reject('No cached content available');
          });
      })
  );
}); 