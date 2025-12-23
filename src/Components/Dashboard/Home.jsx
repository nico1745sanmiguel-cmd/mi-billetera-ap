import React, { useMemo, useEffect, useState } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget';
import CardDetailModal from '../Cards/CardDetailModal';
import { useDragReorder } from '../../hooks/useDragReorder';

export default function Home({ transactions, cards, supermarketItems = [], services = [], privacyMode, setView, onLogout, currentDate, user, onToggleTheme, householdId }) {

    const [selectedCardForModal, setSelectedCardForModal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Clave del mes seleccionado
    const targetMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const openCardModal = (card) => {
        setSelectedCardForModal(card);
        setIsModalOpen(true);
    };

    // --- 1. CONFIGURACIÓN DRAG & DROP ---
    const DEFAULT_ORDER = ['target', 'cards', 'agenda', 'super_actions'];
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


    // --- 2. CÁLCULOS ---

    // A. Tarjetas (Con Logos y Deuda)
    const cardsWithDebt = useMemo(() => {
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

    // Helper Logos
    const getCardLogo = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('visa')) return '/logos/visa.png';
        if (n.includes('master')) return '/logos/mastercard.png';
        if (n.includes('amex') || n.includes('american')) return '/logos/amex.png';
        return null;
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
            .slice(0, 3);
    }, [services, cardsWithDebt, targetMonthKey]);

    // Totales
    const totalNeed = services.reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0) + superData.totalBudget;
    const totalPaid = services.filter(s => s.paidPeriods?.includes(targetMonthKey)).reduce((acc, s) => acc + s.amount, 0) + cardsWithDebt.filter(c => c.paidPeriods?.includes(targetMonthKey)).reduce((acc, c) => acc + c.currentDebt, 0) + superData.realSpent;
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const criticalAlert = useMemo(() => {
        const firstItem = agenda[0];
        if (firstItem && firstItem.day <= 5) {
            return { active: true, msg: `Vencimiento próx: ${firstItem.name} (Día ${firstItem.day})`, amount: firstItem.amount };
        }
        return { active: false };
    }, [agenda]);


    // --- 3. DICCIONARIO DE WIDGETS ---
    const WIDGETS = {
        target: (
            <div className={`transition-all duration-300 ${privacyMode ? 'opacity-50 blur-sm pointer-events-none select-none' : 'opacity-100'}`}>
                <FinancialTarget totalNeed={totalNeed} totalPaid={totalPaid} privacyMode={privacyMode} />
                {privacyMode && <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 z-10">Vista Privada</div>}
            </div>
        ),

        cards: (
            <div>
                <div className="flex justify-between items-center px-2 mb-3">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">💳 Tus Tarjetas <span className="text-[9px] bg-gray-100 px-1.5 rounded text-gray-400 font-normal">Desliza</span></h3>
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

                                {/* Info: Limits & Closing */}
                                <div className="relative z-10 flex gap-4 mb-4">
                                    <div>
                                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Lim. Financiación</p>
                                        <p className="font-mono text-sm font-bold opacity-90">{showMoney(card.limit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Cierre</p>
                                        <p className="font-mono text-sm font-bold opacity-90">Día {card.closeDay}</p>
                                    </div>
                                </div>

                                {/* Footer: Current Debt */}
                                <div className="absolute bottom-4 left-5 right-5 z-10 border-t border-white/20 pt-2 flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] opacity-70 uppercase mb-0.5 font-medium tracking-wide">A pagar este mes</p>
                                        <p className="font-mono text-2xl font-bold tracking-tight text-shadow-sm">{showMoney(cardsWithDebt.find(c => c.id === card.id)?.currentDebt || 0)}</p>
                                    </div>
                                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); openCardModal(card); }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Card Placeholder */}
                    <div onClick={() => openCardModal(null)} className="flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white hover:border-gray-400 active:scale-95 transition-all snap-center group">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="text-gray-400 font-bold text-sm group-hover:text-gray-600">Agregar Tarjeta</span>
                    </div>
                </div>
            </div>
        ),

        agenda: (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mx-1">
                <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 cursor-pointer" onClick={() => setView('services_manager')}>
                    <h3 className="font-bold text-gray-800 text-sm">📅 Agenda {currentDate.toLocaleString('es-AR', { month: 'long' })}</h3>
                    <span className="text-xs font-bold text-gray-400">Ver todo →</span>
                </div>
                <div>
                    {agenda.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold ${item.day <= 5 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}><span className="text-sm">{item.day}</span><span className="text-[8px] uppercase">Día</span></div>
                                <div><p className="font-bold text-gray-800 text-sm">{item.name}</p><p className="text-xs text-gray-400">{item.type === 'card_item' ? 'Tarjeta Crédito' : 'Servicio'}</p></div>
                            </div>
                            <p className="font-mono font-bold text-gray-800">{showMoney(item.amount)}</p>
                        </div>
                    ))}
                    {agenda.length === 0 && <div className="p-6 text-center text-gray-400"><p className="text-xs">🎉 Nada pendiente este mes</p></div>}
                </div>
            </div>
        ),

        super_actions: (
            <div className="grid grid-cols-2 gap-3 mx-1">
                <div onClick={() => setView('super')} className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm cursor-pointer hover:border-purple-200 transition-colors group flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        {superData.percent > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">{Math.round(superData.percent)}%</span>}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">{superData.label}</p>
                        <p className={`text-xl font-bold ${superData.statusColor}`}>{showMoney(superData.showAmount)}</p>
                    </div>
                </div>

                <div onClick={() => setView('purchase')} className="bg-gray-900 p-4 rounded-[24px] shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between group h-32">
                    <div className="bg-gray-700 w-fit p-2.5 rounded-xl text-white group-hover:bg-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">Acción Rápida</p>
                        <p className="text-xl font-bold text-white">Registrar Gasto</p>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">

            <div className="flex justify-between items-center px-2 pt-2">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tu Panel</span>
                    <h1 className="text-xl font-bold text-gray-800">
                        Hola, {user?.displayName?.split(' ')[0] || 'Nico'} 👋
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('household')} className="bg-blue-50 text-blue-500 p-2 rounded-full hover:bg-blue-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </button>
                    <button onClick={onLogout} className="bg-gray-50 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            {criticalAlert.active && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse">
                    <div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-full text-red-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-sm font-bold text-red-800">{criticalAlert.msg}</p><p className="text-xs text-red-600 font-medium cursor-pointer underline" onClick={() => setView('services_manager')}>Ir a pagar ahora</p></div></div><p className="font-bold text-red-800">{showMoney(criticalAlert.amount)}</p>
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <span className="font-bold text-base tracking-wide">Ver Análisis Completo</span>
                    </div>
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-medium">Estadísticas & Proyecciones</span>
                </div>
            </button>

            {/* TOGGLE TEMA (FULL WIDTH) */}
            <button
                onClick={onToggleTheme}
                className="w-full py-4 mt-6 rounded-full border border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                Cambiar a Modo Noche
            </button>

            {/* --- MODAL PARA TARJETAS --- */}
            <CardDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                card={selectedCardForModal}
                privacyMode={privacyMode}
                householdId={householdId}
            />

        </div>
    );
}