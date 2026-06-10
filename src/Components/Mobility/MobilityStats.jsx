import React, { useMemo, useState } from 'react';
import { TrendingUp, Clock, Navigation, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const PLATFORM_COLORS = {
    uber:   { bg: '#1a1a1a', light: '#e5e5e5' },
    didi:   { bg: '#f97316', light: '#fff7ed' },
    cabify: { bg: '#7c3aed', light: '#ede9fe' },
    others: { bg: '#6b7280', light: '#f3f4f6' },
};

const fmt = (n, prefix = '$') => `${prefix}${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export default function MobilityStats({ isGlass, privacyMode }) {
    const { sessions } = useMobility();

    const now = new Date();
    const [year, setYear]   = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());

    const changeMonth = (dir) => {
        let m = month + dir;
        let y = year;
        if (m < 0)  { m = 11; y--; }
        if (m > 11) { m = 0;  y++; }
        setMonth(m); setYear(y);
    };

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const filtered = useMemo(() =>
        sessions.filter(s => s.date?.startsWith(monthKey)),
        [sessions, monthKey]
    );

    // ─── KPIs ─────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        if (!filtered.length) return null;
        const totalEarnings = filtered.reduce((a, s) => a + (s.total || 0), 0);
        const totalHours    = filtered.reduce((a, s) => a + (s.hoursWorked || 0), 0);
        const totalKm       = filtered.reduce((a, s) => a + (s.kilometers || 0), 0);
        const bestDay       = [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0))[0];
        const avgPerHour    = totalHours > 0 ? totalEarnings / totalHours : 0;
        const avgPerKm      = totalKm    > 0 ? totalEarnings / totalKm    : 0;

        // Distribución por plataforma
        const platforms = ['uber', 'didi', 'cabify', 'others'].map(key => ({
            key,
            label: key === 'others' ? 'Otros' : key.charAt(0).toUpperCase() + key.slice(1),
            total: filtered.reduce((a, s) => a + (s[key] || 0), 0),
        })).filter(p => p.total > 0);

        // Semanas del mes (para gráfico de barras)
        const weeks = [0, 1, 2, 3, 4].map(w => {
            const weekSessions = filtered.filter(s => {
                const d = new Date(s.date + 'T12:00:00');
                const dayOfMonth = d.getDate();
                return Math.floor((dayOfMonth - 1) / 7) === w;
            });
            return {
                label: `S${w + 1}`,
                total: weekSessions.reduce((a, s) => a + (s.total || 0), 0),
                days:  weekSessions.length,
            };
        }).filter(w => w.days > 0);

        return { totalEarnings, totalHours, totalKm, bestDay, avgPerHour, avgPerKm, platforms, weeks };
    }, [filtered]);

    // ─── Últimos 6 meses para tendencia ──────────────────────────────────────
    const trend6 = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => {
            let m = month - 5 + i;
            let y = year;
            while (m < 0)  { m += 12; y--; }
            while (m > 11) { m -= 12; y++; }
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            const total = sessions
                .filter(s => s.date?.startsWith(key))
                .reduce((a, s) => a + (s.total || 0), 0);
            return { label: MONTHS[m].slice(0, 3), total, key };
        });
    }, [sessions, month, year]);

    const maxTrend = Math.max(...trend6.map(t => t.total), 1);

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4">
            {/* SELECTOR MES */}
            <div className={`${card} flex items-center justify-between`}>
                <button onClick={() => changeMonth(-1)} className={`p-2 rounded-xl transition-all ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <ChevronLeft size={16} />
                </button>
                <p className={`font-bold text-sm ${text}`}>{MONTHS[month]} {year}</p>
                <button onClick={() => changeMonth(1)} className={`p-2 rounded-xl transition-all ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <ChevronRight size={16} />
                </button>
            </div>

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
                            label="Total del mes"
                            value={privacyMode ? '••••' : fmt(kpis.totalEarnings)}
                            accent="violet"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<Clock size={18} />}
                            label="Horas trabajadas"
                            value={`${kpis.totalHours}h`}
                            accent="indigo"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<span className="text-sm font-bold">$/h</span>}
                            label="Por hora"
                            value={privacyMode ? '••' : fmt(kpis.avgPerHour)}
                            accent="purple"
                            isGlass={isGlass}
                        />
                        <KpiCard
                            icon={<Navigation size={18} />}
                            label="Por km"
                            value={privacyMode ? '••' : `$${kpis.avgPerKm.toFixed(2)}`}
                            accent="blue"
                            isGlass={isGlass}
                        />
                    </div>

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

                    {/* TENDENCIA ÚLTIMOS 6 MESES */}
                    <div className={card}>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-4 ${sub}`}>Tendencia · últimos 6 meses</p>
                        <div className="flex items-end gap-2 h-28">
                            {trend6.map(({ label, total, key }) => {
                                const height = maxTrend > 0 ? Math.max((total / maxTrend) * 100, total > 0 ? 4 : 0) : 0;
                                const isCurrentMonth = key === monthKey;
                                return (
                                    <div key={key} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-700 ${
                                                    isCurrentMonth
                                                        ? 'bg-gradient-to-t from-violet-600 to-indigo-400'
                                                        : isGlass
                                                            ? 'bg-white/20'
                                                            : 'bg-gray-200'
                                                }`}
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${isCurrentMonth ? (isGlass ? 'text-violet-300' : 'text-violet-600') : sub}`}>
                                            {label}
                                        </span>
                                        {!privacyMode && total > 0 && (
                                            <span className={`text-xs ${sub}`}>{fmt(total)}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DESGLOSE SEMANAL */}
                    {kpis.weeks.length > 1 && (
                        <div className={card}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Desglose semanal</p>
                            <div className="space-y-2">
                                {kpis.weeks.map(w => (
                                    <div key={w.label} className="flex items-center justify-between">
                                        <span className={`text-sm font-semibold w-8 ${text}`}>{w.label}</span>
                                        <div className="flex-1 mx-3">
                                            <div className={`h-2 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                <div
                                                    className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700"
                                                    style={{ width: `${kpis.totalEarnings > 0 ? (w.total / kpis.totalEarnings) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${text} w-20 text-right`}>
                                            {privacyMode ? '••••' : fmt(w.total)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function KpiCard({ icon, label, value, accent, isGlass }) {
    const accents = {
        violet: { from: 'from-violet-600', to: 'to-violet-500', text: 'text-violet-50' },
        indigo: { from: 'from-indigo-600', to: 'to-indigo-500', text: 'text-indigo-50' },
        purple: { from: 'from-purple-600', to: 'to-purple-500', text: 'text-purple-50' },
        blue:   { from: 'from-blue-600',   to: 'to-blue-500',   text: 'text-blue-50' },
    };
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
