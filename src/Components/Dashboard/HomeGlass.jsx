import React, { useState, useMemo, useEffect } from 'react';
import GlassCard from '../GlassCard';
import CardDetailModal from '../Cards/CardDetailModal';
import { useDragReorder } from '../../hooks/useDragReorder';

// [SAFE MODE] 
// Fase 5: Data Binding (Conectando info real)
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

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
    const WIDGETS = {

        target: (
            <div className="transition-all duration-300">
                <GlassCard className="p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                        {/* IZQUIERDA: DATOS */}
                        <div className="flex flex-col gap-6">
                            {/* 1. Título y Monto Principal */}
                            <div>
                                <h3 className="text-[10px] font-normal text-white/70 uppercase tracking-widest mb-1">Meta Mensual</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-light text-white tracking-tight drop-shadow-md">{privacyMode ? '****' : formatMoney(pendingAmount)}</span>
                                    <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-medium text-red-100 uppercase tracking-wide backdrop-blur-md">
                                        Falta Cubrir
                                    </span>
                                </div>
                            </div>

                            {/* 2. Sub-datos (Total vs Pagado) */}
                            <div className="flex items-center gap-6">
                                <div>
                                    <span className="text-[10px] font-normal text-white/50 uppercase block mb-0.5">Total a Pagar</span>
                                    <span className="text-lg font-light text-white tracking-tight">{privacyMode ? '****' : formatMoney(totalNeed)}</span>
                                </div>
                                <div className="h-8 w-px bg-white/10"></div> {/* Separador Vertical */}
                                <div>
                                    <span className="text-[10px] font-normal text-white/50 uppercase block mb-0.5">Ya Pagado</span>
                                    <span className="text-lg font-light text-emerald-300 tracking-tight drop-shadow-sm">{privacyMode ? '****' : formatMoney(totalPaid)}</span>
                                </div>
                            </div>
                        </div>

                        {/* DERECHA: GRÁFICO CIRCULAR */}
                        <div className="relative w-28 h-28 flex-shrink-0">
                            <svg className="transform -rotate-90 w-full h-full drop-shadow-xl">
                                <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                                <circle cx="56" cy="56" r="48" stroke="url(#gradientGlass2)" strokeWidth="6" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 48}
                                    strokeDashoffset={(2 * Math.PI * 48) * (1 - (percentage / 100))}
                                    strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="gradientGlass2" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-light text-white leading-none">{percentage}%</span>
                                <span className="text-[8px] font-normal text-white/50 uppercase mt-0.5">Pago</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        ),

        cards: (
            <div>
                <div className="flex justify-between items-center px-2 mb-3 text-white">
                    <h3 className="font-bold text-sm flex items-center gap-2 drop-shadow-sm">💳 Tus Tarjetas</h3>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 px-2 snap-x snap-mandatory hide-scrollbar">
                    {cardsWithDebt.map((card) => {
                        const getCardLogo = (name) => {
                            const n = (name || '').toLowerCase();
                            if (n.includes('visa')) return '/logos/visa.png';
                            if (n.includes('master')) return '/logos/mastercard.png';
                            if (n.includes('amex') || n.includes('american')) return '/logos/amex.png';
                            return null;
                        };
                        const logo = getCardLogo(card.name);

                        return (
                            <div
                                key={card.id}
                                onClick={() => handleEditCard(card)}
                                className="flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] p-5 text-white relative overflow-hidden snap-center border border-white/10 shadow-2xl shadow-black/5 backdrop-blur-2xl transition-transform active:scale-95 cursor-pointer hover:border-white/20 group"
                                style={{ background: `linear-gradient(135deg, ${card.color}66 0%, ${card.color}33 100%)` }}
                            >
                                {/* Brillo interno */}
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                                {/* Header: Logo & Bank */}
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    {logo ? (
                                        <img src={logo} alt={card.name} className="h-6 object-contain filter brightness-200 contrast-200 drop-shadow-sm" loading="lazy" />
                                    ) : (
                                        <span className="font-bold text-lg tracking-wider uppercase opacity-90 drop-shadow-sm">{card.name}</span>
                                    )}
                                    <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono backdrop-blur-md border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">{card.bank}</span>
                                </div>

                                {/* Info: Limits & Closing */}
                                <div className="relative z-10 flex gap-4 mb-3">
                                    <div>
                                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5 font-medium">Lim. Financiación</p>
                                        <p className="font-mono text-xs font-bold opacity-90">{privacyMode ? '****' : formatMoney(card.limit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5 font-medium">Cierre</p>
                                        <p className="font-mono text-xs font-bold opacity-90">Día {card.closeDay}</p>
                                    </div>
                                </div>

                                {/* Footer: Current Debt & Edit */}
                                <div className="absolute bottom-4 left-5 right-5 z-10 border-t border-white/10 pt-2 flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] opacity-70 uppercase mb-0.5 font-medium tracking-wide">A pagar este mes</p>
                                        <p className="font-mono text-2xl font-light tracking-tight drop-shadow-md text-white">{privacyMode ? '****' : formatMoney(card.currentDebt)}</p>
                                    </div>
                                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-md border border-white/5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleEditCard(card); }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Botón Nueva Tarjeta en el Slider */}
                    <button
                        onClick={handleNewCard}
                        className="flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-white/30 hover:text-white/60 hover:border-white/30 hover:bg-white/5 transition-all snap-center active:scale-95"
                    >
                        <div className="w-12 h-12 rounded-full border border-current flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="text-sm font-medium uppercase tracking-widest">Nueva Tarjeta</span>
                    </button>
                </div>
            </div>
        ),

        agenda: (
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 mx-1">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-white text-sm">📅 Próximos Vencimientos</h3>
                    <button onClick={() => setView('services_manager')} className="text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors">Ver Todo</button>
                </div>
                {agenda.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors rounded-lg px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center bg-white/10 text-white font-medium text-xs">
                                <span>{item.day}</span>
                            </div>
                            <div>
                                <p className="font-medium text-white text-sm">{item.name}</p>
                                <p className="text-xs text-white/50">{item.type === 'card' ? 'Tarjeta' : 'Servicio'}</p>
                            </div>
                        </div>
                        <p className="font-mono font-light text-white">{privacyMode ? '****' : formatMoney(item.amount)}</p>
                    </div>
                ))}
            </div>
        ),

        super_actions: (
            <div className="grid grid-cols-2 gap-3 mx-1">
                <button onClick={() => setView('super')} className="bg-white/5 p-4 rounded-[24px] border border-white/10 backdrop-blur-md flex flex-col justify-between h-32 active:scale-95 transition-all text-left group hover:bg-white/10">
                    <div className="bg-purple-500/20 text-purple-200 border border-purple-500/30 w-fit p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-white/50 font-bold uppercase mb-0.5">{superData.label || 'Supermercado'}</p>
                        <p className="text-xl font-light text-white">{privacyMode ? '****' : formatMoney(superData.showAmount || 0)}</p>
                    </div>
                </button>

                <button onClick={() => setView('purchase')} className="bg-white/10 p-4 rounded-[24px] border border-white/20 backdrop-blur-xl shadow-lg flex flex-col justify-between h-32 active:scale-95 transition-all text-left group hover:bg-white/20">
                    <div className="bg-white/20 w-fit p-2.5 rounded-xl text-white border border-white/10 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-white/50 font-bold uppercase mb-0.5">Nuevo Gasto</p>
                        <p className="text-xl font-light text-white">Registrar</p>
                    </div>
                </button>
            </div>
        )
    };

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
                        {WIDGETS[key]}
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
