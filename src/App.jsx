import React, { useState, useEffect } from 'react';
import Navbar from './Components/Layout/Navbar';
import BottomNav from './Components/Layout/BottomNav'; 
import Home from './Components/Dashboard/Home';
import Dashboard from './Components/Dashboard/Dashboard';
import MyCards from './Components/Cards/MyCards';
import NewPurchase from './Components/Purchase/NewPurchase';
import InstallPrompt from './Components/UI/InstallPrompt';
import Login from './Components/Login';
import SkeletonDashboard from './Components/UI/SkeletonDashboard';
import SuperList from './Components/Supermarket/SuperList';
import ServicesManager from './Components/Services/ServicesManager';
import Savings from './Components/Savings/Savings'; // <--- 1. IMPORTAR SAVINGS

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';

// ICONOS
const EyeOpen = () => <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeClosed = () => <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>;

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [view, setView] = useState('dashboard');
  
  // ESTADOS
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [superItems, setSuperItems] = useState([]);
  const [services, setServices] = useState([]);
  const [savingsList, setSavingsList] = useState([]); // <--- 2. NUEVO ESTADO

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setTimeout(() => setLoadingUser(false), 500);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setCards([]); setTransactions([]); setSuperItems([]); setServices([]); setSavingsList([]); return; }
    
    // Listeners existentes...
    const unsubCards = onSnapshot(query(collection(db, 'cards'), where("userId", "==", user.uid)), (snap) => setCards(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), where("userId", "==", user.uid)), (snap) => setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubSuper = onSnapshot(query(collection(db, 'supermarket_items'), where("userId", "==", user.uid)), (snap) => setSuperItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubServices = onSnapshot(query(collection(db, 'services'), where("userId", "==", user.uid)), (snap) => setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    // 3. NUEVO LISTENER AHORROS
    const unsubSavings = onSnapshot(query(collection(db, 'savings_movements'), where("userId", "==", user.uid)), (snap) => {
      setSavingsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubCards(); unsubTrans(); unsubSuper(); unsubServices(); unsubSavings(); };
  }, [user]);

  const addTransaction = async (t) => {
    try {
      if (!user) return;
      const { id, ...dataToSave } = t; 
      await addDoc(collection(db, 'transactions'), { ...dataToSave, userId: user.uid });
      setView('dashboard');
    } catch (error) { console.error(error); alert("Error al guardar."); }
  };

  const handleLogout = () => { signOut(auth); };

  if (loadingUser) return <div className="min-h-screen bg-[#f3f4f6]"><SkeletonDashboard /></div>;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-[#f3f4f6]">
      <InstallPrompt />

      <div className="hidden md:block relative">
        <Navbar currentView={view} setView={setView} privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
        <button onClick={handleLogout} className="absolute top-4 right-4 text-xs text-red-500 hover:underline bg-white px-3 py-1 rounded border border-red-100">Cerrar Sesión ({user.email})</button>
      </div>

      <div className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-40 flex justify-between items-center px-4">
         <button onClick={() => setPrivacyMode(!privacyMode)} className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            {privacyMode ? <EyeClosed /> : <EyeOpen />}
         </button>
         <h1 className="font-bold text-gray-900 text-lg">
            {view === 'dashboard' && 'Mi Billetera'}
            {view === 'purchase' && 'Nueva Compra'}
            {view === 'cards' && 'Mis Tarjetas'}
            {view === 'super' && 'Lista Super'}
            {view === 'stats' && 'Análisis'}
            {view === 'services_manager' && 'Gastos Fijos'}
            {view === 'savings' && 'Ahorros'}
         </h1>
         <button onClick={handleLogout} className="text-red-500 p-2" title="Salir"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
      </div>
      
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4">
        
        {/* 4. PASAR DATOS A HOME */}
        {view === 'dashboard' && (
            <Home 
                transactions={transactions} 
                cards={cards} 
                supermarketItems={superItems} 
                services={services} 
                savingsList={savingsList} // <-- Pasamos ahorros al Home
                privacyMode={privacyMode} 
                setView={setView} 
            />
        )}

        {/* 5. NUEVA RUTA */}
        {view === 'savings' && <Savings savingsList={savingsList} />}

        {view === 'services_manager' && <ServicesManager services={services} cards={cards} transactions={transactions} />}
        {view === 'stats' && <Dashboard transactions={transactions} cards={cards} privacyMode={privacyMode} />}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} privacyMode={privacyMode} />}
        {view === 'cards' && <MyCards cards={cards} privacyMode={privacyMode} />}
        {view === 'super' && <SuperList />}
        
      </main>

      <BottomNav currentView={view} setView={setView} />
    </div>
  );
}