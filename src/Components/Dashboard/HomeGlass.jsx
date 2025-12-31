import React, { useState, useMemo, useEffect } from 'react';
import GlassCard from '../UI/GlassCard';
import CardDetailModal from '../Cards/CardDetailModal';
import { useDragReorder } from '../../hooks/useDragReorder';
import { TargetWidget, CardsWidget, AgendaWidget, SuperActionsWidget } from './HomeGlassWidgets';
import { formatMoney } from '../../utils';

// [SAFE MODE] 
// Fase 5: Data Binding (Conectando info real)

export default function HomeGlass({ transactions = [], cards = [], supermarketItems = [], services = [], currentDate, user, onToggleTheme, setView, privacyMode, onLogout, householdId }) {

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
            const manualAmount = card.adjustments?.[targetMonthKey];
            let debt = 0;

            if (manualAmount !== undefined) {
                debt = manualAmount;
            } else {
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

    // 4. CÁLCULO TOTALES (Target)
    const totalNeed = services.reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0) + superData.totalBudget;
    const totalPaid = services.filter(s => s.paidPeriods?.includes(targetMonthKey)).reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.filter(c => c.paidPeriods?.includes(targetMonthKey)).reduce((acc, c) => acc + c.currentDebt, 0) + superData.realSpent;
    const percentage = totalNeed > 0 ? Math.round((totalPaid / totalNeed) * 100) : 0;
    const pendingAmount = totalNeed - totalPaid;

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
    const DEFAULT_ORDER = ['target', 'cards', 'agenda', 'super_actions']; // Reverted
    const getInitialOrder = () => {
        const saved = localStorage.getItem('widget_order');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.length === DEFAULT_ORDER.length) return parsed;
            } catch (e) { console.error("Error leyendo orden", e); }
        }
        return DEFAULT_ORDER;
    };
    const { order, getDragProps, draggingItem } = useDragReorder(getInitialOrder());
    useEffect(() => { localStorage.setItem('widget_order', JSON.stringify(order)); }, [order]);


    /* --- WIDGETS DEFINITIONS --- */
    /* --- WIDGETS DEFINITIONS (Memoized to prevent re-renders) --- */
    const widgetsMap = useMemo(() => ({
        target: <TargetWidget pendingAmount={pendingAmount} totalNeed={totalNeed} totalPaid={totalPaid} percentage={percentage} privacyMode={privacyMode} />,
        cards: <CardsWidget cardsWithDebt={cardsWithDebt} handleEditCard={handleEditCard} handleNewCard={handleNewCard} privacyMode={privacyMode} />,
        agenda: <AgendaWidget agenda={agenda} setView={setView} privacyMode={privacyMode} />,
        super_actions: <SuperActionsWidget superData={superData} setView={setView} privacyMode={privacyMode} />
    }), [pendingAmount, totalNeed, totalPaid, percentage, privacyMode, cardsWithDebt, agenda, superData]);

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
            />

        </div>

    );
}
