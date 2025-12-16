import React, { useState, useEffect, Suspense, lazy } from 'react'; 
import Navbar from './Components/Layout/Navbar';
import Home from './Components/Dashboard/Home'; 
import Login from './Components/Login';         
import InstallPrompt from './Components/UI/InstallPrompt';
import SkeletonDashboard from './Components/UI/SkeletonDashboard';

// --- LAZY IMPORTS (Optimizados) ---
const Dashboard = lazy(() => import('./Components/Dashboard/Dashboard'));
const MyCards = lazy(() => import('./Components/Cards/MyCards'));
const NewPurchase = lazy(() => import('./Components/Purchase/NewPurchase'));
const SuperList = lazy(() => import('./Components/Supermarket/SuperList'));
const ServicesManager = lazy(() => import('./Components/Services/ServicesManager'));

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showReload, setShowReload] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [view, setView] = useState('dashboard');
  
  // FECHA GLOBAL (La Máquina del Tiempo ⏳)
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

  // --- MANEJO DEL BOTÓN ATRÁS (HISTORIAL) ---
  useEffect(() => {
    if (view !== 'dashboard') {
        window.history.pushState({ page: view }, "", "");
    }
    const handleBackButton = (event) => {
        setView('dashboard');
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [view]);

  // 1. Auth
  useEffect(() => {
    const safetyTimer = setTimeout(() => { if (loadingUser) setShowReload(true); }, 8000);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const hasCache = cards.length > 0 || transactions.length > 0;
      setTimeout(() => setLoadingUser(false), hasCache ? 0 : 500); 
    });
    return () => { unsubscribe(); clearTimeout(safetyTimer); };
  }, []);

  // 2. Firebase Sync
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
    
    return () => { unsubCards(); unsubTrans(); unsubSuper(); unsubServices(); };
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
      if(window.confirm("¿Cerrar sesión?")) { 
          signOut(auth); 
          localStorage.clear(); 
          window.location.reload(); 
      } 
  };
  
  const handleReload = () => window.location.reload();

  const LazyLoader = () => (
    <div className="flex justify-center items-center h-40 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

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

      {/* HEADER MÓVIL */}
      <div className="md:hidden bg-white px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-3">
         <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl transition-all active:scale-95 ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
         </button>
         <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-xl p-1 max-w-[200px]">
             <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
             <span className="font-bold text-gray-800 text-sm capitalize">{getFormattedDate(currentDate)}</span>
             <button onClick={() => changeMonth(1)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
         </div>
         <button onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 rounded-xl transition-all active:scale-95 ${privacyMode ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
            {privacyMode ? (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>) : (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)}
         </button>
      </div>
      
      <main className="max-w-5xl mx-auto p-4 mt-2 pb-10">
        
        <Suspense fallback={<LazyLoader />}>
            
            {view === 'dashboard' && (
                <Home 
                    transactions={transactions} 
                    cards={cards} 
                    supermarketItems={superItems} 
                    services={services} 
                    privacyMode={privacyMode} 
                    setView={setView}
                    onLogout={handleLogout}
                    currentDate={currentDate} // <--- CLAVE PARA QUE EL HOME SE ACTUALICE
                />
            )}
            
            {view === 'services_manager' && <ServicesManager services={services} cards={cards} transactions={transactions} currentDate={currentDate} />}
            
            {view === 'stats' && <Dashboard transactions={transactions} cards={cards} services={services} privacyMode={privacyMode} currentDate={currentDate} />}
            
            {view === 'purchase' && <NewPurchase cards={cards} onSave={addTransaction} transactions={transactions} privacyMode={privacyMode} />}
            {view === 'cards' && <MyCards cards={cards} privacyMode={privacyMode} />}
            
            {/* CORRECCIÓN FINAL: Pasamos los datos correctamente */}
            {view === 'super' && <SuperList items={superItems} currentDate={currentDate} />}
        
        </Suspense>

      </main>
    </div>
  );
}