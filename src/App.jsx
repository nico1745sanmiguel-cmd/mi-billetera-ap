import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti'; // <--- IMPORTAMOS LA FIESTA
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
  
  // FECHA GLOBAL
  const [currentDate, setCurrentDate] = useState(new Date());

  const getFormattedDate = (date) => {
      const options = { month: 'long', year: 'numeric' };
      let text = date.toLocaleDateString('es-AR', options).replace(' de ', ' ');
      return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const changeMonth = (offset) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + offset);
      setCurrentDate(newDate);
  };

  // DATOS
  const [cards, setCards] = useState(() => JSON.parse(localStorage.getItem('cache_cards')) || []);
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('cache_transactions')) || []);
  const [superItems, setSuperItems] = useState(() => JSON.parse(localStorage.getItem('cache_superItems')) || []);
  const [services, setServices] = useState(() => JSON.parse(localStorage.getItem('cache_services')) || []);
  const [savingsList, setSavingsList] = useState(() => JSON.parse(localStorage.getItem('cache_savings')) || []);

  // --- LÓGICA DE NIVELES (GAMIFICACIÓN) ---
  const [userLevel, setUserLevel] = useState(1);
  const prevLevelRef = useRef(1); // Para recordar el nivel anterior y detectar cambios

  useEffect(() => {
      let level = 1;
      
      // REGLA NIVEL 2: Tener al menos 1 Servicio cargado
      if (services.length > 0) level = 2;
      
      // REGLA NIVEL 3: Tener al menos 3 items en el Super (Y haber pasado el anterior)
      if (level >= 2 && superItems.length >= 3) level = 3;
      
      // REGLA NIVEL 4: Tener al menos 1 Tarjeta cargada (Y haber pasado el anterior)
      // (Nota: Si no usa tarjetas, después implementaremos un botón "Saltar" que agregue una tarjeta dummy o flag)
      if (level >= 3 && cards.length > 0) level = 4;

      // DETECTAR "LEVEL UP" Y LANZAR CONFETTI 🎉
      if (level > prevLevelRef.current) {
          triggerConfetti();
          // Opcional: Sonido de éxito aquí
      }
      
      prevLevelRef.current = level;
      setUserLevel(level);

  }, [services, superItems, cards]);

  const triggerConfetti = () => {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Tira papeles desde dos puntos del centro
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
  };


  // ... (RESTO DE USE EFFECTS DE AUTH Y FIRESTORE IGUAL QUE ANTES) ...
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

  const handleLogout = () => { if(window.confirm("¿Cerrar sesión?")) { signOut(auth); localStorage.clear(); window.location.reload(); } };
  const handleReload = () => window.location.reload();

  if (loadingUser) {
      if (showReload) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><p className="mb-4">Conexión lenta...</p><button onClick={handleReload} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Recargar</button></div>;
      return <div className="min-h-screen bg-[#f3f4f6]"><SkeletonDashboard /></div>;
  }
  if (!user) return <Login />;

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-[#f3f4f6]">
      <InstallPrompt />

      <div className="hidden md:block relative">
        <Navbar currentView={view} setView={setView} privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
      </div>

      <div className="md:hidden bg-white p-3 shadow-sm sticky top-0 z-40 px-4">
         <div className="flex items-center justify-center">
             <div className="flex items-center justify-between w-full bg-gray-50 rounded-xl p-1">
                 <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 <span className="font-bold text-gray-800 text-lg capitalize">{getFormattedDate(currentDate)}</span>
                 <button onClick={() => changeMonth(1)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                 </button>
             </div>
         </div>
      </div>
      
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4">
        
        {/* PASAMOS userLevel AL HOME */}
        {view === 'dashboard' && (
            <Home 
                transactions={transactions} cards={cards} supermarketItems={superItems} services={services} savingsList={savingsList} 
                privacyMode={privacyMode} setView={setView} 
                userLevel={userLevel} // <--- DATO VITAL PARA EL CANDADO
            />
        )}
        
        {view === 'savings' && <Savings savingsList={savingsList} />}
        {view === 'services_manager' && <ServicesManager services={services} cards={cards} transactions={transactions} currentDate={currentDate} />}
        {view === 'stats' && <Dashboard transactions={transactions} cards={cards} privacyMode={privacyMode} currentDate={currentDate} />}
        {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} privacyMode={privacyMode} />}
        {view === 'cards' && <MyCards cards={cards} privacyMode={privacyMode} />}
        {view === 'super' && <SuperList />}
        
      </main>

      {/* PASAMOS userLevel AL BOTTOM NAV */}
      <BottomNav currentView={view} setView={setView} userLevel={userLevel} />
    </div>
  );
}