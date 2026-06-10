import React, { useMemo, useEffect, useState, memo } from 'react';
import { Users, LogOut, AlertCircle, BarChart3, Moon, RefreshCw, Bell, TrendingUp, Puzzle } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
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
} from '../../config/constants';
import { getCache, setCache } from '../../utils/cache';

// Import new Widgets
import SplitSummaryWidget from './Widgets/SplitSummaryWidget';
import SavingsWidget from './Widgets/SavingsWidget';
import CardsWidget from './Widgets/CardsWidget';
import AgendaWidget from './Widgets/AgendaWidget';
import SuperActionsWidget from './Widgets/SuperActionsWidget';
import NotificationsModal from './Widgets/NotificationsModal';
import MobilityWidget from './Widgets/MobilityWidget';
import { isModuleEnabled } from '../Settings/ModulesSettings';

const Home = memo(({ transactions, cards, supermarketItems = [], services = [], freshItems = [], privacyMode, setView, onLogout, currentDate, user, onToggleTheme, householdId, householdMembers = [], notifications = [], plannerCategories = [], onCardClick }) => {

    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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

    const handleCacheRefresh = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
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
        const cardServices = cardsWithDebt.filter(c => c.currentDebt > 0).map(c => ({
            id: c.id,
            name: c.name,
            amount: c.currentDebt,
            day: c.dueDay || 10,
            isPaid: c.paidPeriods?.includes(targetMonthKey) || false,
            type: 'card_item',
            bank: c.bank
        }));

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

    const WIDGETS = {
        target: (
            <div className={`transition-all duration-300 ${privacyMode ? 'opacity-50 blur-sm pointer-events-none select-none' : 'opacity-100'}`}>
                <FinancialTarget totalNeed={totalNeed} totalPaid={totalPaid} privacyMode={privacyMode} />
                {privacyMode && <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 z-10">Vista Privada</div>}
            </div>
        ),
        savings_summary: <SavingsWidget setView={setView} privacyMode={privacyMode} />,
        ...(isModuleEnabled('mobility') ? { mobility: <MobilityWidget setView={setView} currentDate={currentDate} privacyMode={privacyMode} /> } : {}),
        split_summary: <SplitSummaryWidget setView={setView} householdMembers={householdMembers} splitData={splitData} currentDate={currentDate} privacyMode={privacyMode} user={user} />,
        ...(isModuleEnabled('cards') ? { cards: <CardsWidget cards={cards} targetMonthKey={targetMonthKey} privacyMode={privacyMode} onCardClick={openCardModal} /> } : {}),
        agenda: <AgendaWidget agenda={agenda} currentDate={currentDate} privacyMode={privacyMode} setView={setView} freshItems={freshItems} plannerCategories={plannerCategories} />,
        ...(isModuleEnabled('supermarket') ? { super_actions: <SuperActionsWidget superData={superData} privacyMode={privacyMode} setView={setView} /> } : {}),
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
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('household')} className="bg-blue-50 text-blue-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 dark:hover:text-blue-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <Users size={20} />
                    </button>

                    <button onClick={() => setIsNotificationsOpen(true)} className="relative bg-indigo-50 text-indigo-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <Bell size={20} className={unreadNotifsCount > 0 ? "animate-pulse" : ""} />
                        {unreadNotifsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a1b4b]">
                                {unreadNotifsCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setView('settings_modules')} className="bg-violet-50 text-violet-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-violet-100 dark:hover:bg-violet-500/20 dark:hover:text-violet-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <Puzzle size={20} />
                    </button>
                    <button onClick={onLogout} className="bg-gray-50 text-gray-400 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {criticalAlert.active && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse dark:shadow-lg dark:shadow-red-900/10">
                    <div className="flex items-center gap-3"><div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-200 dark:border dark:border-red-500/30"><AlertCircle size={20} /></div><div><p className="text-sm font-bold text-red-800 dark:text-red-100">{criticalAlert.msg}</p><p className="text-xs text-red-600 dark:text-red-300/80 font-medium cursor-pointer underline dark:decoration-red-300/50" onClick={() => setView('services_manager')}>Ir a pagar ahora</p></div></div><p className="font-bold text-red-800 dark:text-red-100">{showMoney(criticalAlert.amount)}</p>
                </div>
            )}

            <div className="space-y-6">
                {order.map((key) => {
                    if (!WIDGETS[key]) return null;
                    return (
                        <div key={key} {...getDragProps(key)} className={`transition-all duration-300 ${draggingItem === key ? 'opacity-50 scale-95 cursor-grabbing' : 'cursor-grab'}`}>
                            <div className="flex justify-center -mb-2 opacity-0 hover:opacity-100 transition-opacity"><div className="w-10 h-1 bg-gray-200 rounded-full"></div></div>
                            {WIDGETS[key]}
                        </div>
                    );
                })}
            </div>

            <button onClick={() => setView('stats')} className="w-full h-20 mx-1 rounded-2xl relative overflow-hidden group shadow-lg shadow-indigo-200 active:scale-95 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient-x opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white gap-1">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                            <BarChart3 size={16} />
                        </div>
                        <span className="font-bold text-base tracking-wide">Ver Análisis Completo</span>
                    </div>
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-medium">Estadísticas & Proyecciones</span>
                </div>
            </button>

            <button
                onClick={onToggleTheme}
                className="w-full py-4 mt-6 rounded-full border border-gray-100 dark:border-white/10 text-gray-400 dark:text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-white/80 transition-all flex items-center justify-center gap-2"
            >
                <Moon size={16} className="dark:hidden" />
                <span className="dark:hidden">Cambiar a Modo Noche</span>
                <Moon size={16} className="hidden dark:block text-yellow-300" />
                <span className="hidden dark:block">Volver a Modo Día</span>
            </button>

            <button
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
                />
            )}
        </div>
    );
});

export default Home;