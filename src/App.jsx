import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import BottomNav from './Components/Layout/BottomNav'; // Importamos la nueva barra
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';
// import Importer from './Components/Importer'; 

import { db } from './firebase';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // --- 1. Cargar TARJETAS ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cards'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCards(docs);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Cargar COMPRAS ---
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
      
      {/* 1. BARRA SUPERIOR (Solo visible en Desktop 'md:block', oculta en móvil 'hidden') */}
      <div className="hidden md:block">
        <Navbar currentView={view} setView={setView} />
      </div>

      {/* 2. HEADER MÓVIL SIMPLE (Solo título, sin botones) */}
      <div className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-40 flex justify-center items-center">
         <h1 className="font-bold text-gray-900 text-lg">
            {view === 'dashboard' && 'Resumen Financiero'}
            {view === 'purchase' && 'Nueva Compra'}
            {view === 'cards' && 'Mis Tarjetas'}
         </h1>
      </div>
      
      {/* 3. CONTENEDOR PRINCIPAL 
          - pb-24: Padding bottom grande en móvil para que la barra no tape nada
          - md:pb-10: Padding normal en desktop
      */}
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4">
        
        {view === 'dashboard' && <Dashboard transactions={transactions} cards={cards} />}
        
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} />}
        
        {view === 'cards' && <MyCards cards={cards} />}

        {/* <Importer cards={cards} /> */}
      </main>

      {/* 4. BARRA INFERIOR (Solo visible en móvil 'md:hidden') */}
      <BottomNav currentView={view} setView={setView} />
      
    </div>
  );
}