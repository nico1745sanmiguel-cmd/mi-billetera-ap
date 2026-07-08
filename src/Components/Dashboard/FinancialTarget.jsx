import React, { useState } from 'react';
import { BarChart3, ChevronRight, CreditCard, Zap, ShoppingCart, Layers } from 'lucide-react';
import { formatMoney } from '../../utils';

const CATEGORIES = [
    { key: 'all',      label: 'Todo',       icon: Layers,       color: 'indigo' },
    { key: 'services', label: 'Servicios',  icon: Zap,          color: 'amber'  },
    { key: 'cards',    label: 'Tarjetas',   icon: CreditCard,   color: 'rose'   },
    { key: 'super',    label: 'Super',      icon: ShoppingCart, color: 'emerald'},
];

const COLOR_MAP = {
    indigo:  { bar: 'from-indigo-400 to-purple-400',  badge: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',  pill: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30', pillOff: 'text-indigo-500 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/20' },
    amber:   { bar: 'from-amber-400 to-orange-400',   badge: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',    pill: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',  pillOff: 'text-amber-500 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/20'  },
    rose:    { bar: 'from-rose-400 to-pink-400',      badge: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',      pill: 'bg-rose-500 text-white shadow-md shadow-rose-500/30',   pillOff: 'text-rose-500 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/20'    },
    emerald: { bar: 'from-emerald-400 to-teal-400',   badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',pill: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',pillOff: 'text-emerald-500 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/20'},
};

function MiniBar({ pct, colorClass }) {
    return (
        <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700 ease-out`}
                style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
    );
}

function CategoryItem({ name, sub, amount, paid, pct, colorClass, badgeClass, privacyMode }) {
    const show = (v) => privacyMode ? '••••' : formatMoney(v);
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/80 truncate">{name}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white ml-2 shrink-0">{show(amount)}</span>
                </div>
                {sub && (
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400 dark:text-white/40">{sub}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                            {show(paid)} pag.
                        </span>
                    </div>
                )}
                <MiniBar pct={pct} colorClass={colorClass} />
            </div>
        </div>
    );
}

export default function FinancialTarget({
    totalNeed,
    totalPaid,
    privacyMode,
    services = [],
    cardsWithDebt = [],
    superData = null,
    targetMonthKey = '',
    onNavigateStats,
    showStats = false,
}) {
    const [tab, setTab] = useState('resumen');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const remaining = totalNeed - totalPaid;
    const percentage = totalNeed > 0 ? Math.min(100, (totalPaid / totalNeed) * 100) : 0;

    // SVG ring
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const showMoney = (v) => privacyMode ? '••••' : formatMoney(v);

    // --- Build data per category ---
    const servicesPaid = services.filter(s => s.paidPeriods?.includes(targetMonthKey)).reduce((a, s) => a + s.amount, 0);
    const servicesTotal = services.reduce((a, s) => a + s.amount, 0);

    const cardsPaid = cardsWithDebt.filter(c => c.paidPeriods?.includes(targetMonthKey)).reduce((a, c) => a + c.currentDebt, 0);
    const cardsTotal = cardsWithDebt.reduce((a, c) => a + c.currentDebt, 0);

    const superPaid = superData?.realSpent ?? 0;
    const superTotal = superData?.totalBudget ?? 0;

    // --- Individual rows depending on filter ---
    const serviceRows = services.map(s => ({
        key: s.id,
        name: s.name,
        sub: s.day ? `Vence día ${s.day}` : null,
        amount: s.amount,
        paid: s.paidPeriods?.includes(targetMonthKey) ? s.amount : 0,
        pct: s.paidPeriods?.includes(targetMonthKey) ? 100 : 0,
        color: 'amber',
    }));

    const cardRows = cardsWithDebt.map(c => ({
        key: c.id,
        name: c.name,
        sub: c.bank ?? null,
        amount: c.currentDebt,
        paid: c.paidPeriods?.includes(targetMonthKey) ? c.currentDebt : 0,
        pct: c.paidPeriods?.includes(targetMonthKey) ? 100 : 0,
        color: 'rose',
    }));

    const superRows = superTotal > 0
        ? [{
            key: 'super',
            name: 'Supermercado',
            sub: superData?.label ?? null,
            amount: superTotal,
            paid: superPaid,
            pct: superTotal > 0 ? (superPaid / superTotal) * 100 : 0,
            color: 'emerald',
        }]
        : [];

    const allRows = [...serviceRows, ...cardRows, ...superRows];

    const visibleRows = categoryFilter === 'all'    ? allRows
                      : categoryFilter === 'services'? serviceRows
                      : categoryFilter === 'cards'   ? cardRows
                      : superRows;

    // Hide super tab if no data
    const availableCategories = CATEGORIES.filter(c => {
        if (c.key === 'super') return superTotal > 0;
        if (c.key === 'services') return services.length > 0;
        if (c.key === 'cards') return cardsWithDebt.length > 0;
        return true;
    });

    return (
        <div className="bg-white dark:bg-white/5 rounded-[30px] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/10 overflow-hidden dark:backdrop-blur-md">

            {/* ── TABS ── */}
            <div className="flex items-center gap-1 px-4 pt-4 pb-2">
                {[{ id: 'resumen', label: 'Resumen' }, { id: 'desglose', label: 'Desglose' }].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                            tab === t.id
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/50'
                                : 'text-gray-400 dark:text-white/40 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-white/10'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
                <div className="flex-1" />
                <span className="text-[10px] font-bold text-gray-300 dark:text-white/30 uppercase tracking-wider">Meta Mensual</span>
            </div>

            {/* ── VISTA RESUMEN ── */}
            {tab === 'resumen' && (
                <div className="px-6 pb-5 pt-1">
                    <div className="flex justify-between items-center">
                        {/* Izquierda: datos */}
                        <div className="flex flex-col justify-center">
                            <div className="mb-4">
                                <span className="text-3xl font-bold text-gray-800 dark:text-white tracking-tighter">
                                    {showMoney(remaining)}
                                </span>
                                <p className="text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 inline-block px-2 py-0.5 rounded-full ml-2">
                                    Falta Cubrir
                                </p>
                            </div>
                            <div className="flex gap-4 text-xs">
                                <div>
                                    <span className="block text-gray-400 dark:text-white/40 text-[9px] uppercase">Total a Pagar</span>
                                    <span className="font-bold text-gray-600 dark:text-white/70">{showMoney(totalNeed)}</span>
                                </div>
                                <div className="w-px h-6 bg-gray-100 dark:bg-white/10" />
                                <div>
                                    <span className="block text-gray-400 dark:text-white/40 text-[9px] uppercase">Ya Pagado</span>
                                    <span className="font-bold text-green-600 dark:text-emerald-400">{showMoney(totalPaid)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Derecha: anillo SVG */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="transform -rotate-90 w-full h-full">
                                <defs>
                                    <linearGradient id="ftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                                <circle cx="48" cy="48" r={radius} className="stroke-gray-100 dark:stroke-white/10" strokeWidth="8" fill="transparent" />
                                <circle
                                    cx="48" cy="48" r={radius}
                                    stroke="url(#ftGrad)" strokeWidth="8" fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-sm font-bold text-gray-800 dark:text-white">{percentage.toFixed(0)}%</span>
                                <span className="text-[8px] text-gray-400 dark:text-white/40 font-bold uppercase">Pago</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA compacto */}
                    {showStats && (
                        <button
                            onClick={onNavigateStats}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors group"
                        >
                            <BarChart3 size={13} />
                            <span>Ver Análisis Completo</span>
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>
            )}

            {/* ── VISTA DESGLOSE ── */}
            {tab === 'desglose' && (
                <div className="px-4 pb-5 pt-1">
                    {/* Pills de categoría */}
                    <div className="flex gap-1.5 flex-wrap mb-4">
                        {availableCategories.map(cat => {
                            const c = COLOR_MAP[cat.color];
                            const Icon = cat.icon;
                            const active = categoryFilter === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => setCategoryFilter(cat.key)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150 ${
                                        active ? c.pill : `bg-gray-50 dark:bg-white/5 ${c.pillOff}`
                                    }`}
                                >
                                    <Icon size={10} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Totalizador de la categoría activa */}
                    {categoryFilter !== 'all' && (() => {
                        const cat = CATEGORIES.find(c => c.key === categoryFilter);
                        const c = COLOR_MAP[cat.color];
                        const catTotal = categoryFilter === 'services' ? servicesTotal
                                       : categoryFilter === 'cards'    ? cardsTotal
                                       : superTotal;
                        const catPaid  = categoryFilter === 'services' ? servicesPaid
                                       : categoryFilter === 'cards'    ? cardsPaid
                                       : superPaid;
                        const catPct   = catTotal > 0 ? (catPaid / catTotal) * 100 : 0;
                        return (
                            <div className="flex items-center gap-3 mb-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 dark:text-white/40 font-semibold uppercase">Pagado</span>
                                        <span className="text-[10px] text-gray-400 dark:text-white/40 font-semibold uppercase">Total</span>
                                    </div>
                                    <div className="flex justify-between items-baseline mb-1.5">
                                        <span className="text-base font-bold text-gray-800 dark:text-white">{showMoney(catPaid)}</span>
                                        <span className="text-xs font-bold text-gray-400 dark:text-white/40">{showMoney(catTotal)}</span>
                                    </div>
                                    <MiniBar pct={catPct} colorClass={c.bar} />
                                </div>
                                <span className={`text-sm font-extrabold px-2 py-1 rounded-xl ${c.badge}`}>
                                    {catPct.toFixed(0)}%
                                </span>
                            </div>
                        );
                    })()}

                    {/* Filas de ítems */}
                    <div className="space-y-3">
                        {visibleRows.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-white/40 text-center py-4">Sin ítems en esta categoría</p>
                        )}
                        {visibleRows.map(row => (
                            <CategoryItem
                                key={row.key}
                                name={row.name}
                                sub={row.sub}
                                amount={row.amount}
                                paid={row.paid}
                                pct={row.pct}
                                colorClass={COLOR_MAP[row.color].bar}
                                badgeClass={COLOR_MAP[row.color].badge}
                                privacyMode={privacyMode}
                            />
                        ))}
                    </div>

                    {/* CTA Ver Análisis */}
                    {showStats && (
                        <button
                            onClick={onNavigateStats}
                            className="mt-5 w-full h-14 rounded-2xl relative overflow-hidden group shadow-md shadow-indigo-100 dark:shadow-indigo-900/20 active:scale-95 transition-all"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient-x opacity-90 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex items-center justify-center h-full text-white gap-2">
                                <div className="bg-white/20 dark:bg-black/20 p-1 rounded-full backdrop-blur-sm">
                                    <BarChart3 size={14} />
                                </div>
                                <span className="font-bold text-sm tracking-wide">Ver Análisis Completo</span>
                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}