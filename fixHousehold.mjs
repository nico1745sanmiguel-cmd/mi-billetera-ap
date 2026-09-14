import fs from 'fs';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY,
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = [];
    usersSnap.forEach(d => users.push({ id: d.id, ...d.data() }));
    console.log("USERS:", users);
    
    const hhSnap = await getDocs(collection(db, 'households'));
    const households = [];
    hhSnap.forEach(d => households.push({ id: d.id, ...d.data() }));
    console.log("HOUSEHOLDS:", JSON.stringify(households, null, 2));
    
    process.exit(0);
}

run().catch(console.error);
