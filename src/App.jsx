import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import BottomNav from './Components/Layout/BottomNav'; 
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';
// 1. IMPORTAMOS EL CARTEL DE INSTALACIÓN
import InstallPrompt from './Components/UI/InstallPrompt';

import { db } from './firebase';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Cargar TARJETAS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cards'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCards(docs);
    });
    return () => unsubscribe();
  }, []);

  // Cargar COMPRAS
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  const addTransaction = async (t) => {
    try {
      const { id, ...dataToSave } = t; 
      await addDoc(collection(db, 'transactions'), dataToSave);
      setView('dashboard');
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar la compra.");
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-[#f3f4f6]">
      
      {/* 2. AQUÍ VA EL COMPONENTE (Invisible si ya está instalada) */}
      <InstallPrompt />

      {/* BARRA SUPERIOR (Solo Desktop) */}
      <div className="hidden md:block">
        <Navbar currentView={view} setView={setView} />
      </div>

      {/* HEADER MÓVIL (Solo Título) */}
      <div className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-40 flex justify-center items-center">
         <h1 className="font-bold text-gray-900 text-lg">
            {view === 'dashboard' && 'Resumen Financiero'}
            {view === 'purchase' && 'Nueva Compra'}
            {view === 'cards' && 'Mis Tarjetas'}
         </h1>
      </div>
      
      {/* CONTENEDOR PRINCIPAL */}
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4">
        {view === 'dashboard' && <Dashboard transactions={transactions} cards={cards} />}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} />}
        {view === 'cards' && <MyCards cards={cards} />}
      </main>

      {/* BARRA INFERIOR (Solo Móvil) */}
      <BottomNav currentView={view} setView={setView} />
      
    </div>
  );
}