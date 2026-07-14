/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAFzHdpU0KAZIXAnbILOK3b5RUb_VA8-ls",
  authDomain: "billetera-app-b1e69.firebaseapp.com",
  projectId: "billetera-app-b1e69",
  storageBucket: "billetera-app-b1e69.firebasestorage.app",
  messagingSenderId: "914092911326",
  appId: "1:914092911326:web:e72fc362c389a1cb94f04f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg', // Idealmente deberías tener un ícono de la app
    badge: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
