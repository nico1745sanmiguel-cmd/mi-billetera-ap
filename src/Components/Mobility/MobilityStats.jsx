import React, { useMemo, useState } from 'react';
import { TrendingUp, Calendar, Percent, Star, Zap, Fuel, Wrench, Droplets, Clock, Gauge, ChevronDown, Check } from 'lucide-react';
import { useMobilityState } from '../../context/MobilityContext';
import Skeleton from '../UI/Skeleton';
import MobilityInteractiveChart from './MobilityInteractiveChart';
import MobilityHeatmap from './MobilityHeatmap';

const PLATFORM_COLORS = {
    uber:   { bg: '#1a1a1a', light: '#e5e5e5' },
    didi:   { bg: '#f97316', light: '#fff7ed' },
    cabify: { bg: '#7c3aed', light: '#ede9fe' },
    others: { bg: '#6b7280', light: '#f3f4f6' },
};

const fmt = (n, prefix = '$') => `${prefix}${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export default function MobilityStats({ isGlass, privacyMode, month, year }) {
    const { sessions, expenses, settings, loading } = useMobilityState();

    const [timeRange, setTimeRange] = useState('month'); // 'month', '3months', 'year', 'all'
    const [hiddenPlatforms, setHiddenPlatforms] = useState(new Set());

    const togglePlatform = (p) => {
        setHiddenPlatforms(prev => {
            const next = new Set(prev);
            if (next.has(p)) next.delete(p);
            else next.add(p);
            return next;
        });
    };

    // 1. Filtrado por fecha
    const { filteredByDate, filteredExpenses } = useMemo(() => {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        let startLimit = null;
        if (timeRange === 'month') {
            startLimit = monthKey;
        } else if (timeRange === '3months') {
            let m = month - 2;
            let y = year;
            if (m < 0) { m += 12; y -= 1; }
            startLimit = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        } else if (timeRange === 'year') {
            startLimit = `${year}-01-01`;
        }

        const fSessions = sessions.filter(s => {
            if (timeRange === 'all') return true;
            if (timeRange === 'month') return s.date?.startsWith(monthKey);
            return s.date >= startLimit && s.date <= `${year}-${String(month + 1).padStart(2, '0')}-31`;
        });

        const fExpenses = (expenses || []).filter(e => {
            if (timeRange === 'all') return true;
            if (timeRange === 'month') return e.date?.startsWith(monthKey);
            return e.date >= startLimit && e.date <= `${year}-${String(month + 1).padStart(2, '0')}-31`;
        });

        return { filteredByDate: fSessions, filteredExpenses: fExpenses };
    }, [sessions, expenses, month, year, timeRange]);

    // 2. Filtrado por plataformas ocultas (para recalcular ingresos)
    const filtered = useMemo(() => {
        return filteredByDate.map(s => {
            let newTotal = 0;
            ['uber', 'didi', 'cabify', 'others'].forEach(p => {
                if (!hiddenPlatforms.has(p)) newTotal += Number(s[p] || 0);
            });
            // Si el nuevo total es 0 y se ocultaron plataformas, la sesión sigue contando para horas/km?
            // Podríamos reducir horas/km proporcionalmente, pero es complejo. Por ahora, total baja.
            return { ...s, total: newTotal };
        });
    }, [filteredByDate, hiddenPlatforms]);

    // ─── KPIs ─────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        if (!filtered.length && !filteredExpenses.length) return null;
        
        const totalEarnings = filtered.reduce((a, s) => a + Number(s.total || 0), 0);
        const bestDay       = [...filtered].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))[0];
        const daysWorked    = filtered.filter(s => s.total > 0).length; // Solo días donde ganó algo con las apps activas
        const avgPerDay     = daysWorked > 0 ? totalEarnings / daysWorked : 0;
        
        const totalHours    = filtered.reduce((a, s) => a + Number(s.hoursWorked || 0), 0);
        const totalKm       = filtered.reduce((a, s) => a + Number(s.kilometers || 0), 0);
        const earningsPerHour = totalHours > 0 ? totalEarnings / totalHours : 0;
        const earningsPerKm   = totalKm > 0 ? totalEarnings / totalKm : 0;

        // Para las plataformas, mostramos sus totales independientes (incluso si están ocultas, mostramos su barra apagada)
        const platforms = Object.keys(settings?.activePlatforms || { uber: true, didi: true, cabify: true, others: true }).reduce((acc, key) => {
            if (settings?.activePlatforms?.[key]) {
                const total = filteredByDate.reduce((a, s) => a + Number(s[key] || 0), 0);
                if (total > 0) {
                    acc.push({ key, label: key === 'others' ? 'Otros' : key.charAt(0).toUpperCase() + key.slice(1), total });
                }
            }
            return acc;
        }, []);

        const cats = settings?.expenseCategories || [];
        const expenseByCategory = cats.flatMap(cat => {
            const total = filteredExpenses.reduce((a, e) => e.category === cat.id ? a + Number(e.amount || 0) : a, 0);
            if (total > 0) {
                return [{
                    ...cat,
                    icon: cat.iconName === 'Zap' ? Zap : cat.iconName === 'Fuel' ? Fuel : cat.iconName === 'Wrench' ? Wrench : cat.iconName === 'Droplets' ? Droplets : Zap,
                    total
                }];
            }
            return [];
        });

        const totalExpenses = filteredExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
        const netEarnings   = totalEarnings - totalExpenses;
        const profitMargin  = totalEarnings > 0 ? (netEarnings / totalEarnings) * 100 : 0;

        return { 
            totalEarnings, 
            bestDay, 
            daysWorked, 
            avgPerDay, 
            totalHours,
            totalKm,
            earningsPerHour,
            earningsPerKm,
            platforms, 
            expenseByCategory, 
            totalExpenses, 
            netEarnings, 
            profitMargin 
        };
    }, [filtered, filteredByDate, filteredExpenses, settings]);

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    if (loading && filtered.length === 0) {
        return (
            <div className="space-y-4">
                <Skeleton type="rectangular" width="100%" height="40px" className="rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={card}>
                            <Skeleton type="circle" width="32px" height="32px" className="mb-2" />
                            <Skeleton type="title" width="65%" className="!h-7 mb-1" />
                        </div>
                    ))}
                </div>
                <Skeleton type="rectangular" width="100%" height="250px" className="rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            
            {/* TABS DE RANGO DE TIEMPO */}
            <div className={`flex rounded-xl p-1 gap-1 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gray-100'}`}>
                {[
                    { id: 'month', label: 'Mes' },
                    { id: '3months', label: '3 Meses' },
                    { id: 'year', label: 'Este Año' },
                    { id: 'all', label: 'Histórico' }
                ].map(t => (
                    <button 
                        key={t.id}
                        onClick={() => setTimeRange(t.id)}
                        className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                            timeRange === t.id 
                            ? (isGlass ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm')
                            : (isGlass ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700')
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {!kpis ? (
                <div className={`${card} text-center py-12`}>
                    <p className="text-4xl mb-2">📊</p>
                    <p className={`font-semibold ${text}`}>Sin datos en este período</p>
                    <p className={`text-sm ${sub}`}>Ajustá el rango de tiempo o registrá nuevas jornadas.</p>
                </div>
            ) : (
                <>
                    {/* KPIs PRINCIPALES */}
                    <div className="grid grid-cols-2 gap-3">
                        <KpiCard
                            icon={<TrendingUp size={18} />}
                            label="Ingresos brutos"
                            value={privacyMode ? '••••' : fmt(kpis.totalEarnings)}
                            accent="violet"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<Calendar size={18} />}
                            label="Días trabajados"
                            value={kpis.daysWorked.toString()}
                            accent="indigo"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<span className="text-sm font-bold">$/D</span>}
                            label="Promedio diario"
                            value={privacyMode ? '••••' : fmt(kpis.avgPerDay)}
                            accent="purple"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<Percent size={18} />}
                            label="Margen neto"
                            value={privacyMode ? '••' : `${kpis.profitMargin.toFixed(1)}%`}
                            accent="blue"
                            isGlass={isGlass}
                        />
                    </div>

                    {/* RENDIMIENTO Y EFICIENCIA OPERATIVA */}
                    <div className="grid grid-cols-2 gap-3">
                        <KpiCard
                            icon={<Clock size={18} />}
                            label={kpis.totalHours > 0 ? `Ganancia / hora (${kpis.totalHours}h)` : 'Ganancia / hora'}
                            value={privacyMode ? '••••' : `${fmt(kpis.earningsPerHour)}/h`}
                            accent="emerald"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<Gauge size={18} />}
                            label={kpis.totalKm > 0 ? `Ganancia / km (${kpis.totalKm}km)` : 'Ganancia / km'}
                            value={privacyMode ? '••••' : `${fmt(kpis.earningsPerKm)}/km`}
                            accent="cyan"
                            isGlass={isGlass}
                        />
                    </div>

                    {/* GRÁFICO INTERACTIVO */}
                    <MobilityInteractiveChart 
                        data={filtered}
                        expensesData={filteredExpenses}
                        timeRange={timeRange}
                        isGlass={isGlass}
                        privacyMode={privacyMode}
                        fmt={fmt}
                    />

                    {/* BALANCE NETO (ingresos - gastos) */}
                    {kpis.totalExpenses > 0 && (
                        <div className={`${card}`}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Balance del período</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className={`text-xs ${sub} mb-0.5`}>Ingresos</p>
                                    <p className={`font-bold text-sm ${isGlass ? 'text-green-300' : 'text-green-600'}`}>
                                        {privacyMode ? '••••' : fmt(kpis.totalEarnings)}
                                    </p>
                                </div>
                                <div>
                                    <p className={`text-xs ${sub} mb-0.5`}>Gastos</p>
                                    <p className={`font-bold text-sm ${isGlass ? 'text-red-300' : 'text-red-500'}`}>
                                        {privacyMode ? '••••' : fmt(kpis.totalExpenses)}
                                    </p>
                                </div>
                                <div>
                                    <p className={`text-xs ${sub} mb-0.5`}>Neto</p>
                                    <p className={`font-bold text-sm ${kpis.netEarnings >= 0 ? (isGlass ? 'text-violet-300' : 'text-violet-600') : (isGlass ? 'text-red-300' : 'text-red-600')}`}>
                                        {privacyMode ? '••••' : fmt(kpis.netEarnings)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DISTRIBUCIÓN POR PLATAFORMA (INTERACTIVA) */}
                    {kpis.platforms.length > 0 && (
                        <div className={card}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Distribución por plataforma</p>
                            <div className="space-y-3">
                                {kpis.platforms.map(p => {
                                    // Total original para sacar el porcentaje real respecto al total sumado
                                    const sumOfAllPlatforms = kpis.platforms.reduce((a, pl) => a + pl.total, 0);
                                    const pct = sumOfAllPlatforms > 0 ? ((p.total / sumOfAllPlatforms) * 100).toFixed(1) : 0;
                                    const colors = PLATFORM_COLORS[p.key] || PLATFORM_COLORS.others;
                                    const isHidden = hiddenPlatforms.has(p.key);

                                    return (
                                        <div 
                                            key={p.key} 
                                            onClick={() => togglePlatform(p.key)}
                                            className={`cursor-pointer transition-opacity ${isHidden ? 'opacity-40' : 'opacity-100'}`}
                                        >
                                            <div className="flex justify-between mb-1">
                                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${text}`}>
                                                    <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${isHidden ? 'border-gray-400 bg-transparent' : 'border-transparent'}`} style={{ backgroundColor: isHidden ? 'transparent' : colors.bg }}>
                                                        {!isHidden && <Check size={8} color="white" strokeWidth={4} />}
                                                    </div>
                                                    {p.label}
                                                </span>
                                                <span className={`text-xs ${sub}`}>
                                                    {privacyMode ? '••••' : fmt(p.total)} · {pct}%
                                                </span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                <div
                                                    className="h-2 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: isHidden ? (isGlass ? '#ffffff33' : '#d1d5db') : colors.bg }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className={`text-[10px] mt-3 text-center ${sub}`}>Tocá una plataforma para excluirla del análisis principal.</p>
                        </div>
                    )}

                    {/* GASTOS POR CATEGORÍA */}
                    {kpis.expenseByCategory.length > 0 && (
                        <div className={card}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Gastos del vehículo</p>
                            <div className="space-y-2.5">
                                {kpis.expenseByCategory.map(cat => {
                                    const Icon = cat.icon;
                                    const pct = kpis.totalExpenses > 0
                                        ? ((cat.total / kpis.totalExpenses) * 100).toFixed(1)
                                        : 0;
                                    return (
                                        <div key={cat.key}>
                                            <div className="flex justify-between mb-1">
                                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${text}`}>
                                                    <Icon size={12} />
                                                    {cat.label}
                                                </span>
                                                <span className={`text-xs ${sub}`}>
                                                    {privacyMode ? '••••' : fmt(cat.total)} · {pct}%
                                                </span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                <div
                                                    className="h-2 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* MEJOR DÍA */}
                    {kpis.bestDay && (
                        <div className={`${card} flex items-center gap-3`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
                                <Star size={18} className="text-white" />
                            </div>
                            <div>
                                <p className={`text-xs ${sub}`}>Mejor jornada del período</p>
                                <p className={`font-bold text-sm ${text}`}>
                                    {kpis.bestDay.date}
                                </p>
                                <p className="text-amber-500 font-bold text-base">
                                    {privacyMode ? '••••' : fmt(kpis.bestDay.total)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* MAPA DE CALOR POR DÍA DE LA SEMANA */}
                    <MobilityHeatmap 
                        data={filtered} 
                        isGlass={isGlass} 
                        privacyMode={privacyMode} 
                        fmt={fmt} 
                    />

                </>
            )}
        </div>
    );
}

const accents = {
    violet:  { from: 'from-violet-600',  to: 'to-violet-500',  text: 'text-violet-50' },
    indigo:  { from: 'from-indigo-600',  to: 'to-indigo-500',  text: 'text-indigo-50' },
    purple:  { from: 'from-purple-600',  to: 'to-purple-500',  text: 'text-purple-50' },
    blue:    { from: 'from-blue-600',    to: 'to-blue-500',    text: 'text-blue-50' },
    emerald: { from: 'from-emerald-600', to: 'to-emerald-500', text: 'text-emerald-50' },
    cyan:    { from: 'from-cyan-600',    to: 'to-cyan-500',    text: 'text-cyan-50' },
};

function KpiCard({ icon, label, value, accent, isGlass }) {
    const a = accents[accent];

    return (
        <div className={`rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${a.from} ${a.to} flex items-center justify-center mb-2 ${a.text}`}>
                {icon}
            </div>
            <p className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{value}</p>
            <p className={`text-xs mt-0.5 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>{label}</p>
        </div>
    );
}
