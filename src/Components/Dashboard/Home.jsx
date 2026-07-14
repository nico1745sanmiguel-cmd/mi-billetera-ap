import React, { useMemo, useEffect, useState, memo, useCallback } from 'react';
import { Users, LogOut, AlertCircle, Moon, Sun, Monitor, RefreshCw, Bell, Puzzle, Maximize2, Minimize2, GripVertical, MoreVertical, Palette } from 'lucide-react';
import { useWidgetSizes } from '../../hooks/useWidgetSizes';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget';
import { useDragReorder } from '../../hooks/useDragReorder';
import { calcularProporciones, getLatestSalary } from '../../utils/salaryUtils';
import { buildCardsWithDebt, formatMonthKey } from '../../utils/cardDebtUtils';
import {
    AGENDA_MAX_ITEMS,
    DEFAULT_WIDGET_ORDER,
    CRITICAL_DUE_DAY_THRESHOLD,
    CACHE_KEYS,
    WIDGET_SIZE_FIXED,
} from '../../config/constants';
import { getCache, setCache } from '../../utils/cache';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useCards } from '../../context/CardsContext';
import { useSupermarket } from '../../context/SupermarketContext';
import { useServices } from '../../context/ServicesContext';

// Import new Widgets
import SplitSummaryWidget from './Widgets/SplitSummaryWidget';
import SavingsWidget from './Widgets/SavingsWidget';
import CardsWidget from './Widgets/CardsWidget';
import AgendaWidget from './Widgets/AgendaWidget';
import SuperActionsWidget from './Widgets/SuperActionsWidget';
import NotificationsModal from './Widgets/NotificationsModal';
import MobilityWidget from './Widgets/MobilityWidget';
import SalaryWidget from './Widgets/SalaryWidget';
import PlannerWidget from './Widgets/PlannerWidget';
import { isModuleEnabled } from '../../utils/modulesUtils';
import { WidgetGrid } from './WidgetSystem';

import SkinsModal from './Skins/SkinsModal';
import WPTileGrid from './Skins/WindowsPhone/WPTileGrid';

const handleCacheRefresh = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(registration => registration.unregister()));
        } catch (e) {
            console.error("Error al desregistrar SW:", e);
        }
    }
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        } catch (e) {
            console.error("Error al vaciar cachés:", e);
        }
    }
    window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
};

const getInitialOrder = () => {
    const saved = getCache(CACHE_KEYS.WIDGET_ORDER, null);
    const legacy = localStorage.getItem('widget_order');
    const raw = saved || (legacy ? JSON.parse(legacy) : null);
    if (raw) {
        try {
            const hasAll = DEFAULT_WIDGET_ORDER.every(k => raw.includes(k));
            if (hasAll && raw.length === DEFAULT_WIDGET_ORDER.length) return raw;
        } catch (e) { console.error("Error leyendo orden", e); }
    }
    return DEFAULT_WIDGET_ORDER;
};



const THEME_OPTIONS = [
    { key: 'light',  label: 'Día',     Icon: Sun     },
    { key: 'dark',   label: 'Noche',   Icon: Moon    },
    { key: 'system', label: 'Sistema', Icon: Monitor },
];

