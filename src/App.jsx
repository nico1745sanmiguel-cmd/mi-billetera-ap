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
import Savings from './Components/Savings/Savings';

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showReload, setShowReload] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [view, setView] = useState('dashboard');
  
  // --- NUEVO ESTADO GLOBAL DE FECHA ---
  const [currentDate, setCurrentDate] = useState(new Date());

  // Función para formatear fecha "Diciembre 2025" (Sin "de")
  const getFormattedDate = (date) => {
      const options = { month: 'long', year: 'numeric' };
      // "diciembre de 2025" -> "diciembre 2025"
      let text = date.toLocaleDateString('es-AR', options).replace(' de ', ' ');
      // Capitalizar primera letra: "Diciembre 2025"
      return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const changeMonth = (offset) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + offset);
      setCurrentDate(newDate);
  };

  // --- OPTIMIZACIÓN: INICIALIZACIÓN LAZY ---
  const [cards, setCards] = useState(() => JSON.parse(localStorage.getItem('cache_cards')) || []);
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('cache_transactions')) || []);
  const [superItems, setSuperItems] = useState(() => JSON.parse(localStorage.getItem('cache_superItems')) || []);
  const [services, setServices] = useState(() => JSON.parse(localStorage.getItem('cache_services')) || []);
  const [savingsList, setSavingsList] = useState(() => JSON.parse(localStorage.getItem('cache_savings')) || []);

  useEffect(() => {
    const safetyTimer = setTimeout(() => { if (loadingUser) setShowReload(true); }, 8000);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const hasCache = cards.length > 0 || transactions.length > 0;
      setTimeout(() => setLoadingUser(false), hasCache ? 0 : 500); 
    });
    return () => { unsubscribe(); clearTimeout(safetyTimer); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const syncData = (queryRef, setState, cacheKey) => {
        return onSnapshot(queryRef, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setState(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
        }, (error) => console.log("Offline:", error));
    };

    const unsubCards = syncData(query(collection(db, 'cards'), where("userId", "==", user.uid)), setCards, 'cache_cards');
    const unsubTrans = syncData(query(collection(db, 'transactions'), where("userId", "==", user.uid)), setTransactions, 'cache_transactions');
    const unsubSuper = syncData(query(collection(db, 'supermarket_items'), where("userId", "==", user.uid)), setSuperItems, 'cache_superItems');
    const unsubServices = syncData(query(collection(db, 'services'), where("userId", "==", user.uid)), setServices, 'cache_services');
    const unsubSavings = syncData(query(collection(db, 'savings_movements'), where("userId", "==", user.uid)), setSavingsList, 'cache_savings');

    return () => { unsubCards(); unsubTrans(); unsubSuper(); unsubServices(); unsubSavings(); };
  }, [user]);

  const addTransaction = async (t) => {
    try {
      if (!user) return;
      const { id, ...dataToSave } = t; 
      await addDoc(collection(db, 'transactions'), { ...dataToSave, userId: user.uid });
      setView('dashboard');
    } catch (error) { alert("Error al guardar."); }
  };

  const handleLogout = () => { 
      if(window.confirm("¿Cerrar sesión?")) { signOut(auth); localStorage.clear(); window.location.reload(); }
  };
  const handleReload = () => window.location.reload();

  if (loadingUser) {
      if (showReload) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><p className="mb-4">Conexión lenta...</p><button onClick={handleReload} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Recargar</button></div>;
      return <div className="min-h-screen bg-[#f3f4f6]"><SkeletonDashboard /></div>;
  }
  if (!user) return <Login />;

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-[#f3f4f6]">
      <InstallPrompt />

      {/* HEADER DESKTOP (Sin cambios mayores, solo ocultamos logout si quieres) */}
      <div className="hidden md:block relative">
        <Navbar currentView={view} setView={setView} privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
      </div>

      {/* --- HEADER MÓVIL RENOVADO --- */}
      <div className="md:hidden bg-white p-3 shadow-sm sticky top-0 z-40 px-4">
         <div className="flex items-center justify-between">
             
             {/* FECHA CENTRADA Y NAVEGABLE */}
             <div className="flex items-center justify-between w-full bg-gray-50 rounded-xl p-1">
                 <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 
                 <span className="font-bold text-gray-800 text-lg capitalize">
                    {getFormattedDate(currentDate)}
                 </span>
                 
                 <button onClick={() => changeMonth(1)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                 </button>
             </div>

             {/* OCULTAMOS LOS BOTONES VIEJOS TEMPORALMENTE
             <button onClick={() => setPrivacyMode(!privacyMode)} ... > ... </button>
             <button onClick={handleLogout} ... > ... </button>
             */}
         </div>
      </div>
      
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4">
        
        {view === 'dashboard' && <Home transactions={transactions} cards={cards} supermarketItems={superItems} services={services} savingsList={savingsList} privacyMode={privacyMode} setView={setView} />}
        {view === 'savings' && <Savings savingsList={savingsList} />}
        
        {/* LE PASAMOS LA FECHA AL SERVICES MANAGER */}
        {view === 'services_manager' && (
            <ServicesManager 
                services={services} 
                cards={cards} 
                transactions={transactions}
                currentDate={currentDate} // <--- DATO CLAVE
            />
        )}
        
        {view === 'stats' && <Dashboard transactions={transactions} cards={cards} privacyMode={privacyMode} />}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} privacyMode={privacyMode} />}
        {view === 'cards' && <MyCards cards={cards} privacyMode={privacyMode} />}
        {view === 'super' && <SuperList />}
      </main>

      <BottomNav currentView={view} setView={setView} />
    </div>
  );
}