import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import BottomNav from './Components/Layout/BottomNav'; 
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';
import InstallPrompt from './Components/UI/InstallPrompt';
import Login from './Components/Login'; // Importamos el Login

// Importamos AUTH y el escuchador de cambios
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null); // Estado del Usuario
  const [loadingUser, setLoadingUser] = useState(true); // Para no mostrar nada mientras carga

  const [view, setView] = useState('dashboard');
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // --- 1. ESCUCHAR SI HAY USUARIO LOGUEADO ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // Cargar datos (Solo si hay usuario - por ahora carga todo global)
  useEffect(() => {
    if (!user) return; // No cargar datos si no hay login
    
    // Tarjetas
    const unsubCards = onSnapshot(collection(db, 'cards'), (snapshot) => {
      setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Compras
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubCards(); unsubTrans(); };
  }, [user]); // Se ejecuta cuando cambia el usuario

  const addTransaction = async (t) => {
    try {
      const { id, ...dataToSave } = t; 
      await addDoc(collection(db, 'transactions'), dataToSave);
      setView('dashboard');
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- VISTAS CONDICIONALES ---

  // 1. Cargando...
  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">Cargando billetera...</div>;
  }

  // 2. Si NO hay usuario -> Mostrar Login
  if (!user) {
    return <Login />;
  }

  // 3. Si HAY usuario -> Mostrar App
  return (
    <div className="min-h-screen font-sans text-gray-800 bg-[#f3f4f6]">
      <InstallPrompt />

      {/* HEADER DESKTOP (Con botón de salir) */}
      <div className="hidden md:block relative">
        <Navbar currentView={view} setView={setView} />
        <button onClick={handleLogout} className="absolute top-4 right-4 text-xs text-red-500 hover:underline bg-white px-3 py-1 rounded border border-red-100">
            Cerrar Sesión ({user.email})
        </button>
      </div>

      {/* HEADER MÓVIL (Con botón de salir pequeño) */}
      <div className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-40 flex justify-between items-center px-6">
         <div className="w-6"></div> {/* Espaciador */}
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
      </main>

      <BottomNav currentView={view} setView={setView} />
    </div>
  );
}