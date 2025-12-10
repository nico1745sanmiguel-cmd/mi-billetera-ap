import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import BottomNav from './Components/Layout/BottomNav'; 
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';
import InstallPrompt from './Components/UI/InstallPrompt';
import Login from './Components/Login';
import Importer from './Components/Importer'; // <--- AQUÍ ESTÁ EL IMPORTADOR

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [view, setView] = useState('dashboard');
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // 1. ESCUCHAR LOGIN
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. CARGAR DATOS (SOLO LOS DEL USUARIO)
  useEffect(() => {
    if (!user) {
      setCards([]);
      setTransactions([]);
      return; 
    }
    
    // A. TARJETAS
    const qCards = query(collection(db, 'cards'), where("userId", "==", user.uid));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // B. COMPRAS (Sin orderBy para evitar pantalla blanca por índices)
    const qTrans = query(
      collection(db, 'transactions'), 
      where("userId", "==", user.uid)
    );
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubCards(); unsubTrans(); };
  }, [user]);

  // 3. GUARDAR COMPRA
  const addTransaction = async (t) => {
    try {
      if (!user) return;
      const { id, ...dataToSave } = t; 
      
      await addDoc(collection(db, 'transactions'), {
        ...dataToSave,
        userId: user.uid 
      });
      
      setView('dashboard');
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar la compra.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- RENDERIZADO ---

  if (loadingUser) return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">Cargando...</div>;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-[#f3f4f6]">
      <InstallPrompt />

      <div className="hidden md:block relative">
        <Navbar currentView={view} setView={setView} />
        <button onClick={handleLogout} className="absolute top-4 right-4 text-xs text-red-500 hover:underline bg-white px-3 py-1 rounded border border-red-100">
            Cerrar Sesión ({user.email})
        </button>
      </div>

      <div className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-40 flex justify-between items-center px-6">
         <div className="w-6"></div>
         <h1 className="font-bold text-gray-900 text-lg">
            {view === 'dashboard' && 'Resumen'}
            {view === 'purchase' && 'Nueva Compra'}
            {view === 'cards' && 'Tarjetas'}
         </h1>
         <button onClick={handleLogout} className="text-red-500" title="Salir">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
         </button>
      </div>
      
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4">
        {view === 'dashboard' && <Dashboard transactions={transactions} cards={cards} />}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} />}
        {view === 'cards' && <MyCards cards={cards} />}

        {/* --- AQUÍ ESTÁ EL IMPORTADOR --- */}
        <Importer cards={cards} />
      </main>

      <BottomNav currentView={view} setView={setView} />
    </div>
  );
}