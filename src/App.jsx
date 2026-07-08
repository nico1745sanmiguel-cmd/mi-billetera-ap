import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Components/Layout/Navbar';
import Home from './Components/Dashboard/Home';
import Login from './Components/Login';
import InstallPrompt from './Components/UI/InstallPrompt';
import SkeletonDashboard from './Components/UI/SkeletonDashboard';
import Toast from './Components/UI/Toast';
import DraggableFAB from './Components/Dashboard/Widgets/DraggableFAB';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useFinancial } from './context/FinancialContext';
import { useUI } from './context/UIContext';
import { Home as HomeIcon, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { SLOW_CONNECTION_TIMEOUT_MS } from './config/constants';
import { isModuleEnabled } from './Components/Settings/ModulesSettings';

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
const MobilityDashboard = lazy(() => import('./Components/Mobility/MobilityDashboard'));
const SalaryDashboard   = lazy(() => import('./Components/Salary/SalaryDashboard'));
const CardsDashboard    = lazy(() => import('./Components/Cards/CardsDashboard'));
const ModulesSettings   = lazy(() => import('./Components/Settings/ModulesSettings'));

const LazyLoader = () => (
    <div className="flex justify-center items-center h-40 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default function App() {
    // ─── DATOS FINANCIEROS ───────────────────────────────────────────────────
    const { user, loadingUser, notifications } = useFinancial();

    // ─── ESTADO DE UI (viene de UIContext) ───────────────────────────────────
    const {
        privacyMode,
        setPrivacyMode,
        isGlass,
        currentDate,
        changeMonth,
        toast,
        hideToast,
    } = useUI();

    const navigate = useNavigate();
    const location = useLocation();

    // ─── ESTADO LOCAL (solo afecta a App.jsx, no necesita contexto) ─────
    const [showReload, setShowReload] = useState(false);
    const [modulesTick, setModulesTick] = useState(0);
    const [selectedCard, setSelectedCard] = useState(null);

    useEffect(() => {
        const handler = () => setModulesTick(t => t + 1);
        window.addEventListener('modulesChanged', handler);
        return () => window.removeEventListener('modulesChanged', handler);
    }, []);

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

    const handleLogout = () => {
        if (window.confirm('¿Cerrar sesión?')) {
            signOut(auth);
        }
    };

    if (loadingUser) {
        return (
            <div className={`min-h-screen ${isGlass ? 'bg-[#0f0c29]' : 'bg-gray-50'}`}>
                <SkeletonDashboard isGlass={isGlass} />
                {showReload && (
                    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50 animate-fade-in">
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-full shadow-lg border border-white/20 active:scale-95 transition-transform">
                            La conexión está lenta. Toca para recargar.
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className={`app-container min-h-screen transition-colors duration-700 ease-in-out ${isGlass ? 'glass-mode bg-[#0f0c29]' : 'light-mode bg-gray-50'}`}>
            <div className="relative z-10 min-h-screen flex flex-col">
                
                <div data-modules-tick={modulesTick} className={`relative z-10 min-h-screen transition-colors duration-700 ease-in-out flex flex-col ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
                    <InstallPrompt />

                    {/* NAVBAR DESKTOP */}
                    <div className="hidden md:block relative">
                        <Navbar privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
                    </div>

                    {/* HEADER MÓVIL */}
                    <div className={`md:hidden px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-3 transition-colors duration-300 ${isGlass ? 'bg-[#0f0c29]/90 backdrop-blur-md text-white border-b border-white/5' : 'bg-white text-gray-800'}`}>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className={`p-2 rounded-xl transition-all active:scale-95 ${location.pathname === '/dashboard' || location.pathname === '/' ? (isGlass ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600') : (isGlass ? 'bg-transparent text-white/60' : 'bg-gray-100 text-gray-500')}`}
                        >
                            <HomeIcon size={24} />
                        </button>

                        {/* SELECTOR DE MES */}
                        <div className={`flex-1 flex items-center justify-between rounded-xl p-1 max-w-[180px] transition-colors ${isGlass ? 'bg-white/10 border border-white/10 text-white' : 'bg-gray-50 text-gray-800'}`}>
                            <button onClick={() => changeMonth(-1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                                <ChevronLeft size={16} strokeWidth={2.5} />
                            </button>
                            <span className="font-bold text-sm capitalize">{getFormattedDate(currentDate)}</span>
                            <button onClick={() => changeMonth(1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                                <ChevronRight size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex gap-1">
                            {/* BOTÓN PRIVACIDAD */}
                            <button onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 rounded-xl transition-all active:scale-95 ${privacyMode ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                {privacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
                            </button>
                        </div>
                    </div>

                    <main className="max-w-5xl mx-auto p-4 mt-2 pb-10 w-full flex-grow relative overflow-hidden">
                        <Suspense fallback={<LazyLoader />}>
                            <AnimatePresence mode="wait">
                                <Routes location={location} key={location.pathname}>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    
                                    <Route path="/dashboard" element={
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                            <Home
                                                onLogout={handleLogout}
                                                notifications={notifications}
                                                onCardClick={(card) => { setSelectedCard(card); navigate('/cards'); }}
                                            />
                                        </motion.div>
                                    } />

                                    <Route path="/services_manager" element={
                                        (isModuleEnabled('agenda') || isModuleEnabled('planner')) ? 
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><ServicesManager /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/reconcile" element={
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                            <ReconciliationDesk onBack={() => navigate('/dashboard')} />
                                        </motion.div>
                                    } />

                                    <Route path="/household" element={
                                        isModuleEnabled('household') ? 
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><HouseholdManager onBack={() => navigate('/dashboard')} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/stats" element={
                                        isModuleEnabled('stats') ? 
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><Stats /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/purchase" element={
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                                            <NewPurchase onSave={() => navigate('/dashboard')} />
                                        </motion.div>
                                    } />

                                    <Route path="/super" element={
                                        isModuleEnabled('supermarket') ? 
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><SuperList /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/fresh" element={
                                        isModuleEnabled('supermarket') ? 
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><FreshShop /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/reparto" element={
                                        isModuleEnabled('household') ? 
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}><SharedExpensesDashboard onBack={() => navigate('/dashboard')} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/scanner" element={
                                        isModuleEnabled('supermarket') ? 
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}><ReceiptScanner onBack={() => navigate('/super')} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/savings" element={
                                        isModuleEnabled('savings') ? 
                                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><SavingsDashboard onBack={() => navigate('/dashboard')} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/cards" element={
                                        isModuleEnabled('cards') ? 
                                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><CardsDashboard initialCard={selectedCard} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/mobility" element={
                                        isModuleEnabled('mobility') ? 
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}><MobilityDashboard onBack={() => navigate('/dashboard')} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/salary" element={
                                        isModuleEnabled('salary') ?
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}><SalaryDashboard onBack={() => navigate('/dashboard')} /></motion.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/settings_modules" element={
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                            <ModulesSettings onBack={() => navigate('/dashboard')} />
                                        </motion.div>
                                    } />
                                    
                                    {/* Fallback temporal a dashboard */}
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </AnimatePresence>
                        </Suspense>
                    </main>
                    <DraggableFAB />
                </div>
            </div>
        </div>
    );
}