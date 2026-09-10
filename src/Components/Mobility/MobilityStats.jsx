import React, { useMemo } from 'react';
import { TrendingUp, Calendar, Percent, Star, Zap, Fuel, Wrench, Droplets, Clock, Gauge } from 'lucide-react';
import { useMobilityState } from '../../context/MobilityContext';
import { getLocalDateString } from '../../utils/security';
import Skeleton from '../UI/Skeleton';
import MobilityTrendChart from './MobilityTrendChart';
import MobilityWeeklyBreakdown from './MobilityWeeklyBreakdown';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PLATFORM_COLORS = {
    uber:   { bg: '#1a1a1a', light: '#e5e5e5' },
    didi:   { bg: '#f97316', light: '#fff7ed' },
    cabify: { bg: '#7c3aed', light: '#ede9fe' },
    others: { bg: '#6b7280', light: '#f3f4f6' },
};

const EXPENSE_CATS = [
    { key: 'gnc',       label: 'GNC',        icon: Zap,      color: '#06b6d4' },
    { key: 'nafta',     label: 'Nafta',       icon: Fuel,     color: '#f59e0b' },
    { key: 'repuestos', label: 'Repuestos',   icon: Wrench,   color: '#ef4444' },
    { key: 'lavadero',  label: 'Lavadero',    icon: Droplets, color: '#14b8a6' },
];

