import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';
// Puedes dejar el Importador comentado por si lo usas de nuevo en el futuro
// import Importer from './Components/Importer'; 

import { db } from './firebase';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // --- 1. Cargar TARJETAS desde Firebase ---
  useEffect(() => {
    // Escuchamos la colección "cards"
    const unsubscribe = onSnapshot(collection(db, 'cards'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCards(docs);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Cargar COMPRAS desde Firebase ---
  useEffect(() => {
    // Escuchamos la colección "transactions" ordenada por fecha
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  // Función para guardar nueva compra (usada por NewPurchase)
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
    <div className="min-h-screen font-sans text-gray-800 pb-10 bg-[#f3f4f6]">
      <Navbar currentView={view} setView={setView} />
      
      <main className="max-w-5xl mx-auto p-4 mt-4">
        {/* Vista Resumen */}
        {view === 'dashboard' && <Dashboard transactions={transactions} cards={cards} />}
        
        {/* Vista Nueva Compra */}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} />}
        
        {/* Vista Mis Tarjetas (Ya no necesita onAddCard porque lo maneja internamente) */}
        {view === 'cards' && <MyCards cards={cards} />}

        {/* Importador (Descomenta si necesitas cargar más datos masivos) */}
        {/* <Importer cards={cards} /> */}
      </main>
    </div>
  );
}