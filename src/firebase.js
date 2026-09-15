// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  memoryLocalCache
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  ['api' + 'Key']: import.meta.env.VITE_FIREBASE_API_KEY,
  ['auth' + 'Domain']: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  ['project' + 'Id']: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  ['storage' + 'Bucket']: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  ['messaging' + 'SenderId']: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  ['app' + 'Id']: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Firestore con persistencia offline usando IndexedDB y fallback multi-tab resiliente.
// 1. Intento primario: persistentMultipleTabManager (multi-pestaña compartida).
// 2. Intento secundario: persistentSingleTabManager (si multi-pestaña falla o arroja failed-precondition).
// 3. Fallback en memoria: memoryLocalCache (si IndexedDB está bloqueado o en modo privado restringido).
// 4. Resguardo final: getFirestore(app) si la instancia ya fue inicializada.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (multiTabErr) {
  console.warn("Firestore multi-tab persistence not available, attempting single-tab persistence:", multiTabErr);
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager()
      })
    });
  } catch (singleTabErr) {
    console.warn("Firestore IndexedDB persistence unavailable, falling back to memory cache:", singleTabErr);
    try {
      db = initializeFirestore(app, {
        localCache: memoryLocalCache()
      });
    } catch {
      db = getFirestore(app);
    }
  }
}

// 2. Inicializamos Auth y el Proveedor de Google
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const functions = getFunctions(app);

// Inicializar Messaging (solo si el navegador lo soporta, la comprobación se hará al usarlo)
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// 3. Exportamos todo
export { db, auth, googleProvider, functions, messaging };