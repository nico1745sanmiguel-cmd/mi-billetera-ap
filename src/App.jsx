import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import Navbar from './Components/Layout/Navbar';
import Home from './Components/Dashboard/Home';
import Login from './Components/Login';
import InstallPrompt from './Components/UI/InstallPrompt';
import SkeletonDashboard from './Components/UI/SkeletonDashboard';
import Toast from './Components/UI/Toast';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useFinancial } from './context/FinancialContext';
import { useUI } from './context/UIContext';
import { Home as HomeIcon, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { ENABLE_HOUSEHOLD, SLOW_CONNECTION_TIMEOUT_MS } from './config/constants';

// --- LAZY IMPORTS ---
const Stats = lazy(() => import('./Components/Dashboard/Stats'));
const NewPurchase = lazy(() => import('./Components/Purchase/NewPurchase'));
const SuperList = lazy(() => import('./Components/Supermarket/SuperList'));
const FreshShop = lazy(() => import('./Components/Supermarket/FreshShop'));
const ServicesManager = lazy(() => import('./Components/Services/ServicesManager'));
const HouseholdManager = lazy(() => import('./Components/Household/HouseholdManager'));
const ReconciliationDesk = lazy(() => import('./Components/Reconciliation/ReconciliationDesk'));
const SharedExpensesDashboard = lazy(() => import('./Components/Shared/SharedExpensesDashboard'));
const ReceiptScanner = lazy(() => import('./Components/ReceiptScanner/ReceiptScanner'));
const SavingsDashboard = lazy(() => import('./Components/Savings/SavingsDashboard'));


const LazyLoader = () => (
    <div className="flex justify-center items-center h-40 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default function App() {
    // ─── DATOS FINANCIEROS ───────────────────────────────────────────────────
    const {
        user,
        userData,
        householdMembers,
        loadingUser,
        cards,
        transactions,
        superItems,
        services,
        freshItems,
        plannerCategories,
        notifications,
        addTransaction
    } = useFinancial();

    // ─── ESTADO DE UI (viene de UIContext) ───────────────────────────────────
    const {
        view,
        setView,
        privacyMode,
        setPrivacyMode,
        isGlass,
        setIsGlass,
        currentDate,
        changeMonth,
        toast,
        hideToast,
    } = useUI();

    // ─── ESTADO LOCAL (solo afecta a App.jsx, no necesita contexto) ─────────
    const [showReload, setShowReload] = useState(false);

    // Mostrar botón de recarga si tarda demasiado
    useEffect(() => {
        if (loadingUser) {
            const timer = setTimeout(() => setShowReload(true), SLOW_CONNECTION_TIMEOUT_MS);
            return () => clearTimeout(timer);
        }
    }, [loadingUser]);

    // Formateador de fecha para el header móvil
    const getFormattedDate = (date) => {
        const options = { month: 'long', year: 'numeric' };
        let text = date.toLocaleDateString('es-AR', options).replace(' de ', ' ');
        return text.charAt(0).toUpperCase() + text.slice(1);
    };

    // ─── FILTRADO POR HOUSEHOLD ──────────────────────────────────────────────
    // Solo muestra los ítems del usuario o los compartidos con el hogar
    const filterByHousehold = (items) => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return items;
        return items.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    };

    const visibleCards        = useMemo(() => filterByHousehold(cards),        [cards, userData, user]);
    const visibleTransactions = useMemo(() => filterByHousehold(transactions), [transactions, userData, user]);
    const visibleSuperItems   = useMemo(() => filterByHousehold(superItems),   [superItems, userData, user]);
    const visibleServices     = useMemo(() => filterByHousehold(services),     [services, userData, user]);

    // Items del supermercado filtrados al mes actual (para el ReceiptScanner)
    const currentMonthKey = useMemo(() => {
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);
    const visibleSuperItemsThisMonth = useMemo(() =>
        visibleSuperItems.filter(i => i.month === currentMonthKey),
    [visibleSuperItems, currentMonthKey]);

    const handleLogout = () => {
        if (window.confirm('¿Cerrar sesión?')) {
            signOut(auth);
            localStorage.clear();
            window.location.reload();
        }
    };

    // ─── ESTADOS DE CARGA / AUTH ─────────────────────────────────────────────
    if (loadingUser) {
        if (showReload) return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <p className="mb-4">Conexión lenta...</p>
                <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
                    Recargar
                </button>
            </div>
        );
        return (
            <div className={`min-h-screen ${isGlass ? 'bg-night-gradient' : 'bg-[#f3f4f6]'}`}>
                <SkeletonDashboard isGlass={isGlass} />
            </div>
        );
    }

    if (!user) return <Login />;

    // ─── RENDER PRINCIPAL ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen font-sans relative bg-[#f3f4f6]">
            {/* BACKGROUND TRANSITION OVERLAY */}
            <div className={`absolute inset-0 z-0 bg-night-gradient transition-opacity duration-1000 ease-out pointer-events-none ${isGlass ? 'opacity-100' : 'opacity-0'}`}></div>

            {/* MAIN CONTENT WRAPPER */}
            <div className={`relative z-10 min-h-screen transition-colors duration-700 ease-in-out flex flex-col ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
                <InstallPrompt />

                {/* NAVBAR DESKTOP */}
                <div className="hidden md:block relative">
                    <Navbar currentView={view} setView={setView} privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
                </div>

                {/* HEADER MÓVIL */}
                <div className={`md:hidden px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-3 transition-colors duration-300 ${isGlass ? 'bg-[#0f0c29]/90 backdrop-blur-md text-white border-b border-white/5' : 'bg-white text-gray-800'}`}>
                    <button
                        onClick={() => setView('dashboard')}
                        className={`p-2 rounded-xl transition-all active:scale-95 ${view === 'dashboard' ? (isGlass ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600') : (isGlass ? 'bg-transparent text-white/60' : 'bg-gray-100 text-gray-500')}`}
                    >
                        <HomeIcon size={24} />
                    </button>

                    {/* SELECTOR DE MES */}
                    <div className={`flex-1 flex items-center justify-between rounded-xl p-1 max-w-[200px] transition-colors ${isGlass ? 'bg-white/10 border border-white/10 text-white' : 'bg-gray-50 text-gray-800'}`}>
                        <button onClick={() => changeMonth(-1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>
                        <span className="font-bold text-sm capitalize">{getFormattedDate(currentDate)}</span>
                        <button onClick={() => changeMonth(1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* BOTÓN PRIVACIDAD */}
                    <button onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 rounded-xl transition-all active:scale-95 ${privacyMode ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        {privacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
                    </button>
                </div>

                <main className="max-w-5xl mx-auto p-4 mt-2 pb-10 w-full flex-grow">
                    <Suspense fallback={<LazyLoader />}>

                        {/* DASHBOARD */}
                        {view === 'dashboard' && (
                            <Home
                                transactions={visibleTransactions}
                                cards={visibleCards}
                                supermarketItems={visibleSuperItems}
                                services={visibleServices}
                                freshItems={freshItems}
                                plannerCategories={plannerCategories}
                                privacyMode={privacyMode}
                                setView={setView}
                                onLogout={handleLogout}
                                currentDate={currentDate}
                                user={user}
                                onToggleTheme={() => setIsGlass(!isGlass)}
                                householdId={userData?.householdId}
                                householdMembers={householdMembers}
                                notifications={notifications}
                            />
                        )}

                        {/* SERVICIOS */}
                        {view === 'services_manager' && (
                            <ServicesManager
                                services={visibleServices}
                                cards={visibleCards}
                                transactions={visibleTransactions}
                                currentDate={currentDate}
                                privacyMode={privacyMode}
                                isGlass={isGlass}
                                householdId={userData?.householdId}
                                freshItems={freshItems}
                                plannerCategories={plannerCategories}
                            />
                        )}

                        {/* DETECTIVE DE GASTOS */}
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

                        {/* GRUPO FAMILIAR */}
                        {view === 'household' && (
                            <HouseholdManager
                                user={user}
                                householdId={userData?.householdId}
                                onBack={() => setView('dashboard')}
                                isGlass={isGlass}
                            />
                        )}

                        {view === 'stats' && (
                            <Stats
                                transactions={visibleTransactions}
                                cards={visibleCards}
                                services={visibleServices}
                                supermarketItems={visibleSuperItems}
                                freshItems={freshItems}
                                plannerCategories={plannerCategories}
                                privacyMode={privacyMode}
                                currentDate={currentDate}
                                isGlass={isGlass}
                            />
                        )}

                        {view === 'purchase' && (
                            <NewPurchase
                                cards={visibleCards}
                                onSave={addTransaction}
                                transactions={visibleTransactions}
                                privacyMode={privacyMode}
                                currentDate={currentDate}
                                isGlass={isGlass}
                                householdId={userData?.householdId}
                                setView={setView}
                            />
                        )}

                        {view === 'super' && (
                            <SuperList
                                items={visibleSuperItems}
                                currentDate={currentDate}
                                isGlass={isGlass}
                                householdId={userData?.householdId}
                                setView={setView}
                            />
                        )}

                        {view === 'fresh' && (
                            <FreshShop
                                items={freshItems}
                                plannerCategories={plannerCategories}
                                currentDate={currentDate}
                                isGlass={isGlass}
                                householdId={userData?.householdId}
                            />
                        )}

                        {/* REPARTO DEL MES */}
                        {view === 'reparto' && (
                            <SharedExpensesDashboard
                                services={visibleServices}
                                cards={visibleCards}
                                transactions={visibleTransactions}
                                supermarketItems={visibleSuperItems}
                                freshItems={freshItems}
                                plannerCategories={plannerCategories}
                                currentDate={currentDate}
                                privacyMode={privacyMode}
                                isGlass={isGlass}
                                householdId={userData?.householdId}
                                onBack={() => setView('dashboard')}
                                setView={setView}
                            />
                        )}

                        {view === 'scanner' && (
                            <ReceiptScanner
                                isGlass={isGlass}
                                items={visibleSuperItems}
                                onBack={() => setView('super')}
                            />
                        )}

                        {/* MÓDULO DE AHORRO / INVERSIONES */}
                        {view === 'savings' && (
                            <SavingsDashboard
                                isGlass={isGlass}
                                privacyMode={privacyMode}
                                onBack={() => setView('dashboard')}
                            />
                        )}

                    </Suspense>
                </main>
                

            </div>
        </div>
    );
}