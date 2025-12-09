// public/sw.js
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Básico: solo pasa las peticiones, necesario para PWA
  e.respondWith(fetch(e.request));
});