const EMPTY_ARRAY = [];
const Home = memo(({ onLogout, notifications = EMPTY_ARRAY, onCardClick }) => {
    const { privacyMode, currentDate, isGlass, theme, setTheme, skin, setSkin, showToast } = useUI();
    const navigate = useNavigate();
    const { user, userData, householdMembers } = useAuth();
    const householdId = userData?.householdId;
    const { cards, transactions } = useCards();
    const { superItems: supermarketItems, freshItems, plannerCategories } = useSupermarket();
    const { services } = useServices();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSkinsOpen, setIsSkinsOpen] = useState(false);

    const unreadNotifsCount = useMemo(() => {
        if (!user || !notifications) return 0;
        return notifications.filter(n => !n.readBy?.includes(user.uid)).length;
    }, [notifications, user]);

    const handleMarkAsRead = async (notifId) => {
        if (!user?.uid || !householdId) return;
        try {
            const notifRef = doc(db, 'households', householdId, 'notifications', notifId);
            await updateDoc(notifRef, {
                readBy: arrayUnion(user.uid)
            });
        } catch(e) { console.error("Error al marcar como leido", e); }
    };

    const targetMonthKey = useMemo(() => formatMonthKey(currentDate), [currentDate]);
    const targetMonthVal = useMemo(() => currentDate.getFullYear() * 12 + currentDate.getMonth(), [currentDate]);

    const openCardModal = (card) => {
        if (onCardClick) onCardClick(card);
    };

    const handleToggleAgendaPaid = useCallback(async (item) => {
        const collectionName = item.type === 'card_item' ? 'cards' : 'services';
        const ref = doc(db, collectionName, item.id);
        if (item.isPaid) {
            await updateDoc(ref, { paidPeriods: arrayRemove(targetMonthKey) });
        } else {
            await updateDoc(ref, { paidPeriods: arrayUnion(targetMonthKey) });
            if (householdId && auth.currentUser) {
                try {
                    const { serverTimestamp } = await import('firebase/firestore');
                    await addDoc(collection(db, 'households', householdId, 'notifications'), {
                        type: 'payment', itemName: item.name, amount: item.amount,
                        dueDate: item.day, itemType: item.type,
                        paidByUid: auth.currentUser.uid,
                        paidByName: auth.currentUser.displayName || 'Alguien',
                        createdAt: serverTimestamp(), readBy: [auth.currentUser.uid]
                    });
                } catch (e) { console.error('Error saving notification', e); }
            }
        }
         
    }, [targetMonthKey, householdId]);


    const { order, getDragProps, draggingItem } = useDragReorder(getInitialOrder());
    useEffect(() => { setCache(CACHE_KEYS.WIDGET_ORDER, order); }, [order]);

    const cardsWithDebt = useMemo(() => {
        return buildCardsWithDebt(cards, transactions, targetMonthKey, targetMonthVal);
    }, [cards, transactions, targetMonthKey, targetMonthVal]);

    const superData = useMemo(() => {
        const monthlyItems = supermarketItems.filter(item => {
            if (item.month) return item.month === targetMonthKey;
            const realNow = new Date();
            const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
            return targetMonthKey === realKey;
        });

        const rawBudget = monthlyItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const realSpent = monthlyItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const hasStartedShopping = monthlyItems.some(i => i.checked);

        // Ajuste: si ya empezamos a comprar (hay check), el presupuesto mensual se ajusta a lo gastado real
        const totalBudget = hasStartedShopping ? realSpent : rawBudget;

        const showAmount = hasStartedShopping ? realSpent : totalBudget;
        const label = hasStartedShopping ? 'En Carrito (Gastado)' : 'Presupuesto Estimado';
        const statusColor = hasStartedShopping ? 'text-gray-900' : 'text-gray-400';
        const percent = rawBudget > 0 ? (realSpent / rawBudget) * 100 : 0;

        return { totalBudget, realSpent, percent, showAmount, label, statusColor, rawBudget };
    }, [supermarketItems, targetMonthKey]);

    const agenda = useMemo(() => {
        const realServices = services.map(s => ({ id: s.id, name: s.name, amount: s.amount, day: s.day, isPaid: s.paidPeriods?.includes(targetMonthKey) || false, type: 'service' }));
        const cardServices = cardsWithDebt.flatMap(c => c.currentDebt > 0 ? [{
            id: c.id,
            name: c.name,
            amount: c.currentDebt,
            day: c.dueDay || 10,
            isPaid: c.paidPeriods?.includes(targetMonthKey) || false,
            type: 'card_item',
            bank: c.bank
        }] : []);

        return [...realServices, ...cardServices]
            .sort((a, b) => a.day - b.day)
            .filter(item => !item.isPaid)
            .slice(0, AGENDA_MAX_ITEMS);
    }, [services, cardsWithDebt, targetMonthKey]);

    const superEnabled = isModuleEnabled('supermarket');
    const totalNeed = services.reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0) + (superEnabled ? superData.totalBudget : 0);
    const totalPaid = services.filter(s => s.paidPeriods?.includes(targetMonthKey)).reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.filter(c => c.paidPeriods?.includes(targetMonthKey)).reduce((acc, c) => acc + c.currentDebt, 0) + (superEnabled ? superData.realSpent : 0);
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const criticalAlert = useMemo(() => {
        const firstItem = agenda[0];
        if (firstItem && firstItem.day <= CRITICAL_DUE_DAY_THRESHOLD) {
            return { active: true, msg: `Vencimiento próx: ${firstItem.name} (Día ${firstItem.day})`, amount: firstItem.amount };
        }
        return { active: false };
    }, [agenda]);

    const splitData = useMemo(() => {
        if (!householdMembers || householdMembers.length < 2) return null;
        const allHaveSalary = householdMembers.every(m => getLatestSalary(m.salaryHistory) > 0);
        if (!allHaveSalary) return null;

        const proporciones = calcularProporciones(householdMembers.map(m => ({
            uid: m.uid,
            displayName: m.displayName,
            photoURL: m.photoURL,
            salaryHistory: m.salaryHistory || []
        })));

        const sharedServicesTotal = services.filter(s => s.isShared !== false).reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const sharedCardsTotal = cardsWithDebt.filter(c => c.isShared !== false).reduce((acc, c) => acc + Number(c.currentDebt || 0), 0);
        
        const sharedSuperItems = supermarketItems.filter(i => i.month === targetMonthKey && i.isShared !== false);
        const hasStartedSharedSuper = sharedSuperItems.some(i => i.checked);
        const sharedSuperTotal = hasStartedSharedSuper 
            ? sharedSuperItems.filter(i => i.checked).reduce((acc, i) => acc + Number((i.price || 0) * (i.quantity || 1)), 0)
            : sharedSuperItems.reduce((acc, i) => acc + Number((i.price || 0) * (i.quantity || 1)), 0);

        const sharedFreshTotal = freshItems.filter(i => i.month === targetMonthKey && i.isShared !== false).reduce((acc, i) => acc + (Number(i.total) || 0), 0);
        
        const grandTotal = sharedServicesTotal + sharedCardsTotal + sharedSuperTotal + sharedFreshTotal;

        const breakdown = proporciones.map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            photoURL: p.photoURL,
            salary: p.salary,
            proportion: p.proportion,
            percentage: p.percentage,
            aporte: Math.round(grandTotal * p.proportion)
        }));

        return { grandTotal, breakdown, proporciones };
    }, [householdMembers, services, cardsWithDebt, supermarketItems, freshItems, targetMonthKey]);

    const { getSize, toggleSize } = useWidgetSizes();

    const WIDGETS = {
        ...(isModuleEnabled('planner') ? { target: () => (
            <div className={`h-full flex flex-col transition-all duration-300 ${privacyMode ? 'opacity-50 blur-sm pointer-events-none select-none' : 'opacity-100'}`}>
                <FinancialTarget
                    totalNeed={totalNeed}
                    totalPaid={totalPaid}
                    privacyMode={privacyMode}
                    services={services}
                    cardsWithDebt={cardsWithDebt}
                    superData={superEnabled ? superData : null}
                    targetMonthKey={targetMonthKey}
                    showStats={isModuleEnabled('stats')}
                    onNavigateStats={() => navigate('/stats')}
                />
                {privacyMode && <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 z-10">Vista Privada</div>}
            </div>
        ) } : {}),
        ...(isModuleEnabled('savings') ? { savings_summary: (size) => <SavingsWidget setView={(path) => navigate(`/${path}`)} privacyMode={privacyMode} size={size} /> } : {}),
        ...(isModuleEnabled('mobility') ? { mobility: (size) => <MobilityWidget setView={(path) => navigate(`/${path}`)} currentDate={currentDate} privacyMode={privacyMode} size={size} /> } : {}),
        ...(isModuleEnabled('salary') ? { salary: (size) => <SalaryWidget setView={(path) => navigate(`/${path}`)} privacyMode={privacyMode} size={size} /> } : {}),
        ...(isModuleEnabled('household') ? { split_summary: (size) => <SplitSummaryWidget setView={(path) => navigate(`/${path}`)} householdMembers={householdMembers} splitData={splitData} currentDate={currentDate} privacyMode={privacyMode} user={user} size={size} /> } : {}),
        ...(isModuleEnabled('cards') ? { cards: (size) => <CardsWidget cards={cards} targetMonthKey={targetMonthKey} privacyMode={privacyMode} onCardClick={openCardModal} size={size} /> } : {}),
        ...(isModuleEnabled('agenda') ? { agenda: (size) => <AgendaWidget agenda={agenda} currentDate={currentDate} privacyMode={privacyMode} setView={(path) => navigate(`/${path}`)} freshItems={freshItems} plannerCategories={plannerCategories} onTogglePaid={handleToggleAgendaPaid} size={size} /> } : {}),
        ...(isModuleEnabled('supermarket') ? { super_actions: (size) => <SuperActionsWidget size={size} superData={superData} privacyMode={privacyMode} setView={(path) => navigate(`/${path}`)} targetMonthKey={targetMonthKey} /> } : {}),
        ...(isModuleEnabled('planner') ? { planner_access: (size) => <PlannerWidget setView={(path) => navigate(`/${path}`)} size={size} /> } : {}),
    };

    // Normalizar: widgets que no son función se envuelven para API uniforme
    const getWidgetNode = (key, size) => {
        const w = WIDGETS[key];
        if (!w) return null;
        return typeof w === 'function' ? w(size) : w;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <div className="flex justify-between items-center px-2 pt-2">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 dark:text-white/70 font-bold uppercase tracking-wider">Tu Panel</span>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Hola, {user?.displayName?.split(' ')[0] || 'Nico'} 👋
                    </h1>
                </div>
                <div className="relative z-50">
                    <button aria-label="Acción" 
                        type="button" 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="relative bg-gray-50 text-gray-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5"
                    >
                        <MoreVertical size={20} />
                        {unreadNotifsCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-500 text-[10px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1a1b4b]"></span>
                        )}
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1b4b] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-gray-100 dark:border-white/10 overflow-hidden z-50 origin-top-right transition-all animate-fade-in">
                                <div className="p-2 flex flex-col gap-1">
                                    {isModuleEnabled('household') && (
                                        <button aria-label="Acción" type="button" onClick={() => { navigate('/household'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-300 rounded-xl transition-colors">
                                            <div className="bg-blue-100/50 dark:bg-blue-500/20 p-1.5 rounded-lg text-blue-500 dark:text-blue-300"><Users size={16} /></div>
                                            Miembros
                                        </button>
                                    )}
                                    <button aria-label="Acción" type="button" onClick={() => { setIsNotificationsOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100/50 dark:bg-indigo-500/20 p-1.5 rounded-lg text-indigo-500 dark:text-indigo-300">
                                                <Bell size={16} className={unreadNotifsCount > 0 ? "animate-pulse" : ""} />
                                            </div>
                                            Notificaciones
                                        </div>
                                        {unreadNotifsCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{unreadNotifsCount}</span>
                                        )}
                                    </button>
                                    <button aria-label="Acción" type="button" onClick={() => { navigate('/settings_modules'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/20 dark:hover:text-violet-300 rounded-xl transition-colors">
                                        <div className="bg-violet-100/50 dark:bg-violet-500/20 p-1.5 rounded-lg text-violet-500 dark:text-violet-300"><Puzzle size={16} /></div>
                                        Módulos
                                    </button>
                                    <button aria-label="Acción" type="button" onClick={() => { setIsSkinsOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 rounded-xl transition-colors">
                                        <div className="bg-emerald-100/50 dark:bg-emerald-500/20 p-1.5 rounded-lg text-emerald-500 dark:text-emerald-300"><Palette size={16} /></div>
                                        Skins
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-white/10 my-1 mx-2"></div>
                                    <button aria-label="Acción" type="button" onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-300 rounded-xl transition-colors">
                                        <div className="bg-red-100/50 dark:bg-red-500/20 p-1.5 rounded-lg text-red-500 dark:text-red-300"><LogOut size={16} /></div>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {criticalAlert.active && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse dark:shadow-lg dark:shadow-red-900/10">
                    <div className="flex items-center gap-3"><div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-200 dark:border dark:border-red-500/30"><AlertCircle size={20} /></div><div><p className="text-sm font-bold text-red-800 dark:text-red-100">{criticalAlert.msg}</p><p className="text-xs text-red-600 dark:text-red-300/80 font-medium cursor-pointer underline dark:decoration-red-300/50" onClick={() => navigate('/services_manager')}>Ir a pagar ahora</p></div></div><p className="font-bold text-red-800 dark:text-red-100">{showMoney(criticalAlert.amount)}</p>
                </div>
            )}

            {skin === 'windowsphone' ? (
                <WPTileGrid 
                    navigate={navigate}
                    privacyMode={privacyMode}
                    showMoney={showMoney}
                    totalNeed={totalNeed}
                    totalPaid={totalPaid}
                    cardsWithDebt={cardsWithDebt}
                    agenda={agenda}
                    services={services}
                    superData={superData}
                    currentDate={currentDate}
                    splitData={splitData}
                />
            ) : (
                <WidgetGrid
                    order={order}
                    getWidgetNode={getWidgetNode}
                    getSize={getSize}
                    toggleSize={toggleSize}
                    getDragProps={getDragProps}
                    draggingItem={draggingItem}
                />
            )}



            {/* ── Selector de Tema Triple ── */}
            <div className="mt-6 flex items-center justify-center">
                <div className={`relative flex items-center p-1 rounded-full gap-1 ${
                    isGlass
                        ? 'bg-white/10 border border-white/10'
                        : 'bg-gray-100 border border-gray-200'
                }`}>
                    {THEME_OPTIONS.map(({ key, label, Icon }) => {
                        const isActive = theme === key;
                        return (
                            <button aria-label="Acción" type="button"
                                key={key}
                                onClick={() => setTheme(key)}
                                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                                    isActive
                                        ? isGlass
                                            ? 'bg-white/20 text-white shadow-lg shadow-black/20'
                                            : 'bg-white text-gray-800 shadow-md shadow-gray-200'
                                        : isGlass
                                            ? 'text-white/40 hover:text-white/70'
                                            : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Icon
                                    size={13}
                                    className={`transition-colors duration-300 ${
                                        isActive && key === 'light'  ? 'text-amber-500' :
                                        isActive && key === 'dark'   ? 'text-indigo-400' :
                                        isActive && key === 'system' ? 'text-emerald-400' : ''
                                    }`}
                                />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <button aria-label="Acción" type="button"
                onClick={handleCacheRefresh}
                className="w-full py-4 mt-3 rounded-full border border-gray-100 dark:border-white/10 text-gray-400 dark:text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-white/80 transition-all flex items-center justify-center gap-2 group"
            >
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500 ease-out" />
                <span>Actualizar Aplicación</span>
            </button>



            {isNotificationsOpen && (
                <NotificationsModal 
                    notifications={notifications} 
                    user={user} 
                    privacyMode={privacyMode} 
                    setIsNotificationsOpen={setIsNotificationsOpen} 
                    handleMarkAsRead={handleMarkAsRead}
                    showToast={showToast} 
                />
            )}

            <SkinsModal 
                isOpen={isSkinsOpen}
                onClose={() => setIsSkinsOpen(false)}
                currentSkin={skin}
                onSelectSkin={setSkin}
            />
        </div>
    );
});

export default Home;