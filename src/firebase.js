// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- PEGA AQUÍ TUS CREDENCIALES DE FIREBASE ---
// (Copia el objeto "firebaseConfig" que te muestra la web)
const firebaseConfig = {
  apiKey: "AIzaSyAFzHdpU0KAZIXAnbILOK3b5RUb_VA8-ls",
  authDomain: "billetera-app-b1e69.firebaseapp.com",
  projectId: "billetera-app-b1e69",
  storageBucket: "billetera-app-b1e69.firebasestorage.app",
  messagingSenderId: "914092911326",
  appId: "1:914092911326:web:e72fc362c389a1cb94f04f"
};
// ---------------------------------------------

// Inicializamos la conexión
const app = initializeApp(firebaseConfig);
// Exportamos la base de datos para usarla en la App
export const db = getFirestore(app);