import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, m, LazyMotion, domMax, MotionConfig } from 'framer-motion';
import Navbar from './Components/Layout/Navbar';
import MobileHeader from './Components/Layout/MobileHeader';
import GlobalToast from './Components/UI/GlobalToast';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useFinancial } from './context/FinancialContext';
import { useUI } from './context/UIContext';
import { SLOW_CONNECTION_TIMEOUT_MS } from './config/constants';
import { isModuleEnabled } from './utils/modulesUtils';

// --- LAZY IMPORTS ---
const Home = lazy(() => import('./Components/Dashboard/Home'));
const Login = lazy(() => import('./Components/Login'));
const InstallPrompt = lazy(() => import('./Components/UI/InstallPrompt'));
const ConfirmDialog = lazy(() => import('./Components/UI/ConfirmDialog'));
const DraggableFAB = lazy(() => import('./Components/Dashboard/Widgets/DraggableFAB'));
const FloatingNotes = lazy(() => import('./Components/Dashboard/Widgets/FloatingNotes'));
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

const confirmLogout = (authInstance) => {
    signOut(authInstance);
};

// ─── DEEP LINKING: Captura del query param ANTES de que React monte ──────────
// Se ejecuta UNA SOLA VEZ cuando el módulo se parsea (cold start).
// Usar sessionStorage (no useRef) garantiza que sobrevive cualquier remount.
// La URL se limpia inmediatamente para que React Router no vea el ?deeplink.
;(() => {
    try {
        const params = new URLSearchParams(window.location.search);
        const deeplink = params.get('deeplink');
        console.log('[Deeplink IIFE] href:', window.location.href, '| deeplink param:', deeplink);
        if (deeplink) {
            sessionStorage.setItem('pendingDeeplink', deeplink);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('[Deeplink IIFE] Stored in sessionStorage:', deeplink);
        }
    } catch (err) {
        console.warn('[Deeplink IIFE] Error:', err);
    }
})();


export default function App() {
    // ─── DATOS FINANCIEROS ───────────────────────────────────────────────────
    const { user, loadingUser, notifications } = useFinancial();

    // ─── ESTADO DE UI (viene de UIContext) ───────────────────────────────────
    const {
        privacyMode,
        setPrivacyMode,
        isGlass,
        motionPreference,
    } = useUI();

    const navigate = useNavigate();
    const location = useLocation();

    // ─── ESTADO LOCAL (solo afecta a App.jsx) ─────
    const [modulesTick, setModulesTick] = useState(0);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    const handleLogout = useCallback(() => {
        setIsLogoutOpen(true);
    }, []);

    const handleLogoutClose = useCallback(() => {
        setIsLogoutOpen(false);
    }, []);

    const handleLogoutConfirm = useCallback(() => {
        confirmLogout(auth);
    }, []);

    const handleCardClick = useCallback((card) => {
        navigate('/cards', { state: { initialCard: card } });
    }, [navigate]);

    useEffect(() => {
        const handler = () => setModulesTick(t => t + 1);
        window.addEventListener('modulesChanged', handler);
        return () => window.removeEventListener('modulesChanged', handler);
    }, []);

    // --- DEEP LINKING (Cold & Warm Start) ---
    // El deeplink se capturó a nivel módulo (IIFE) antes de que React montara.
    // Se usa sessionStorage para que sobreviva cualquier remount del componente.

    // Exponer window.navigateTo para Warm Start desde Android (onNewIntent)
    useEffect(() => {
        window.navigateTo = navigate;
        return () => { delete window.navigateTo; };
    }, [navigate]);

    // Navegar al deeplink pendiente en cuanto el usuario esté autenticado.
    // Sin setTimeout: el navigate ocurre directo, sin race conditions.
    useEffect(() => {
        console.log('[Deeplink Effect] loadingUser:', loadingUser, '| user:', !!user);
        if (!loadingUser && user) {
            const route = sessionStorage.getItem('pendingDeeplink');
            console.log('[Deeplink Effect] pendingDeeplink from sessionStorage:', route);
            if (route) {
                sessionStorage.removeItem('pendingDeeplink');
                console.log('[Deeplink Effect] Navigating to:', route);
                navigate(route, { replace: true });
            }
        }
    }, [loadingUser, user, navigate]);


    if (!loadingUser && !user) {
        return (
            <Suspense fallback={<div className={`min-h-screen flex items-center justify-center ${isGlass ? 'bg-[#0f0c29]' : 'bg-gray-50'}`}><LazyLoader /></div>}>
                <Login />
            </Suspense>
        );
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
                    <GlobalToast />
                    <Suspense fallback={null}>
                        <InstallPrompt />
                    </Suspense>

                    {/* NAVBAR DESKTOP */}
                    <div className="hidden md:block relative">
                        <Navbar privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} isGlass={isGlass} />
                    </div>

                    {/* HEADER MÓVIL */}
                    <MobileHeader />

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
                                                onCardClick={handleCardClick}
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
                                        <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><CardsDashboard /></m.div> : <Navigate to="/dashboard" replace />
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
                        <Suspense fallback={null}>
                            <DraggableFAB />
                            {isModuleEnabled('notes') && <FloatingNotes user={user} />}
                        </Suspense>
                    )}
                    
                    {isLogoutOpen && (
                        <Suspense fallback={null}>
                            <ConfirmDialog
                                title="Cerrar Sesión"
                                message="¿Estás seguro que querés salir?"
                                confirmText="Salir"
                                cancelText="Cancelar"
                                onConfirm={handleLogoutConfirm}
                                onCancel={handleLogoutClose}
                            />
                        </Suspense>
                    )}
                </div>
            </div>
        </div>
        </LazyMotion>
        </MotionConfig>
    );
}