const fmt = (n, prefix = '$') => `${prefix}${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export default function MobilityStats({ isGlass, privacyMode, month, year }) {
    const { sessions, expenses, settings, loading } = useMobilityState();

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const filtered = useMemo(() =>
        sessions.filter(s => s.date?.startsWith(monthKey)),
        [sessions, monthKey]
    );

    const filteredExpenses = useMemo(() =>
        (expenses || []).filter(e => e.date?.startsWith(monthKey)),
        [expenses, monthKey]
    );

    // ─── KPIs ─────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        if (!filtered.length && !filteredExpenses.length) return null;
        const totalEarnings = filtered.reduce((a, s) => a + Number(s.total || 0), 0);
        const bestDay       = [...filtered].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))[0];
        const daysWorked    = filtered.length;
        const avgPerDay     = daysWorked > 0 ? totalEarnings / daysWorked : 0;
        const totalHours    = filtered.reduce((a, s) => a + Number(s.hoursWorked || 0), 0);
        const totalKm       = filtered.reduce((a, s) => a + Number(s.kilometers || 0), 0);
        const earningsPerHour = totalHours > 0 ? totalEarnings / totalHours : 0;
        const earningsPerKm   = totalKm > 0 ? totalEarnings / totalKm : 0;

        const platforms = Object.keys(settings?.activePlatforms || { uber: true, didi: true, cabify: true, others: true }).reduce((acc, key) => {
            if (settings?.activePlatforms?.[key]) {
                const total = filtered.reduce((a, s) => a + Number(s[key] || 0), 0);
                if (total > 0) {
                    acc.push({ key, label: key === 'others' ? 'Otros' : key.charAt(0).toUpperCase() + key.slice(1), total });
                }
            }
            return acc;
        }, []);

        // Calcula la fecha del inicio real de la semana (YYYY-MM-DD) según el día configurado.
        // Ej: si startDay=2 (martes) y la fecha es un jueves, retorna el martes anterior.
        const getWeekKey = (dateStr) => {
            const startDay = settings?.weekStartDay ?? 1;
            const d = new Date(dateStr + 'T12:00:00');
            const dayOfWeek = d.getDay(); // 0=Dom, 1=Lun...
            const daysFromStart = (dayOfWeek - startDay + 7) % 7;
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - daysFromStart);
            return getLocalDateString(weekStart); // clave tipo '2026-06-23'
        };

        const weeksMap = new Map();
        
        filtered.forEach(s => {
            const w = getWeekKey(s.date);
            if (!weeksMap.has(w)) weeksMap.set(w, { total: 0, gastos: 0, days: 0 });
            weeksMap.get(w).total += Number(s.total || 0);
            weeksMap.get(w).days += 1;
        });

        filteredExpenses.forEach(e => {
            const w = getWeekKey(e.date);
            if (!weeksMap.has(w)) weeksMap.set(w, { total: 0, gastos: 0, days: 0 });
            weeksMap.get(w).gastos += Number(e.amount || 0);
            // Los gastos no suman días trabajados
        });

        const weeks = Array.from(weeksMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0])) // strings YYYY-MM-DD ordenan correctamente
            .map(([, data], i) => ({
                label: `S${i + 1}`,
                ...data
            }));

        // Gastos del mes por categoría (usando las de settings)
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
            overallPerHour: earningsPerHour,
            overallPerKm: earningsPerKm,
            platforms, 
            weeks, 
            expenseByCategory, 
            totalExpenses, 
            netEarnings, 
            profitMargin 
        };
    }, [filtered, filteredExpenses, settings]);

    // ─── Últimos 6 meses para tendencia ──────────────────────────────────────
    const trend6 = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => {
            let m = month - 5 + i;
            let y = year;
            while (m < 0)  { m += 12; y--; }
            while (m > 11) { m -= 12; y++; }
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            const total = sessions.reduce((a, s) => s.date?.startsWith(key) ? a + Number(s.total || 0) : a, 0);
            const gastos = (expenses || []).reduce((a, e) => e.date?.startsWith(key) ? a + Number(e.amount || 0) : a, 0);
            return { label: MONTHS[m].slice(0, 3), total, gastos, key };
        });
    }, [sessions, expenses, month, year]);

    const maxTrend = Math.max(...trend6.map(t => Math.max(t.total, t.gastos)), 1);

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    if (loading && filtered.length === 0) {
        return (
            <div className="space-y-4">
                {/* Skeleton KPIs Principales */}
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={card}>
                            <Skeleton type="circle" width="32px" height="32px" className="mb-2" />
                            <Skeleton type="title" width="65%" className="!h-7 mb-1" />
                            <Skeleton type="text" width="45%" className="!h-3" />
                        </div>
                    ))}
                </div>

                {/* Skeleton Rendimiento y Eficiencia */}
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2].map(i => (
                        <div key={i} className={card}>
                            <Skeleton type="circle" width="32px" height="32px" className="mb-2" />
                            <Skeleton type="title" width="55%" className="!h-7 mb-1" />
                            <Skeleton type="text" width="50%" className="!h-3" />
                        </div>
                    ))}
                </div>

                {/* Skeleton Gráfico Tendencia */}
                <div className={card}>
                    <Skeleton type="text" width="160px" className="!h-3 mb-4" />
                    <div className="grid grid-cols-6 gap-2 items-end h-[100px] pb-2">
                        {[40, 65, 50, 80, 60, 75].map((h, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                                <Skeleton type="rectangular" width="70%" height={`${h}%`} />
                                <Skeleton type="text" width="60%" className="!h-2.5 mt-2" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Skeleton Desglose Semanal */}
                <div className={card}>
                    <Skeleton type="text" width="130px" className="!h-3 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton type="text" width="20px" className="!h-3" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton type="rectangular" width="100%" height="8px" />
                                    <Skeleton type="rectangular" width="35%" height="6px" />
                                </div>
                                <Skeleton type="text" width="50px" className="!h-3" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {!kpis ? (
                <div className={`${card} text-center py-12`}>
                    <p className="text-4xl mb-2">📊</p>
                    <p className={`font-semibold ${text}`}>Sin datos este mes</p>
                    <p className={`text-sm ${sub}`}>Registrá jornadas para ver el análisis</p>
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

                    {/* BALANCE NETO (ingresos - gastos) */}
                    {kpis.totalExpenses > 0 && (
                        <div className={`${card}`}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Balance neto del mes</p>
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

                    {/* MEJOR DÍA */}
                    {kpis.bestDay && (
                        <div className={`${card} flex items-center gap-3`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
                                <Star size={18} className="text-white" />
                            </div>
                            <div>
                                <p className={`text-xs ${sub}`}>Mejor jornada del mes</p>
                                <p className={`font-bold text-sm ${text}`}>
                                    {kpis.bestDay.date}
                                    <span className={`font-normal ml-1 capitalize ${sub}`}>({kpis.bestDay.dayOfWeek})</span>
                                </p>
                                <p className="text-amber-500 font-bold text-base">
                                    {privacyMode ? '••••' : fmt(kpis.bestDay.total)}
                                </p>
                            </div>
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

                    {/* DISTRIBUCIÓN POR PLATAFORMA */}
                    {kpis.platforms.length > 0 && (
                        <div className={card}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Distribución por plataforma</p>
                            <div className="space-y-2.5">
                                {kpis.platforms.map(p => {
                                    const pct = kpis.totalEarnings > 0
                                        ? ((p.total / kpis.totalEarnings) * 100).toFixed(1)
                                        : 0;
                                    const colors = PLATFORM_COLORS[p.key];
                                    return (
                                        <div key={p.key}>
                                            <div className="flex justify-between mb-1">
                                                <span className={`text-xs font-semibold ${text}`}>{p.label}</span>
                                                <span className={`text-xs ${sub}`}>
                                                    {privacyMode ? '••••' : fmt(p.total)} · {pct}%
                                                </span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                <div
                                                    className="h-2 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: colors.bg }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <MobilityTrendChart 
                        trend6={trend6}
                        maxTrend={maxTrend}
                        monthKey={monthKey}
                        isGlass={isGlass}
                        privacyMode={privacyMode}
                        fmt={fmt}
                    />

                    <MobilityWeeklyBreakdown 
                        weeks={kpis.weeks}
                        totalEarnings={kpis.totalEarnings}
                        isGlass={isGlass}
                        privacyMode={privacyMode}
                        text={text}
                        sub={sub}
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
