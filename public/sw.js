const CACHE_NAME = 'billetera-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logos/visa.png',
  '/logos/mastercard.png',
  '/logos/amex.png'
];

// 1. INSTALACIÓN: Guardamos archivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN: Limpiamos cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. FETCH: Estrategia Stale-While-Revalidate
// (Muestra lo guardado rápido, pero actualiza en el fondo)
self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones http/https (ignoramos chrome-extension, etc)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si está en caché, lo devolvemos YA
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Y actualizamos el caché para la próxima
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});