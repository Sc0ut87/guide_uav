const CACHE_NAME = 'bpla-guide-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Встановлення: кешуємо основні файли
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.log('Cache install failed:', err);
    })
  );
  self.skipWaiting();
});

// Активація: чистимо старі кеші
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Перехоплення запитів: спочатку кеш, потім мережа
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Якщо є в кеші — повертаємо
      if (cachedResponse) {
        // Фоново оновлюємо з мережі (для оновлень)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Якщо немає в кеші — йдемо в мережу і кешуємо
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Якщо мережа недоступна і це запит зображення — можна повернути заглушку
        if (event.request.destination === 'image') {
          return new Response('', { status: 204 });
        }
      });
    })
  );
});