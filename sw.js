const CACHE_NAME = 'gg-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const sameOrigin = new URL(request.url).origin === self.location.origin;
  const freshRequest = !sameOrigin
    ? request
    : request.mode === 'navigate'
      ? new Request(request.url, { cache: 'no-cache' })
      : new Request(request, { cache: 'no-cache' });

  event.respondWith(
    fetch(freshRequest)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
