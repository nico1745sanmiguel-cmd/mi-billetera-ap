import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';

// IMPORTANTE: Importamos la base de datos y las funciones de Firebase
import { db } from './firebase';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [view, setView] = useState('dashboard');

  // Las tarjetas las dejamos fijas por ahora (para no complicar más hoy)
  const [cards, setCards] = useState([
    { id: 1, name: 'Visa Santander', bank: 'Santander', limit: 4500000, closeDay: 24, dueDay: 5, color: '#e63946' },
    { id: 2, name: 'Mastercard BBVA', bank: 'BBVA', limit: 3200000, closeDay: 18, dueDay: 2, color: '#1d3557' },
    { id: 3, name: 'Amex Galicia', bank: 'Galicia', limit: 8500000, closeDay: 15, dueDay: 28, color: '#e9c46a' },
  ]);

  // Aquí guardaremos las compras que vienen de la nube
  const [transactions, setTransactions] = useState([]);

  // --- EFECTO MÁGICO: Escuchar la base de datos en tiempo real ---
  useEffect(() => {
    // 1. Definimos qué queremos traer (la colección 'transactions' ordenada por fecha)
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));

    // 2. Nos "suscribimos". Cada vez que algo cambie en la nube, esto se ejecuta solo.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id, // Firebase nos da un ID único raro (ej: "8s7d6f8sd7")
        ...doc.data()
      }));
      setTransactions(docs);
    });

    // Limpieza al salir
    return () => unsubscribe();
  }, []);

  // --- FUNCIÓN PARA GUARDAR EN LA NUBE ---
  const addTransaction = async (t) => {
    try {
      // Preparamos los datos (sacamos el ID temporal porque Firebase pone uno propio)
      const { id, ...dataToSave } = t;
      
      // Enviamos a Firebase
      await addDoc(collection(db, 'transactions'), dataToSave);
      
      // Volvemos al inicio
      setView('dashboard');
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar. Revisa la consola.");
    }
  };

  const addCard = (c) => {
    setCards([...cards, c]);
  };

  return (
    <div className="min-h-screen font-sans text-gray-800 pb-10 bg-[#f3f4f6]">
      <Navbar currentView={view} setView={setView} />
      
      <main className="max-w-5xl mx-auto p-4 mt-4">
        {/* Pasamos los datos "transactions" que ahora vienen de Firebase */}
        {view === 'dashboard' && <Dashboard transactions={transactions} cards={cards} />}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} />}
        {view === 'cards' && <MyCards cards={cards} onAddCard={addCard} />}
      </main>
    </div>
  );
}