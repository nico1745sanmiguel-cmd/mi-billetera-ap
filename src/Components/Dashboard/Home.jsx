import React, { useMemo, useEffect, useState, memo } from 'react';
import { Scale, Wallet, CreditCard, CalendarDays, PartyPopper, ExternalLink, Plus, ShoppingCart, Receipt, Users, LogOut, AlertCircle, BarChart3, Moon, LayoutList } from 'lucide-react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget';
import CardDetailModal from '../Cards/CardDetailModal';
import { useDragReorder } from '../../hooks/useDragReorder';
import { calcularProporciones, getLatestSalary, calcularAporte } from '../../utils/salaryUtils';
import { buildCardsWithDebt, formatMonthKey } from '../../utils/cardDebtUtils';
import {
    AGENDA_MAX_ITEMS,
    DEFAULT_WIDGET_ORDER,
    CRITICAL_DUE_DAY_THRESHOLD,
    CARD_LOGO_MAP,
    CACHE_KEYS,
} from '../../config/constants';
import { getCache, setCache } from '../../utils/cache';

const Home = memo(({ transactions, cards, supermarketItems = [], services = [], freshItems = [], privacyMode, setView, onLogout, currentDate, user, onToggleTheme, householdId, householdMembers = [] }) => {

    const [selectedCardForModal, setSelectedCardForModal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Clave del mes seleccionado
    const targetMonthKey = useMemo(() => formatMonthKey(currentDate), [currentDate]);
    const targetMonthVal = useMemo(() => currentDate.getFullYear() * 12 + currentDate.getMonth(), [currentDate]);

    const openCardModal = (card) => {
        setSelectedCardForModal(card);
        setIsModalOpen(true);
    };

    // --- 1. CONFIGURACIÓN DRAG & DROP ---
    const getInitialOrder = () => {
        const saved = getCache(CACHE_KEYS.WIDGET_ORDER, null);
        const legacy = localStorage.getItem('widget_order'); // compatibilidad con versión anterior
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


    // --- 2. CÁLCULOS ---

    // A. Tarjetas (Con Logos y Deuda) — usa buildCardsWithDebt de cardDebtUtils
    const cardsWithDebt = useMemo(() => {
        return buildCardsWithDebt(cards, transactions, targetMonthKey, targetMonthVal);
    }, [cards, transactions, targetMonthKey, targetMonthVal]);

    // Helper Logos — usa CARD_LOGO_MAP de constants
    const getCardLogo = (name) => {
        const n = (name || '').toLowerCase();
        const match = CARD_LOGO_MAP.find(({ keywords }) => keywords.some(kw => n.includes(kw)));
        return match?.path || null;
    };

    // B. Supermercado
    const superData = useMemo(() => {
        const monthlyItems = supermarketItems.filter(item => {
            if (item.month) return item.month === targetMonthKey;
            const realNow = new Date();
            const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
            return targetMonthKey === realKey;
        });

        const totalBudget = monthlyItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const realSpent = monthlyItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);

        const hasStartedShopping = monthlyItems.some(i => i.checked);

        const showAmount = hasStartedShopping ? realSpent : totalBudget;
        const label = hasStartedShopping ? 'En Carrito (Gastado)' : 'Presupuesto Estimado';
        const statusColor = hasStartedShopping ? 'text-gray-900' : 'text-gray-400';
        const percent = totalBudget > 0 ? (realSpent / totalBudget) * 100 : 0;

        return { totalBudget, realSpent, percent, showAmount, label, statusColor };
    }, [supermarketItems, targetMonthKey]);

    // C. Agenda
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

    // Totales
    const totalNeed = services.reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0) + superData.totalBudget;
    const totalPaid = services.filter(s => s.paidPeriods?.includes(targetMonthKey)).reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.filter(c => c.paidPeriods?.includes(targetMonthKey)).reduce((acc, c) => acc + c.currentDebt, 0) + superData.realSpent;
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const criticalAlert = useMemo(() => {
        const firstItem = agenda[0];
        if (firstItem && firstItem.day <= CRITICAL_DUE_DAY_THRESHOLD) {
            return { active: true, msg: `Vencimiento próx: ${firstItem.name} (Día ${firstItem.day})`, amount: firstItem.amount };
        }
        return { active: false };
    }, [agenda]);

    // --- CÁLCULO DE REPARTO PROPORCIONAL ---
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

        // Gastos compartidos del mes: servicios + tarjetas con deuda
        const sharedServicesTotal = services.filter(s => s.isShared !== false).reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const sharedCardsTotal = cardsWithDebt.filter(c => c.isShared !== false).reduce((acc, c) => acc + Number(c.currentDebt || 0), 0);
        const sharedSuperTotal = supermarketItems.filter(i => i.month === targetMonthKey && i.isShared !== false).reduce((acc, i) => acc + Number((i.price || 0) * (i.quantity || 1)), 0);
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


    // --- 3. DICCIONARIO DE WIDGETS ---
    const WIDGETS = {
        target: (
            <div className={`transition-all duration-300 ${privacyMode ? 'opacity-50 blur-sm pointer-events-none select-none' : 'opacity-100'}`}>
                <FinancialTarget totalNeed={totalNeed} totalPaid={totalPaid} privacyMode={privacyMode} />
                {privacyMode && <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 z-10">Vista Privada</div>}
            </div>
        ),

        split_summary: (
            <div 
                onClick={() => setView('reparto')}
                className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mx-1 cursor-pointer hover:border-emerald-200 dark:hover:bg-white/10 transition-all dark:backdrop-blur-md group"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-transparent dark:to-transparent">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><Scale size={18} className="text-emerald-600 dark:text-emerald-400" /> Reparto del Mes</h3>
                        <p className="text-[10px] text-gray-400 dark:text-white/40 font-medium capitalize">{currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setView('household'); }} 
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-2 py-1 rounded-full transition-colors dark:border dark:border-emerald-500/20"
                    >
                        Sueldos
                    </button>
                </div>

                {householdMembers.length >= 2 && splitData ? (
                    <div className="p-4 space-y-3">
                        {splitData.breakdown.map((member, idx) => {
                            const isMe = member.uid === user?.uid;
                            const barWidth = `${member.percentage}%`;
                            const colors = ['from-indigo-500 to-purple-500', 'from-emerald-500 to-teal-500'];
                            const textColors = ['text-indigo-600', 'text-emerald-600'];
                            return (
                                <div key={member.uid}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx % 2]} flex items-center justify-center text-white text-[10px] font-bold`}>
                                                {(member.displayName || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-white/80">
                                                {member.displayName?.split(' ')[0]}
                                                {isMe && <span className="ml-1 text-[9px] text-blue-500 dark:text-blue-300 font-bold">VOS</span>}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold font-mono ${privacyMode ? 'blur-sm' : ''} ${textColors[idx % 2]} dark:text-opacity-80`}>{showMoney(member.aporte)}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-white/30">{member.percentage}%</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${colors[idx % 2]} transition-all duration-700`} style={{ width: barWidth }} />
                                    </div>
                                </div>
                            );
                        })}
                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-white/10">
                            <span className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-wide">Total compartido</span>
                            <span className={`text-base font-bold font-mono text-gray-900 dark:text-white ${privacyMode ? 'blur-sm' : ''}`}>{showMoney(splitData.grandTotal)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 text-center">
                        <div className="flex justify-center mb-2"><Wallet size={32} className="text-yellow-500 dark:text-yellow-400 drop-shadow-sm" /></div>
                        <p className="text-sm font-bold text-gray-700 dark:text-white/80 mb-1">Cargá los sueldos para ver el reparto</p>
                        <p className="text-xs text-gray-400 dark:text-white/40 mb-3">Cada uno tiene que ingresar su sueldo mensual neto para que podamos calcular cuánto le corresponde de cada gasto compartido.</p>
                        <button onClick={(e) => { e.stopPropagation(); setView('household'); }} className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600/80 dark:hover:bg-indigo-500/80 px-4 py-2 rounded-xl transition-colors dark:border dark:border-indigo-400/30">
                            Ir a Grupo Familiar →
                        </button>
                    </div>
                )}
            </div>
        ),


        cards: (
            <div>
                <div className="flex justify-between items-center px-2 mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><CreditCard size={18} /> Tus Tarjetas <span className="text-[9px] bg-gray-100 dark:bg-white/10 px-1.5 rounded text-gray-400 dark:text-white/40 font-normal">Desliza</span></h3>
                </div>

                <div className="flex overflow-x-auto gap-3 pb-8 px-2 snap-x snap-mandatory hide-scrollbar">
                    {cards.map((card) => {
                        const logo = getCardLogo(card.name);
                        return (
                            <div key={card.id} onClick={() => openCardModal(card)} className="cursor-pointer flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] shadow-lg p-5 text-white relative overflow-hidden snap-center transition-transform active:scale-95 group" style={{ background: `linear-gradient(135deg, ${card.color || '#1f2937'} 0%, ${card.color || '#111827'}DD 100%)` }}>

                                {/* Background Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>

                                {/* Header: Logo & Bank */}
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    {logo ? (
                                        <img src={logo} alt={card.name} className="h-6 object-contain filter drop-shadow-md brightness-200 contrast-200" loading="lazy" />
                                    ) : (
                                        <span className="font-bold text-lg tracking-wider uppercase opacity-90">{card.name}</span>
                                    )}
                                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono backdrop-blur-sm uppercase tracking-wide">{card.bank}</span>
                                </div>

                                {/* Info: Cierre y próximo vencimiento */}
                                <div className="relative z-10 flex gap-4 mb-4">
                                    <div>
                                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Cierre</p>
                                        <p className="font-mono text-sm font-bold opacity-90">Día {card.closeDay}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Vence</p>
                                        <p className="font-mono text-sm font-bold opacity-90">Día {card.dueDay}</p>
                                    </div>
                                </div>

                                {/* Footer: Resumen Mensual */}
                                <div className="absolute bottom-4 left-5 right-5 z-10 border-t border-white/20 pt-2 flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] opacity-70 uppercase mb-0.5 font-medium tracking-wide">Total a pagar</p>
                                        <p className="font-mono text-2xl font-bold tracking-tight text-shadow-sm">{card.monthlyStatements?.[targetMonthKey] ? showMoney(card.monthlyStatements[targetMonthKey].totalDue) : <span className="text-sm opacity-60">Sin resumen</span>}</p>
                                    </div>
                                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); openCardModal(card); }}>
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Card Placeholder */}
                    <div onClick={() => openCardModal(null)} className="flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-white/5 hover:border-gray-400 dark:hover:border-white/40 active:scale-95 transition-all snap-center group">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-400 dark:text-white/40 group-hover:bg-gray-200 dark:group-hover:bg-white/20 group-hover:text-gray-600 dark:group-hover:text-white/80 transition-colors">
                            <Plus size={24} />
                        </div>
                        <span className="text-gray-400 dark:text-white/40 font-bold text-sm group-hover:text-gray-600 dark:group-hover:text-white/80">Agregar Tarjeta</span>
                    </div>
                </div>
            </div>
        ),

        agenda: (
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mx-1 dark:backdrop-blur-md">
                <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-transparent cursor-pointer" onClick={() => setView('services_manager')}>
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><CalendarDays size={18} /> Agenda {currentDate.toLocaleString('es-AR', { month: 'long' })}</h3>
                    <span className="text-xs font-bold text-gray-400 dark:text-white/40">Ver todo →</span>
                </div>
                <div>
                    {agenda.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold ${item.day <= 5 ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/70'}`}><span className="text-sm">{item.day}</span><span className="text-[8px] uppercase">Día</span></div>
                                <div><p className="font-bold text-gray-800 dark:text-white/90 text-sm">{item.name}</p><p className="text-xs text-gray-400 dark:text-white/40">{item.type === 'card_item' ? 'Tarjeta Crédito' : 'Servicio'}</p></div>
                            </div>
                            <p className="font-mono font-bold text-gray-800 dark:text-white">{showMoney(item.amount)}</p>
                        </div>
                    ))}
                    {agenda.length === 0 && <div className="p-6 text-center text-gray-400 dark:text-white/40"><p className="text-xs flex items-center justify-center gap-1"><PartyPopper size={16} /> Nada pendiente este mes</p></div>}
                </div>
            </div>
        ),

        super_actions: (
            <div className="space-y-3 mx-1">
                <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setView('super')} className="bg-white dark:bg-[#0f0c29]/50 p-4 rounded-[24px] border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-500/50 transition-colors group flex flex-col justify-between h-32 dark:backdrop-blur-md">
                        <div className="flex justify-between items-start">
                            <div className="bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 p-2.5 rounded-xl">
                                <ShoppingCart size={24} />
                            </div>
                            {superData.percent > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">{Math.round(superData.percent)}%</span>}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 dark:text-white/40 font-bold uppercase mb-0.5">{superData.label}</p>
                            <p className={`text-xl font-bold ${superData.statusColor === 'text-gray-900' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'}`}>{showMoney(superData.showAmount)}</p>
                        </div>
                    </div>

                    <div onClick={() => setView('purchase')} className="bg-gray-900 dark:bg-white/10 p-4 rounded-[24px] shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between group h-32 dark:backdrop-blur-md dark:border dark:border-white/10">
                        <div className="bg-gray-700 dark:bg-white/10 w-fit p-2.5 rounded-xl text-white group-hover:bg-gray-600 dark:group-hover:bg-white/20 transition-colors">
                            <Plus size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 dark:text-white/60 font-bold uppercase mb-0.5">Acción Rápida</p>
                            <p className="text-xl font-bold text-white">Registrar Gasto</p>
                        </div>
                    </div>
                </div>

                <div onClick={() => setView('fresh')} className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-500/20 p-4 rounded-[24px] cursor-pointer hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 active:scale-95 transition-all flex items-center justify-between group shadow-sm dark:backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                            <LayoutList size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white text-sm">Planificador</p>
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Proyectos · Verdulería · Categorías</p>
                        </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-white/20 group-hover:text-green-500 dark:group-hover:text-green-400 group-hover:translate-x-1 transition-all"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </div>
        )
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
                    <button onClick={() => setView('reconcile')} className="bg-green-50 text-green-600 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-500/20 dark:hover:text-green-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5" title="Conciliar Consumos">
                        <Receipt size={20} />
                    </button>
                    <button onClick={() => setView('household')} className="bg-blue-50 text-blue-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 dark:hover:text-blue-200 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5">
                        <Users size={20} />
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
                {order.map((key) => (
                    <div key={key} {...getDragProps(key)} className={`transition-all duration-300 ${draggingItem === key ? 'opacity-50 scale-95 cursor-grabbing' : 'cursor-grab'}`}>
                        <div className="flex justify-center -mb-2 opacity-0 hover:opacity-100 transition-opacity"><div className="w-10 h-1 bg-gray-200 rounded-full"></div></div>
                        {WIDGETS[key]}
                    </div>
                ))}
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

            {/* TOGGLE TEMA (FULL WIDTH) */}
            <button
                onClick={onToggleTheme}
                className="w-full py-4 mt-6 rounded-full border border-gray-100 dark:border-white/10 text-gray-400 dark:text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-white/80 transition-all flex items-center justify-center gap-2"
            >
                <Moon size={16} className="dark:hidden" />
                <span className="dark:hidden">Cambiar a Modo Noche</span>
                <Moon size={16} className="hidden dark:block text-yellow-300" />
                <span className="hidden dark:block">Volver a Modo Día</span>
            </button>

            {/* --- MODAL PARA TARJETAS --- */}
            <CardDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                card={selectedCardForModal}
                privacyMode={privacyMode}
                householdId={householdId}
                currentDate={currentDate}
            />

        </div>
    );
});

export default Home;