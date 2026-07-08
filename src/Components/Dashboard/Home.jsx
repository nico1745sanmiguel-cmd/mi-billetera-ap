import React, { useMemo, useEffect, useState, memo, useCallback } from 'react';
import { Users, LogOut, AlertCircle, Moon, Sun, Monitor, RefreshCw, Bell, Puzzle, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
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
import { isModuleEnabled } from '../Settings/ModulesSettings';

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

// ─── SizeMenu ─────────────────────────────────────────────────────────────────
// Menú flotante que aparece al completar el long press.
// Muestra dos opciones: Completo (full) o Compacto (half).
function SizeMenu({ currentSize, onSelect, onClose }) {
    return (
        <>
            {/* Overlay para cerrar al tocar fuera */}
            <div className="fixed inset-0 z-40" onTouchStart={onClose} onClick={onClose} role="presentation" aria-hidden="true" />

            <div className="absolute top-2 right-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 p-1.5 flex flex-col gap-1 min-w-[160px]">
                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-white/30 tracking-widest px-2 pt-1 pb-0.5">Tamaño del widget</p>

                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect('full'); onClose(); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            currentSize === 'full'
                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                                : 'text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <Maximize2 size={14} />
                        <span>Completo</span>
                        {/* Ícono visual de ancho completo */}
                        <span className="ml-auto flex gap-0.5">
                            <span className="w-3 h-2 bg-current opacity-60 rounded-sm" />
                        </span>
                    </button>

                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect('half'); onClose(); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            currentSize === 'half'
                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                                : 'text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <Minimize2 size={14} />
                        <span>Compacto</span>
                        {/* Ícono visual de medio ancho */}
                        <span className="ml-auto flex gap-0.5">
                            <span className="w-1.5 h-2 bg-current opacity-60 rounded-sm" />
                            <span className="w-1.5 h-2 bg-current opacity-20 rounded-sm" />
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── WidgetWrapper ─────────────────────────────────────────────────────────────
// Envuelve cada widget con: long press, menú de tamaño, drag handle, feedback visual.
function WidgetWrapper({ widgetKey, children, size, onToggleSize, getDragProps, isDragging }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isFixed = WIDGET_SIZE_FIXED.has(widgetKey);

    const { handlers: longPressHandlers, isHolding } = useLongPress(() => {
        if (!isFixed) setMenuOpen(true);
    });

    const dragProps = getDragProps(widgetKey);

    return (
        <div
            className={`relative transition-all duration-300 flex-1 flex flex-col ${isDragging ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-grab'}`}
            {...(!menuOpen ? longPressHandlers : {})}
            draggable={dragProps.draggable}
            onDragStart={dragProps.onDragStart}
            onDragEnter={dragProps.onDragEnter}
            onTouchEnd={(e) => {
                if (!menuOpen && longPressHandlers.onTouchEnd) longPressHandlers.onTouchEnd(e);
                if (dragProps.onTouchEnd) dragProps.onTouchEnd(e);
            }}
        >
            {/* Feedback visual durante el long press: borde pulsante */}
            {isHolding && !isFixed && (
                <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400 dark:border-indigo-400 animate-pulse z-10 pointer-events-none" />
            )}

            {/* Contenido del widget — sin wrapper extra, usa el estilo nativo de cada widget */}
            {children}

            {/* SizeMenu flotante */}
            {menuOpen && (
                <SizeMenu
                    currentSize={size}
                    onSelect={(newSize) => onToggleSize(widgetKey, newSize)}
                    onClose={() => setMenuOpen(false)}
                />
            )}
        </div>
    );
}

// ─── WidgetGrid ────────────────────────────────────────────────────────────────
// Agrupa los widgets en filas. Dos 'half' consecutivos → fila de 2 columnas.
// Un 'half' sin pareja → renderiza solo al 50% del ancho.
function WidgetGrid({ order, getWidgetNode, getSize, toggleSize, getDragProps, draggingItem }) {
    // Filtrar los widgets que realmente están activos (habilitados en Módulos)
    const activeKeys = order.filter(key => !!getWidgetNode(key, 'full'));

    // Construir filas: agrupar half+half en pares
    const rows = [];
    let i = 0;
    while (i < activeKeys.length) {
        const key = activeKeys[i];
        const size = getSize(key);
        if (size === 'half') {
            const nextKey = activeKeys[i + 1];
            const nextSize = nextKey ? getSize(nextKey) : 'full';
            if (nextSize === 'half') {
                rows.push([key, nextKey]);
                i += 2;
            } else {
                rows.push([key]); // huérfano → se renderiza al 50%
                i += 1;
            }
        } else {
            rows.push([key]);
            i += 1;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {rows.map((row, rowIdx) => {
                const isPair = row.length === 2;
                return (
                    <div key={rowIdx} className={`flex gap-3 ${isPair ? 'items-stretch' : ''}`}>
                        {row.map((key) => {
                            const size = getSize(key);
                            const node = getWidgetNode(key, size);
                            if (!node) return null;
                            return (
                                <div
                                    key={key}
                                    className={`${isPair || size === 'half' ? 'w-1/2' : 'w-full'} min-w-0 flex flex-col`}
                                >
                                    <WidgetWrapper
                                        widgetKey={key}
                                        size={size}
                                        onToggleSize={(k, newSize) => {
                                            // toggleSize alterna, pero desde SizeMenu viene el valor exacto
                                            const current = getSize(k);
                                            if (current !== newSize) toggleSize(k);
                                        }}
                                        getDragProps={getDragProps}
                                        isDragging={draggingItem === key}
                                    >
                                        {node}
                                    </WidgetWrapper>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

const THEME_OPTIONS = [
    { key: 'light',  label: 'Día',     Icon: Sun     },
    { key: 'dark',   label: 'Noche',   Icon: Moon    },
    { key: 'system', label: 'Sistema', Icon: Monitor },
];

const Home = memo(({ onLogout, notifications = [], onCardClick }) => {
    const { privacyMode, currentDate, isGlass, theme, setTheme } = useUI();
    const navigate = useNavigate();
    const { user, userData, householdMembers } = useAuth();
    const householdId = userData?.householdId;
    const { cards, transactions } = useCards();
    const { superItems: supermarketItems, freshItems, plannerCategories } = useSupermarket();
    const { services } = useServices();
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
        ...(isModuleEnabled('savings') ? { savings_summary: () => <SavingsWidget setView={(path) => navigate(`/${path}`)} privacyMode={privacyMode} /> } : {}),
        ...(isModuleEnabled('mobility') ? { mobility: () => <MobilityWidget setView={(path) => navigate(`/${path}`)} currentDate={currentDate} privacyMode={privacyMode} /> } : {}),
        ...(isModuleEnabled('salary') ? { salary: () => <SalaryWidget setView={(path) => navigate(`/${path}`)} privacyMode={privacyMode} /> } : {}),
        ...(isModuleEnabled('household') ? { split_summary: (size) => <SplitSummaryWidget setView={(path) => navigate(`/${path}`)} householdMembers={householdMembers} splitData={splitData} currentDate={currentDate} privacyMode={privacyMode} user={user} size={size} /> } : {}),
        ...(isModuleEnabled('cards') ? { cards: (size) => <CardsWidget cards={cards} targetMonthKey={targetMonthKey} privacyMode={privacyMode} onCardClick={openCardModal} size={size} /> } : {}),
        ...(isModuleEnabled('agenda') ? { agenda: () => <AgendaWidget agenda={agenda} currentDate={currentDate} privacyMode={privacyMode} setView={(path) => navigate(`/${path}`)} freshItems={freshItems} plannerCategories={plannerCategories} onTogglePaid={handleToggleAgendaPaid} /> } : {}),
        ...(isModuleEnabled('supermarket') ? { super_actions: () => <SuperActionsWidget superData={superData} privacyMode={privacyMode} setView={(path) => navigate(`/${path}`)} /> } : {}),
        ...(isModuleEnabled('planner') ? { planner_access: () => <PlannerWidget setView={(path) => navigate(`/${path}`)} /> } : {}),
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
                <div className="flex items-center gap-2">
                    {isModuleEnabled('household') && (
                        <button type="button" onClick={() => navigate('/household')} className="bg-blue-50 text-blue-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 dark:hover:text-blue-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                            <Users size={20} />
                        </button>
                    )}

                    <button type="button" onClick={() => setIsNotificationsOpen(true)} className="relative bg-indigo-50 text-indigo-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <Bell size={20} className={unreadNotifsCount > 0 ? "animate-pulse" : ""} />
                        {unreadNotifsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a1b4b]">
                                {unreadNotifsCount}
                            </span>
                        )}
                    </button>
                    <button type="button" onClick={() => navigate('/settings_modules')} className="bg-violet-50 text-violet-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-violet-100 dark:hover:bg-violet-500/20 dark:hover:text-violet-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <Puzzle size={20} />
                    </button>
                    <button type="button" onClick={onLogout} className="bg-gray-50 text-gray-400 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {criticalAlert.active && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse dark:shadow-lg dark:shadow-red-900/10">
                    <div className="flex items-center gap-3"><div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-200 dark:border dark:border-red-500/30"><AlertCircle size={20} /></div><div><p className="text-sm font-bold text-red-800 dark:text-red-100">{criticalAlert.msg}</p><p className="text-xs text-red-600 dark:text-red-300/80 font-medium cursor-pointer underline dark:decoration-red-300/50" onClick={() => navigate('/services_manager')}>Ir a pagar ahora</p></div></div><p className="font-bold text-red-800 dark:text-red-100">{showMoney(criticalAlert.amount)}</p>
                </div>
            )}

            <WidgetGrid
                order={order}
                getWidgetNode={getWidgetNode}
                getSize={getSize}
                toggleSize={toggleSize}
                getDragProps={getDragProps}
                draggingItem={draggingItem}
            />



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
                            <button type="button"
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

            <button type="button"
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