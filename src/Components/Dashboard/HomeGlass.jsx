import React, { useState, useMemo, useEffect, memo } from 'react';
import GlassCard from '../UI/GlassCard';
import CardDetailModal from '../Cards/CardDetailModal';
import { useDragReorder } from '../../hooks/useDragReorder';
import { TargetWidget, CardsWidget, AgendaWidget, SuperActionsWidget } from './HomeGlassWidgets';
import { ReconciliationWidget } from './ReconciliationWidget';
import { formatMoney } from '../../utils';
import { calcularProporciones, getLatestSalary, calcularAporte } from '../../utils/salaryUtils';

// [SAFE MODE] 
// Fase 5: Data Binding (Conectando info real)

const HomeGlass = memo(({ transactions = [], cards = [], supermarketItems = [], services = [], currentDate, user, onToggleTheme, setView, privacyMode, onLogout, householdId, householdMembers = [] }) => {

    // ESTADO PARA GESTIÓN DE TARJETAS
    const [cardToEdit, setCardToEdit] = useState(null); // null, 'NEW', or card object
    const [isModalOpen, setIsModalOpen] = useState(false);







    const handleEditCard = (card) => {
        setCardToEdit(card);
        setIsModalOpen(true);
    };

    const handleNewCard = () => {
        setCardToEdit(null);
        setIsModalOpen(true);
    };

    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);


    // 1. CLAVE DE MES ACTUAL
    const targetMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // 2. CÁLCULOS DE TARJETAS (Deuda Real)
    const cardsWithDebt = useMemo(() => {
        if (!currentDate) return [];
        const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();

        return cards.map(card => {
            // PRIORIDAD 1: Resumen manual (nuevo sistema: monthlyStatements)
            const statementAmount = card.monthlyStatements?.[targetMonthKey]?.totalDue;
            // PRIORIDAD 2: Ajuste manual (viejo sistema: adjustments)
            const adjustmentAmount = card.adjustments?.[targetMonthKey];
            
            let debt = 0;

            if (statementAmount !== undefined) {
                debt = statementAmount;
            } else if (adjustmentAmount !== undefined) {
                debt = adjustmentAmount;
            } else {
                // FALLBACK: Cálculo automático por transacciones
                debt = transactions
                    .filter(t => t.cardId === card.id && t.type !== 'cash')
                    .reduce((acc, t) => {
                        const tDate = new Date(t.date);
                        const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                        const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                        const endMonthVal = startMonthVal + (t.installments || 1);
                        if (targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal) {
                            return acc + Number(t.monthlyInstallment);
                        }
                        return acc;
                    }, 0);
            }
            return { ...card, currentDebt: debt };
        });
    }, [cards, transactions, currentDate, targetMonthKey]);

    // 3. CÁLCULO SUPERMERCADO
    const superData = useMemo(() => {
        const monthlyItems = supermarketItems.filter(item => {
            if (item.month) return item.month === targetMonthKey;
            const realNow = new Date();
            const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
            return targetMonthKey === realKey;
        });
        const totalBudget = monthlyItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const realSpent = monthlyItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
        return { totalBudget, realSpent, showAmount: (monthlyItems.some(i => i.checked) ? realSpent : totalBudget), label: (monthlyItems.some(i => i.checked) ? 'En Carrito' : 'Presupuesto') };
    }, [supermarketItems, targetMonthKey]);

    // 4. CÁLCULO TOTALES (Target) - Forzamos Number para evitar errores de concatenación o NaN
    const totalNeed = services.reduce((acc, s) => acc + (Number(s.amount) || 0), 0) + 
                      cardsWithDebt.reduce((acc, c) => acc + (Number(c.currentDebt) || 0), 0) + 
                      (Number(superData.totalBudget) || 0);

    const totalPaid = services.filter(s => s.paidPeriods?.includes(targetMonthKey)).reduce((acc, s) => acc + (Number(s.amount) || 0), 0) + 
                      cardsWithDebt.filter(c => c.paidPeriods?.includes(targetMonthKey)).reduce((acc, c) => acc + (Number(c.currentDebt) || 0), 0) + 
                      (Number(superData.realSpent) || 0);

    const percentage = totalNeed > 0 ? Math.round((totalPaid / totalNeed) * 100) : 0;
    const pendingAmount = Math.max(0, totalNeed - totalPaid);

    // 5. AGENDA (Próximos Vencimientos)
    const agenda = useMemo(() => {
        const realServices = services.map(s => ({ id: s.id, name: s.name, amount: s.amount, day: s.day, isPaid: s.paidPeriods?.includes(targetMonthKey) || false, type: 'service' }));
        const cardServices = cardsWithDebt.filter(c => c.currentDebt > 0).map(c => ({
            id: c.id, name: c.name, amount: c.currentDebt, day: c.dueDay || 10, isPaid: c.paidPeriods?.includes(targetMonthKey) || false, type: 'card', bank: c.bank
        }));

        return [...realServices, ...cardServices]
            .sort((a, b) => a.day - b.day)
            .filter(item => !item.isPaid)
            .slice(0, 5); // Mostrar hasta 5 items
    }, [services, cardsWithDebt, targetMonthKey]);

    // 6. ALERTA CRÍTICA (Unificando con Home.jsx)
    const criticalAlert = useMemo(() => {
        const firstItem = agenda[0];
        if (firstItem && firstItem.day <= 5) {
            return { active: true, msg: `Vencimiento próx: ${firstItem.name} (Día ${firstItem.day})`, amount: firstItem.amount };
        }
        return { active: false };
    }, [agenda]);

    /* --- CONFIGURACIÓN DRAG & DROP --- */
    const DEFAULT_ORDER = ['target', 'split_summary', 'cards', 'agenda', 'super_actions', 'reconciliation'];
    const getInitialOrder = () => {
        const saved = localStorage.getItem('widget_order');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const hasAll = DEFAULT_ORDER.every(k => parsed.includes(k));
                if (hasAll && parsed.length === DEFAULT_ORDER.length) return parsed;
                if (!parsed.includes('reconciliation') || !parsed.includes('split_summary')) return DEFAULT_ORDER;
                return parsed;
            } catch (e) { console.error("Error leyendo orden", e); }
        }
        return DEFAULT_ORDER;
    };
    const { order, getDragProps, draggingItem } = useDragReorder(getInitialOrder());
    useEffect(() => { localStorage.setItem('widget_order', JSON.stringify(order)); }, [order]);


    /* --- CÁLCULO REPARTO PROPORCIONAL --- */
    const splitData = useMemo(() => {
        if (!householdMembers || householdMembers.length < 2) return null;
        const allHaveSalary = householdMembers.every(m => getLatestSalary(m.salaryHistory) > 0);
        if (!allHaveSalary) return null;

        const proporciones = calcularProporciones(householdMembers.map(m => ({
            uid: m.uid,
            displayName: m.displayName,
            salaryHistory: m.salaryHistory || []
        })));

        const sharedServicesTotal = services.filter(s => s.isShared !== false).reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const sharedCardsTotal = cardsWithDebt.filter(c => c.isShared !== false).reduce((acc, c) => acc + Number(c.currentDebt || 0), 0);
        const sharedSuperTotal = supermarketItems.filter(i => i.month === targetMonthKey && i.isShared !== false).reduce((acc, i) => acc + Number((i.price || 0) * (i.quantity || 1)), 0);
        const grandTotal = sharedServicesTotal + sharedCardsTotal + sharedSuperTotal;

        const breakdown = proporciones.map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            proportion: p.proportion,
            percentage: p.percentage,
            aporte: calcularAporte(grandTotal, p.proportion)
        }));

        return { grandTotal, breakdown };
    }, [householdMembers, services, cardsWithDebt, supermarketItems, targetMonthKey]);

    /* --- WIDGETS DEFINITIONS --- */
    /* --- WIDGETS DEFINITIONS (Memoized to prevent re-renders) --- */
    const widgetsMap = useMemo(() => {
        const SplitWidget = householdMembers.length >= 2 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden mx-1">
                <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-white text-sm">⚖️ Reparto del Mes</h3>
                        <p className="text-[10px] text-white/40 font-medium capitalize">{currentDate?.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <button onClick={() => setView('household')} className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-full transition-colors border border-emerald-500/20">
                        ✏️ Sueldos
                    </button>
                </div>

                {splitData ? (
                    <div className="p-4 space-y-3">
                        {splitData.breakdown.map((member, idx) => {
                            const isMe = member.uid === user?.uid;
                            const barWidth = `${member.percentage}%`;
                            const gradients = ['from-indigo-500 to-purple-500', 'from-emerald-500 to-teal-500'];
                            const textColors = ['text-indigo-300', 'text-emerald-300'];
                            return (
                                <div key={member.uid}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradients[idx % 2]} flex items-center justify-center text-white text-[10px] font-bold`}>
                                                {(member.displayName || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-semibold text-white/80">
                                                {member.displayName?.split(' ')[0]}
                                                {isMe && <span className="ml-1 text-[9px] text-blue-300 font-bold">VOS</span>}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold font-mono ${privacyMode ? 'blur-sm' : ''} ${textColors[idx % 2]}`}>{privacyMode ? '****' : formatMoney(member.aporte)}</p>
                                            <p className="text-[10px] text-white/30">{member.percentage}%</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${gradients[idx % 2]} transition-all duration-700`} style={{ width: barWidth }} />
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex justify-between items-center pt-3 border-t border-white/10">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wide">Total compartido</span>
                            <span className={`text-base font-bold font-mono text-white ${privacyMode ? 'blur-sm' : ''}`}>{privacyMode ? '****' : formatMoney(splitData.grandTotal)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 text-center">
                        <p className="text-2xl mb-2">💰</p>
                        <p className="text-sm font-bold text-white/80 mb-1">Cargá los sueldos para ver el reparto</p>
                        <p className="text-xs text-white/40 mb-3">Cada uno tiene que ingresar su sueldo mensual neto.</p>
                        <button onClick={() => setView('household')} className="text-sm font-bold text-white bg-indigo-600/80 hover:bg-indigo-500/80 px-4 py-2 rounded-xl transition-colors border border-indigo-400/30">
                            Ir a Grupo Familiar →
                        </button>
                    </div>
                )}
            </div>
        ) : null;

        return {
            target: <TargetWidget pendingAmount={pendingAmount} totalNeed={totalNeed} totalPaid={totalPaid} percentage={percentage} privacyMode={privacyMode} />,
            split_summary: SplitWidget,
            cards: <CardsWidget cardsWithDebt={cardsWithDebt} handleEditCard={handleEditCard} handleNewCard={handleNewCard} privacyMode={privacyMode} targetMonthKey={targetMonthKey} />,
            agenda: <AgendaWidget agenda={agenda} setView={setView} privacyMode={privacyMode} />,
            super_actions: <SuperActionsWidget superData={superData} setView={setView} privacyMode={privacyMode} />,
            reconciliation: <ReconciliationWidget setView={setView} privacyMode={privacyMode} />
        };
    }, [pendingAmount, totalNeed, totalPaid, percentage, privacyMode, cardsWithDebt, agenda, superData, splitData, householdMembers]);

    /* --- RENDERIZADO --- */

    return (
        <div className="space-y-6 animate-fade-in pb-8">

            {/* 1. Header (Simplificado por ahora) */}
            <div className="flex justify-between items-center px-2 pt-2 text-white">
                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Tu Panel</span>
                    <h1 className="text-xl font-bold">Hola, {user?.displayName?.split(' ')[0] || 'Nico'} 👋</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('reconcile')} className="bg-white/10 text-white/70 p-2 rounded-full hover:bg-green-500/20 hover:text-green-200 transition-colors backdrop-blur-md border border-white/5" title="Conciliar Consumos">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </button>
                    <button onClick={() => setView('household')} className="bg-white/10 text-white/70 p-2 rounded-full hover:bg-blue-500/20 hover:text-blue-200 transition-colors backdrop-blur-md border border-white/5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </button>
                    <button onClick={onLogout} className="bg-white/10 text-white/70 p-2 rounded-full hover:bg-red-500/20 hover:text-red-200 transition-colors backdrop-blur-md border border-white/5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            {/* ALERTA CRÍTICA */}
            {criticalAlert.active && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-[24px] flex items-center justify-between mx-1 backdrop-blur-md animate-pulse shadow-lg shadow-red-900/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/20 p-2 rounded-full text-red-200 border border-red-500/30">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-100">{criticalAlert.msg}</p>
                            <p className="text-xs text-red-300/80 font-medium cursor-pointer hover:text-white transition-colors underline decoration-red-300/50" onClick={() => setView('services_manager')}>Ir a pagar ahora</p>
                        </div>
                    </div>
                    <p className="font-bold text-red-100">{privacyMode ? '****' : formatMoney(criticalAlert.amount)}</p>
                </div>
            )}

            {/* WIDGETS REORDERABLE VIEW */}
            <div className="space-y-6">
                {order.map((key) => (
                    <div key={key} {...getDragProps(key)} className={`transition-all duration-300 ${draggingItem === key ? 'opacity-50 scale-95 cursor-grabbing' : 'cursor-grab'}`}>
                        {/* Drag Handle Indicator */}
                        <div className="flex justify-center -mb-2 opacity-0 hover:opacity-100 transition-opacity"><div className="w-10 h-1 bg-white/20 rounded-full"></div></div>
                        {widgetsMap[key]}
                    </div>
                ))}
            </div>

            {/* 6. Botón Análisis Completo */}
            <button onClick={() => setView('stats')} className="w-full h-20 mx-1 rounded-2xl relative overflow-hidden group shadow-lg shadow-black/20 active:scale-95 transition-all border border-white/10 mt-2">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 via-purple-600/50 to-indigo-600/50 bg-[length:200%_auto] animate-gradient-x opacity-100 transition-opacity backdrop-blur-md"></div>
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white gap-1">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <span className="font-bold text-base tracking-wide shadow-black/50 drop-shadow-md">Ver Análisis Completo</span>
                    </div>
                    <span className="text-[10px] opacity-70 uppercase tracking-widest font-medium">Estadísticas & Proyecciones</span>
                </div>
            </button>

            {/* 7. Toggle de Tema (Bottom) */}
            <button
                onClick={onToggleTheme}
                className="w-full py-4 mt-4 rounded-full border border-white/10 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white/80 transition-all flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Volver al Modo Clásico
            </button>

            {/* MODAL DE TARJETAS */}
            <CardDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                card={cardToEdit}
                privacyMode={privacyMode}
                isGlass={true}
                householdId={householdId}
                currentDate={currentDate}
            />

        </div>

    );
});

export default HomeGlass;
