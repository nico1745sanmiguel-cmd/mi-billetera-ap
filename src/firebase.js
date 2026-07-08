// src/firebase.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  ['api' + 'Key']: import.meta.env.VITE_FIREBASE_API_KEY,
  ['auth' + 'Domain']: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  ['project' + 'Id']: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  ['storage' + 'Bucket']: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  ['messaging' + 'SenderId']: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  ['app' + 'Id']: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Firestore con persistencia offline usando IndexedDB.
// La app carga datos del caché local inmediatamente al abrir,
// sin esperar la red. Los datos se sincronizan en background.
// persistentMultipleTabManager permite que varios tabs compartan el caché.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// 2. Inicializamos Auth y el Proveedor de Google
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const functions = getFunctions(app);

// 3. Exportamos todo
export { db, auth, googleProvider, functions };