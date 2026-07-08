// sw.js — Mi Billetera
// Estrategia de caché inteligente por tipo de recurso:
//   - HTML:          NetworkFirst  → siempre busca el HTML más nuevo
//   - /assets/**:    CacheFirst    → los chunks tienen hash, nunca cambian
//   - Firebase/APIs: NetworkOnly   → nunca cachear datos dinámicos
//   - Resto estático: StaleWhileRevalidate

const CACHE_VERSION = 'billetera-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const ASSETS_CACHE  = `${CACHE_VERSION}-assets`;

// Archivos verdaderamente estáticos (sin hash en el nombre)
const STATIC_ASSETS = [
  '/manifest.json',
  '/logos/visa.png',
  '/logos/mastercard.png',
  '/logos/amex.png',
];

// ── INSTALACIÓN ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Activar inmediatamente, sin esperar a que el SW viejo muera
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // No bloquear la instalación si falla algún asset opcional
        console.warn('[SW] Algunos assets estáticos no se pudieron cachear:', err);
      });
    })
  );
});

// ── ACTIVACIÓN ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .reduce((acc, name) => {
            if (name !== STATIC_CACHE && name !== ASSETS_CACHE) {
              console.log('[SW] Eliminando caché viejo:', name);
              acc.push(caches.delete(name));
            }
            return acc;
          }, [])
      );
    }).then(() => {
      // Tomar control de todos los tabs abiertos inmediatamente
      return self.clients.claim();
    })
  );
});

// ── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requests que no son http/https
  if (!event.request.url.startsWith('http')) return;

  // 1. NetworkOnly — Firebase, APIs externas, Google Fonts
  //    Nunca cachear: los datos de Firestore los maneja el SDK de Firebase,
  //    y la API del dólar debe ser siempre fresca.
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('bluelytics') ||
    url.hostname.includes('api.')
  ) {
    return; // Dejar que el navegador maneje el request directo
  }

  // 2. CacheFirst — assets con hash (/assets/xxx.abc123.js, /assets/xxx.abc123.css)
  //    Estos NUNCA cambian de contenido una vez generados (Vite los hashea).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // 3. NetworkFirst — index.html y navegación SPA
  //    Siempre buscar el HTML más nuevo. Si no hay red, usar caché como fallback.
  if (
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Sin red: servir el HTML cacheado
          return caches.match(event.request) || caches.match('/');
        })
    );
    return;
  }

  // 4. StaleWhileRevalidate — íconos, manifest, logos y demás estáticos
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(() => cached); // sin red: usar cache

      return cached || fetchPromise;
    })
  );
});

// ── MENSAJE DESDE LA APP ───────────────────────────────────────────────────
// Permite que la app fuerce la activación inmediata del SW nuevo
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});