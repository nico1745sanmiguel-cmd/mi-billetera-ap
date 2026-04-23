import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import Navbar from './Components/Layout/Navbar';
import Home from './Components/Dashboard/Home';
import Login from './Components/Login';
import InstallPrompt from './Components/UI/InstallPrompt';
import SkeletonDashboard from './Components/UI/SkeletonDashboard';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useFinancial } from './context/FinancialContext';
import { Home as HomeIcon, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

// --- LAZY IMPORTS ---
const Stats = lazy(() => import('./Components/Dashboard/Stats'));
const NewPurchase = lazy(() => import('./Components/Purchase/NewPurchase'));
const SuperList = lazy(() => import('./Components/Supermarket/SuperList'));
const ServicesManager = lazy(() => import('./Components/Services/ServicesManager'));
const HomeGlass = lazy(() => import('./Components/Dashboard/HomeGlass'));
const HouseholdManager = lazy(() => import('./Components/Household/HouseholdManager'));
const ReconciliationDesk = lazy(() => import('./Components/Reconciliation/ReconciliationDesk'));
const ReceiptScanner = lazy(() => import('./Components/ReceiptScanner/ReceiptScanner'));

const ENABLE_HOUSEHOLD = true;

const LazyLoader = () => (
    <div className="flex justify-center items-center h-40 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default function App() {
    const { 
        user, 
        userData, 
        householdMembers, 
        loadingUser, 
        cards, 
        transactions, 
        superItems, 
        services, 
        addTransaction 
    } = useFinancial();

    const [showReload, setShowReload] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(false);
    const [view, setView] = useState('dashboard');
    const [isGlass, setIsGlass] = useState(() => localStorage.getItem('glass_mode') === 'true');
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (loadingUser) {
            const timer = setTimeout(() => setShowReload(true), 8000);
            return () => clearTimeout(timer);
        }
    }, [loadingUser]);

    useEffect(() => {
        localStorage.setItem('glass_mode', isGlass);
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) {
            metaThemeColor.setAttribute("content", isGlass ? "#0f0c29" : "#ffffff");
        }
    }, [isGlass]);

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

    // --- FILTRADO DE PRIVACIDAD MEMOIZADO (OPTIMIZACIÓN CLAVE) ---
    const visibleCards = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return cards;
        return cards.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [cards, userData, user]);

    const visibleTransactions = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return transactions;
        return transactions.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [transactions, userData, user]);

    const visibleSuperItems = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return superItems;
        return superItems.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [superItems, userData, user]);

    const visibleServices = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return services;
        return services.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [services, userData, user]);

    useEffect(() => {
        if (view !== 'dashboard') {
            window.history.pushState({ page: view }, "", "");
        }
        const handleBackButton = () => setView('dashboard');
        window.addEventListener('popstate', handleBackButton);
        return () => window.removeEventListener('popstate', handleBackButton);
    }, [view]);

    const handleLogout = () => {
        if (window.confirm("¿Cerrar sesión?")) {
            signOut(auth);
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleReload = () => window.location.reload();

    if (loadingUser) {
        if (showReload) return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <p className="mb-4">Conexión lenta...</p>
                <button onClick={handleReload} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Recargar</button>
            </div>
        );
        return <div className={`min-h-screen ${isGlass ? 'bg-night-gradient' : 'bg-[#f3f4f6]'}`}><SkeletonDashboard isGlass={isGlass} /></div>;
    }

    if (!user) return <Login />;


  return (

    <div className="min-h-screen font-sans relative bg-[#f3f4f6]">
      {/* BACKGROUND TRANSITION OVERLAY */}
      <div className={`absolute inset-0 z-0 bg-night-gradient transition-opacity duration-1000 ease-out pointer-events-none ${isGlass ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* MAIN CONTENT WRAPPER */}
      <div className={`relative z-10 min-h-screen transition-colors duration-700 ease-in-out flex flex-col ${isGlass ? 'text-white' : 'text-gray-800'}`}>
        <InstallPrompt />

        <div className="hidden md:block relative">
          <Navbar currentView={view} setView={setView} privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
        </div>

        {/* HEADER MÓVIL */}
        {/* HEADER MÓVIL */}
        <div className={`md:hidden px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-3 transition-colors duration-300 ${isGlass ? 'bg-[#0f0c29]/90 backdrop-blur-md text-white border-b border-white/5' : 'bg-white text-gray-800'}`}>
          <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl transition-all active:scale-95 ${view === 'dashboard' ? (isGlass ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600') : (isGlass ? 'bg-transparent text-white/60' : 'bg-gray-100 text-gray-500')}`}>
            <HomeIcon size={24} />
          </button>

          {/* SELECTOR DE MES */}
          <div className={`flex-1 flex items-center justify-between rounded-xl p-1 max-w-[200px] transition-colors ${isGlass ? 'bg-white/10 border border-white/10 text-white' : 'bg-gray-50 text-gray-800'}`}>
            <button onClick={() => changeMonth(-1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}><ChevronLeft size={16} strokeWidth={2.5} /></button>
            <span className="font-bold text-sm capitalize">{getFormattedDate(currentDate)}</span>
            <button onClick={() => changeMonth(1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}><ChevronRight size={16} strokeWidth={2.5} /></button>
          </div>

          {/* BOTÓN PRIVACIDAD */}
          <button onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 rounded-xl transition-all active:scale-95 ${privacyMode ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
            {privacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
          </button>
        </div>

        <main className="max-w-5xl mx-auto p-4 mt-2 pb-10 w-full flex-grow">

          <Suspense fallback={<LazyLoader />}>

            {view === 'dashboard' && (
              isGlass ? (
                <HomeGlass
                  transactions={visibleTransactions}
                  cards={visibleCards}
                  supermarketItems={visibleSuperItems}
                  services={visibleServices}
                  currentDate={currentDate}
                  user={user}
                  privacyMode={privacyMode}
                  onToggleTheme={() => setIsGlass(false)}
                  setView={setView}
                  onLogout={handleLogout}
                  householdId={userData?.householdId}
                  householdMembers={householdMembers}
                />

              ) : (
                <Home
                  transactions={visibleTransactions}
                  cards={visibleCards}
                  supermarketItems={visibleSuperItems}
                  services={visibleServices}
                  privacyMode={privacyMode}
                  setView={setView}
                  onLogout={handleLogout}
                  currentDate={currentDate}
                  user={user}
                  onToggleTheme={() => setIsGlass(true)}
                  householdId={userData?.householdId}
                  householdMembers={householdMembers}
                />
              )
            )}

            {/* AQUÍ PASAMOS EL PRIVACY MODE AL GESTOR DE SERVICIOS */}
            {view === 'services_manager' && (
              <ServicesManager
                services={visibleServices}
                cards={visibleCards}
                transactions={visibleTransactions}
                currentDate={currentDate}
                privacyMode={privacyMode}
                isGlass={isGlass}
                householdId={userData?.householdId}
              />
            )}

            {/* RECONCILIATION DESK (DETECTIVE DE GASTOS) */}
            {view === 'reconcile' && (
              <ReconciliationDesk
                user={user}
                householdId={userData?.householdId}
                onBack={() => setView('dashboard')}
                isGlass={isGlass}
                cards={visibleCards}
                existingTransactions={visibleTransactions}
              />
            )}

            {/* HOUSEHOLD MANAGER */}
            {view === 'household' && (
              <HouseholdManager
                user={user}
                householdId={userData?.householdId}
                onBack={() => setView('dashboard')}
                isGlass={isGlass}
              />
            )}

            {view === 'stats' && <Stats transactions={visibleTransactions} cards={visibleCards} services={visibleServices} privacyMode={privacyMode} currentDate={currentDate} isGlass={isGlass} />}

            {view === 'purchase' && <NewPurchase cards={visibleCards} onSave={addTransaction} transactions={visibleTransactions} privacyMode={privacyMode} currentDate={currentDate} isGlass={isGlass} householdId={userData?.householdId} />}

            {view === 'super' && <SuperList items={visibleSuperItems} currentDate={currentDate} isGlass={isGlass} householdId={userData?.householdId} setView={setView} />}

            {view === 'scanner' && <ReceiptScanner isGlass={isGlass} items={visibleSuperItems} onBack={() => setView('super')} />}

          </Suspense>

        </main>
      </div>
    </div>
  );
}