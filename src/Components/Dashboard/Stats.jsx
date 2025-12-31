import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const CAT_LABELS = {
    'supermarket': 'Supermercado',
    'health': 'Salud',
    'food': 'Comida',
    'transport': 'Transporte',
    'services': 'Servicios',
    'shopping': 'Compras',
    'home': 'Hogar',
    'education': 'Educación',
    'varios': 'Varios'
};

const CAT_ICONS = {
    'supermarket': '🛒',
    'health': '🩺',
    'food': '🍔',
    'transport': '🚕',
    'services': '💡',
    'shopping': '🛍️',
    'home': '🏠',
    'education': '📚',
    'varios': '📦'
};

// Componente simple de Gráfico de Donas SVG
const DonutChart = ({ data, size = 150 }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let currentAngle = 0;

    if (total === 0) return <div className="w-full text-center text-gray-400 text-xs">Sin datos</div>;

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} viewBox="0 0 40 40" className="rotate-[-90deg]">
                {data.map((item, index) => {
                    const sliceAngle = (item.value / total) * 360;
                    const dashArray = `${(sliceAngle / 360) * 100} 100`; // Circunferencia aprox 100
                    const offset = currentAngle; // Offset porcentual
                    const color = item.color;
                    currentAngle -= (sliceAngle / 360) * 100;
                    return (
                        <circle
                            key={index}
                            cx="20" cy="20" r="15.91549430918954"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={offset}
                        />
                    );
                })}
            </svg>
            {/* Texto Central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[8px] uppercase opacity-60">Total Fijo</span>
                <span className="text-xs font-bold">{formatMoney(total).split(',')[0]}</span>
            </div>
        </div>
    );
};

// Mapa de colores para mosaico (índigo variantes)
const MOSAIC_COLORS = ['bg-indigo-600', 'bg-indigo-500', 'bg-purple-500', 'bg-indigo-400', 'bg-purple-400'];

export default function Stats({ transactions = [], cards = [], services = [], privacyMode, currentDate, isGlass }) {

    const [expandedCardId, setExpandedCardId] = useState(null);
    const [categoryView, setCategoryView] = useState('list'); // 'list' | 'map'

    // 1. CLAVE DEL MES
    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // =================================================================
    // CÁLCULOS
    // =================================================================

    // A. Transacciones del Mes
    const monthlyTransactions = useMemo(() => {
        const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            if (t.type === 'cash') {
                return tLocal.getMonth() === currentDate.getMonth() && tLocal.getFullYear() === currentDate.getFullYear();
            }
            const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
            const endMonthVal = startMonthVal + (t.installments || 1);
            return targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal;
        }).map(t => ({
            ...t,
            displayAmount: t.type === 'cash' ? t.amount : t.monthlyInstallment
        }));
    }, [transactions, currentDate]);

    // B. Total Gastado Este Mes
    const totalMonthSpent = useMemo(() => {
        return monthlyTransactions.reduce((acc, t) => acc + t.displayAmount, 0);
    }, [monthlyTransactions]);

    // C. Proyección Mes Siguiente
    const nextMonthCommitted = useMemo(() => {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const targetMonthVal = nextMonth.getFullYear() * 12 + nextMonth.getMonth();
        const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

        let total = 0;
        cards.forEach(c => {
            if (c.adjustments?.[nextMonthKey] !== undefined) {
                total += c.adjustments[nextMonthKey];
            } else {
                const cardDebt = transactions
                    .filter(t => t.cardId === c.id && t.type !== 'cash')
                    .reduce((acc, t) => {
                        const tDate = new Date(t.date);
                        const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                        const startVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                        const endVal = startVal + t.installments;
                        if (targetMonthVal >= startVal && targetMonthVal < endVal) { return acc + t.monthlyInstallment; }
                        return acc;
                    }, 0);
                total += cardDebt;
            }
        });
        const servicesTotal = services.reduce((acc, s) => acc + s.amount, 0);
        return total + servicesTotal;
    }, [transactions, currentDate, cards, services]);


    // D. Ranking de Categorías
    const topCategories = useMemo(() => {
        const groups = {};
        monthlyTransactions.forEach(t => {
            const cat = t.category || 'varios';
            if (!groups[cat]) groups[cat] = 0;
            groups[cat] += t.displayAmount;
        });

        return Object.entries(groups)
            .map(([key, amount]) => ({
                key, label: CAT_LABELS[key] || key, icon: CAT_ICONS[key] || '📦', amount,
                percent: totalMonthSpent > 0 ? (amount / totalMonthSpent) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [monthlyTransactions, totalMonthSpent]);

    // E. Gráfico de Servicios
    const fixedExpensesData = useMemo(() => {
        const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];
        return services.map((s, idx) => ({
            label: s.name, value: s.amount, color: COLORS[idx % COLORS.length]
        })).sort((a, b) => b.value - a.value);
    }, [services]);


    // F. Estado de Tarjetas
    const cardsStatus = useMemo(() => {
        return cards.map(c => {
            let debt = 0;
            let cardTransactions = [];
            if (c.adjustments?.[currentMonthKey] !== undefined) {
                debt = c.adjustments[currentMonthKey];
                cardTransactions = [{ id: 'adj', description: 'Ajuste Manual', monthlyInstallment: debt, installments: 1, installmentCount: 1 }];
            } else {
                cardTransactions = monthlyTransactions.filter(t => t.cardId === c.id);
                debt = cardTransactions.reduce((acc, t) => acc + t.displayAmount, 0);
            }
            return {
                ...c, currentMonthDebt: debt, details: cardTransactions
            };
        })
            .filter(c => c.currentMonthDebt > 0)
            .sort((a, b) => b.currentMonthDebt - a.currentMonthDebt);

    }, [cards, monthlyTransactions, currentMonthKey]);

    const totalCardsDebt = cardsStatus.reduce((acc, c) => acc + c.currentMonthDebt, 0);

    // Helpers
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    const getCardLogo = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('visa')) return '/logos/visa.png';
        if (n.includes('master')) return '/logos/mastercard.png';
        if (n.includes('amex') || n.includes('american')) return '/logos/amex.png';
        return null;
    };

    const glassClass = isGlass ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800';
    const glassTextSecondary = isGlass ? 'text-white/60' : 'text-gray-400';
    const glassTextPrimary = isGlass ? 'text-white' : 'text-gray-800';


    // =================================================================
    // RENDER
    // =================================================================
    return (
        <div className="space-y-6 animate-fade-in pb-24">

            {/* 1. HEADER RESUMEN */}
            <div className="grid grid-cols-2 gap-4">
                <div className={`p-5 rounded-[28px] border shadow-sm flex flex-col justify-between h-32 ${glassClass}`}>
                    <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-xl ${isGlass ? 'bg-white/10' : 'bg-orange-50 text-orange-500'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${glassTextSecondary}`}>Total Mensual</p>
                        <p className={`text-xl font-bold ${glassTextPrimary}`}>{showMoney(totalMonthSpent)}</p>
                    </div>
                </div>

                <div className={`p-5 rounded-[28px] border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden ${glassClass}`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500 rounded-full blur-[40px] opacity-10"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div className={`p-2 rounded-xl ${isGlass ? 'bg-white/10' : 'bg-indigo-50 text-indigo-500'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${glassTextSecondary}`}>Proyección Próx.</p>
                        <p className={`text-xl font-bold ${glassTextPrimary}`}>{showMoney(nextMonthCommitted)}</p>
                    </div>
                </div>
            </div>

            {/* 2. GASTOS FIJOS */}
            <div className={`p-6 rounded-[30px] shadow-sm border flex items-center gap-6 ${glassClass}`}>
                <div className="flex-1">
                    <h3 className={`font-bold text-sm mb-4 flex items-center gap-2 ${glassTextPrimary}`}>
                        💡 Gastos Fijos
                    </h3>
                    <div className="space-y-2">
                        {fixedExpensesData.slice(0, 4).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className={`${glassTextSecondary}`}>{item.label}</span>
                                </div>
                                <span className={`font-mono font-bold ${glassTextPrimary}`}>{showMoney(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <DonutChart data={fixedExpensesData} />
                </div>
            </div>


            {/* 3. TOP CATEGORÍAS (Toggle List/Map) */}
            <div className={`p-6 rounded-[30px] shadow-sm border ${glassClass}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${glassTextPrimary}`}>📊 Top Categorías</h3>
                    <div className={`flex rounded-lg p-0.5 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <button onClick={() => setCategoryView('list')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${categoryView === 'list' ? (isGlass ? 'bg-white/20 text-white shadow' : 'bg-white shadow text-indigo-600') : (isGlass ? 'text-white/40' : 'text-gray-400')}`}>Lista</button>
                        <button onClick={() => setCategoryView('map')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${categoryView === 'map' ? (isGlass ? 'bg-white/20 text-white shadow' : 'bg-white shadow text-indigo-600') : (isGlass ? 'text-white/40' : 'text-gray-400')}`}>Mapa</button>
                    </div>
                </div>

                {categoryView === 'list' && (
                    <div className="space-y-5 animate-fade-in">
                        {topCategories.map((cat) => (
                            <div key={cat.key}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{cat.icon}</span>
                                        <span className={`text-sm font-bold ${glassTextPrimary}`}>{cat.label}</span>
                                    </div>
                                    <span className={`font-mono font-bold text-sm ${glassTextPrimary}`}>{showMoney(cat.amount)}</span>
                                </div>
                                <div className={`w-full h-2 rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${cat.percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {topCategories.length === 0 && <p className={`text-center py-4 text-xs ${glassTextSecondary}`}>Sin datos aún.</p>}
                    </div>
                )}

                {categoryView === 'map' && (
                    <div className="h-48 grid grid-cols-4 grid-rows-2 gap-2 animate-fade-in">
                        {topCategories.slice(0, 5).map((cat, idx) => {
                            // Layout Bento Grid Simplificado
                            // 0: Big (2x2)
                            // 1: Medium (1x1)
                            // 2: Medium (1x1) ...
                            // Ajuste para grid 4 columnas

                            let spanClass = 'col-span-1 row-span-1';
                            if (idx === 0) spanClass = 'col-span-2 row-span-2'; // El más grande ocupa mitad izq

                            // Color
                            const colorClass = MOSAIC_COLORS[idx % MOSAIC_COLORS.length];

                            return (
                                <div key={cat.key} className={`${spanClass} rounded-2xl ${colorClass} p-3 relative overflow-hidden shadow-sm flex flex-col justify-between group transition-transform active:scale-95`}>
                                    {/* Background Icon */}
                                    <span className="absolute -bottom-2 -right-2 text-4xl opacity-20 grayscale">{cat.icon}</span>

                                    <div className="relative z-10 flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-white/90 uppercase truncate max-w-[80%]">{cat.label}</span>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-white font-mono font-bold text-xs">{showMoney(cat.amount)}</p>
                                        <p className="text-white/60 text-[8px] font-bold">{Math.round(cat.percent)}%</p>
                                    </div>
                                </div>
                            );
                        })}
                        {topCategories.length === 0 && <div className="col-span-4 row-span-2 flex items-center justify-center text-xs text-gray-400">Sin datos</div>}
                    </div>
                )}
            </div>

            {/* 4. TARJETAS */}
            <div className={`p-6 rounded-[30px] shadow-sm border ${glassClass}`}>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className={`font-bold text-sm mb-1 flex items-center gap-2 ${glassTextPrimary}`}>💳 Tarjetas de Crédito</h3>
                        <p className={`text-[10px] ${glassTextSecondary}`}>Toca para ver detalle</p>
                    </div>
                    <div className="text-right">
                        <span className={`text-[10px] uppercase font-bold block ${glassTextSecondary}`}>Total Cuotas</span>
                        <span className={`text-lg font-bold ${glassTextPrimary}`}>{showMoney(totalCardsDebt)}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {cardsStatus.map(card => {
                        const logo = getCardLogo(card.name);
                        const isExpanded = expandedCardId === card.id;

                        return (
                            <div key={card.id}
                                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                                className={`rounded-2xl transition-all cursor-pointer overflow-hidden ${isExpanded ? (isGlass ? 'bg-white/10' : 'bg-gray-50 ring-1 ring-indigo-100') : (isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-100 hover:bg-gray-50')}`}
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-8 bg-white rounded flex items-center justify-center p-1 shadow-sm opacity-90">
                                            {logo ? <img src={logo} className="h-full object-contain" alt="brand" /> : <span className="text-[8px] font-bold text-gray-800">{card.name.substring(0, 3)}</span>}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold leading-none mb-1 ${glassTextPrimary}`}>{card.name}</p>
                                            <p className={`text-[9px] ${glassTextSecondary}`}>{card.details.length} consumos</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono font-bold text-sm ${glassTextPrimary}`}>{showMoney(card.currentMonthDebt)}</p>
                                        <p className={`text-[9px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${glassTextSecondary}`}>▼</p>
                                    </div>
                                </div>

                                <div className={`px-4 bg-black/5 transition-all duration-300 ${isExpanded ? 'max-h-96 pb-4 pt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="space-y-3">
                                        {card.details.map((t, idx) => (
                                            <div key={idx} className="flex justify-between items-start text-xs border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                <div className="pr-2">
                                                    <p className={`font-medium ${glassTextPrimary}`}>{t.description}</p>
                                                    <p className={`text-[9px] ${glassTextSecondary}`}>Cuota {typeof t.installmentCount === 'number' ? (t.installmentCount || 1) : "?"}/{t.installments}</p>
                                                </div>
                                                <p className={`font-mono font-bold ${glassTextPrimary}`}>{showMoney(t.displayAmount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {cardsStatus.length === 0 && (
                        <p className={`text-center py-4 text-xs ${glassTextSecondary}`}>Sin consumos de tarjeta activos.</p>
                    )}
                </div>
            </div>

        </div>
    );
}