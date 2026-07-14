import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, m, LazyMotion, domMax, MotionConfig } from 'framer-motion';
import Navbar from './Components/Layout/Navbar';
import Home from './Components/Dashboard/Home';
import Login from './Components/Login';
import InstallPrompt from './Components/UI/InstallPrompt';
import SkeletonDashboard from './Components/UI/SkeletonDashboard';
import Toast from './Components/UI/Toast';
import ConfirmDialog from './Components/UI/ConfirmDialog';
import DraggableFAB from './Components/Dashboard/Widgets/DraggableFAB';
import FloatingNotes from './Components/Dashboard/Widgets/FloatingNotes';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useFinancial } from './context/FinancialContext';
import { useUI } from './context/UIContext';
import { Home as HomeIcon, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { SLOW_CONNECTION_TIMEOUT_MS } from './config/constants';
import { isModuleEnabled } from './utils/modulesUtils';

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
const ModuleDetailSettings = lazy(() => import('./Components/Settings/ModuleDetailSettings'));
const NotesDashboard = lazy(() => import('./Components/Notes/NotesDashboard'));

const LazyLoader = () => (
    <div className="flex justify-center items-center h-40 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

// Formateador de fecha para el header móvil
const getFormattedDate = (date) => {
    const options = { month: 'long', year: 'numeric' };
    let text = date.toLocaleDateString('es-AR', options).replace(' de ', ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const confirmLogout = (authInstance) => {
    signOut(authInstance);
};

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
        motionPreference,
    } = useUI();

    const navigate = useNavigate();
    const location = useLocation();

    // ─── ESTADO LOCAL (solo afecta a App.jsx, no necesita contexto) ─────
    const [modulesTick, setModulesTick] = useState(0);
    const [selectedCard, setSelectedCard] = useState(null);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    useEffect(() => {
        let lastScrollY = window.scrollY;
        
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 50) {
                if (currentScrollY > lastScrollY) {
                    setIsHeaderVisible(false);
                } else {
                    setIsHeaderVisible(true);
                }
            } else {
                setIsHeaderVisible(true);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        setIsLogoutOpen(true);
    };

    useEffect(() => {
        const handler = () => setModulesTick(t => t + 1);
        window.addEventListener('modulesChanged', handler);
        return () => window.removeEventListener('modulesChanged', handler);
    }, []);

    if (!loadingUser && !user) {
        return <Login />;
    }

    // Permitimos renderizar la UI principal incluso durante loadingUser 
    // para que se dibuje el Home real de forma instantánea usando el caché.

    const reducedMotionSetting = motionPreference === 'system' ? 'user' : (motionPreference === 'off' ? 'always' : 'never');

    return (
        <MotionConfig reducedMotion={reducedMotionSetting}>
        <LazyMotion features={domMax}>
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
                    <div className={`md:hidden px-4 py-3 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-3 transition-all duration-300 ${isGlass ? 'bg-[#0f0c29]/90 backdrop-blur-md text-white border-b border-white/5' : 'bg-white text-gray-800'} ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                        <button aria-label="Ir al inicio" type="button"
                            onClick={() => navigate('/dashboard')}
                            className={`p-2 rounded-xl transition-all active:scale-95 ${location.pathname === '/dashboard' || location.pathname === '/' ? (isGlass ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600') : (isGlass ? 'bg-transparent text-white/60' : 'bg-gray-100 text-gray-500')}`}
                        >
                            <HomeIcon size={24} />
                        </button>

                        {/* SELECTOR DE MES */}
                        <div className={`flex-1 flex items-center justify-between rounded-xl p-1 max-w-[180px] transition-colors ${isGlass ? 'bg-white/10 border border-white/10 text-white' : 'bg-gray-50 text-gray-800'}`}>
                            <button aria-label="Mes anterior" type="button" onClick={() => changeMonth(-1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                                <ChevronLeft size={16} strokeWidth={2.5} />
                            </button>
                            <span className="font-bold text-sm capitalize">{getFormattedDate(currentDate)}</span>
                            <button aria-label="Mes siguiente" type="button" onClick={() => changeMonth(1)} className={`p-2 rounded-lg active:scale-95 transition-colors ${isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                                <ChevronRight size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex gap-1">
                            {/* BOTÓN PRIVACIDAD */}
                            <button aria-label="Alternar modo privacidad" type="button" onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 rounded-xl transition-all active:scale-95 ${privacyMode ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
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
                                        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                            <Home
                                                onLogout={handleLogout}
                                                notifications={notifications}
                                                // react-doctor-disable-next-line react-doctor/no-impure-state-updater
                                                onCardClick={(card) => { setSelectedCard(card); navigate('/cards'); }}
                                            />
                                        </m.div>
                                    } />

                                    <Route path="/services_manager" element={
                                        (isModuleEnabled('agenda') || isModuleEnabled('planner')) ? 
                                        <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><ServicesManager /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/reconcile" element={
                                        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                            <ReconciliationDesk onBack={() => navigate('/dashboard')} />
                                        </m.div>
                                    } />

                                    <Route path="/household" element={
                                        isModuleEnabled('household') ? 
                                        <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><HouseholdManager onBack={() => navigate('/dashboard')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/stats" element={
                                        isModuleEnabled('stats') ? 
                                        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><Stats /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/purchase" element={
                                        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                                            <NewPurchase onSave={() => navigate('/dashboard')} />
                                        </m.div>
                                    } />

                                    <Route path="/super" element={
                                        isModuleEnabled('supermarket') ? 
                                        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><SuperList /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/fresh" element={
                                        isModuleEnabled('supermarket') ? 
                                        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><FreshShop /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/reparto" element={
                                        isModuleEnabled('household') ? 
                                        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}><SharedExpensesDashboard onBack={() => navigate('/dashboard')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/scanner" element={
                                        isModuleEnabled('supermarket') ? 
                                        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}><ReceiptScanner onBack={() => navigate('/super')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/savings" element={
                                        isModuleEnabled('savings') ? 
                                        <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><SavingsDashboard onBack={() => navigate('/dashboard')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/cards" element={
                                        isModuleEnabled('cards') ? 
                                        <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><CardsDashboard initialCard={selectedCard} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/mobility" element={
                                        isModuleEnabled('mobility') ? 
                                        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}><MobilityDashboard onBack={() => navigate('/dashboard')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/salary" element={
                                        isModuleEnabled('salary') ?
                                        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}><SalaryDashboard onBack={() => navigate('/dashboard')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />

                                    <Route path="/settings_modules" element={
                                        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                            <ModulesSettings onBack={() => navigate('/dashboard')} />
                                        </m.div>
                                    } />

                                    <Route path="/settings_modules/:moduleId" element={
                                        <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                                            <ModuleDetailSettings onBack={() => navigate('/settings_modules')} />
                                        </m.div>
                                    } />

                                    <Route path="/notes" element={
                                        isModuleEnabled('notes') ? 
                                        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}><NotesDashboard onBack={() => navigate('/dashboard')} /></m.div> : <Navigate to="/dashboard" replace />
                                    } />
                                    
                                    {/* Fallback temporal a dashboard */}
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </AnimatePresence>
                        </Suspense>
                    </main>
                    {(location.pathname === '/dashboard' || location.pathname === '/') && (
                        <>
                            <DraggableFAB />
                            {isModuleEnabled('notes') && <FloatingNotes user={user} />}
                        </>
                    )}
                    
                    {isLogoutOpen && (
                        <ConfirmDialog
                            title="Cerrar Sesión"
                            message="¿Estás seguro que querés salir?"
                            confirmText="Salir"
                            cancelText="Cancelar"
                            onConfirm={() => confirmLogout(auth)}
                            onCancel={() => setIsLogoutOpen(false)}
                        />
                    )}
                </div>
            </div>
        </div>
        </LazyMotion>
        </MotionConfig>
    );
}