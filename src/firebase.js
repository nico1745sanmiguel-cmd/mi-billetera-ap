// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// 1. Importamos las herramientas de Auth
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAFzHdpU0KAZIXAnbILOK3b5RUb_VA8-ls",
  authDomain: "billetera-app-b1e69.firebaseapp.com",
  projectId: "billetera-app-b1e69",
  storageBucket: "billetera-app-b1e69.firebasestorage.app",
  messagingSenderId: "914092911326",
  appId: "1:914092911326:web:e72fc362c389a1cb94f04f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Inicializamos Auth y el Proveedor de Google
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 3. Exportamos todo
export { db, auth, googleProvider };