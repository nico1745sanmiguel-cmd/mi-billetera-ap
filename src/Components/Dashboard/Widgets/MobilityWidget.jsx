import React, { useMemo } from 'react';
import { Car, TrendingUp, ChevronRight, Target } from 'lucide-react';
import { useMobilityState, MobilityProvider } from '../../../context/MobilityContext';

function MobilityWidgetInner({ setView, currentDate, privacyMode }) {
    const { sessions, loading } = useMobilityState();

    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Mes anterior
    const prevDate = useMemo(() => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() - 1);
        return d;
    }, [currentDate]);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const totals = useMemo(() => {
        const current = sessions.filter(s => s.date?.startsWith(monthKey));
        const prev    = sessions.filter(s => s.date?.startsWith(prevMonthKey));
        return {
            total:     current.reduce((a, s) => a + (s.total || 0), 0),
            hours:     current.reduce((a, s) => a + (s.hoursWorked || 0), 0),
            km:        current.reduce((a, s) => a + (s.kilometers || 0), 0),
            prevTotal: prev.reduce((a, s) => a + (s.total || 0), 0),
        };
    }, [sessions, monthKey, prevMonthKey]);

    const { total, hours, km, prevTotal } = totals;

    // Progreso vs mes anterior
    const hasPrevData  = prevTotal > 0;
    const progress     = hasPrevData ? Math.min(100, (total / prevTotal) * 100) : 0;
    const remaining    = hasPrevData ? Math.max(0, prevTotal - total) : 0;
    const exceeded     = hasPrevData && total >= prevTotal;

    // Color de la barra
    const barColor = exceeded
        ? 'from-emerald-400 to-green-500'
        : progress >= 75
        ? 'from-amber-400 to-orange-400'
        : 'from-violet-500 to-indigo-500';

    const fmt = (v) => privacyMode ? '••••' : `$${v.toLocaleString('es-AR')}`;

    return (
        <div
            onClick={() => setView('mobility')}
            className="h-full flex flex-col justify-center rounded-2xl p-5 shadow-sm border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-white/10 dark:to-white/5 dark:border-white/10 relative overflow-hidden group cursor-pointer transition-all active:scale-95"
        >
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-violet-200/50 to-indigo-200/50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:scale-110" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-violet-200 dark:bg-violet-500/20 p-2.5 rounded-xl text-violet-700 dark:text-violet-300">
                        <Car size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-gray-800 dark:text-white leading-tight">Movilidad</h3>
                        <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-white/50 tracking-wider">Ingresos del mes</p>
                    </div>
                </div>
                <button type="button" className="text-gray-400 dark:text-white/40 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Monto actual */}
            <div className="relative z-10">
                {loading && sessions.length === 0 ? (
                    <div className="animate-pulse flex gap-2 items-center">
                        <div className="h-8 w-24 bg-violet-200/50 dark:bg-white/10 rounded-lg" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-end gap-3 mb-3">
                            <p className="text-3xl font-extrabold text-violet-700 dark:text-violet-300 font-mono">
                                {fmt(total)}
                            </p>
                            {(hours > 0 || km > 0) && (
                                <p className="text-xs font-semibold text-gray-500 dark:text-white/60 mb-1.5 flex items-center gap-1.5 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg">
                                    <TrendingUp size={14} className="text-violet-500 dark:text-violet-400" />
                                    {hours}h · {km}km
                                </p>
                            )}
                        </div>

                        {/* Barra de progreso vs mes anterior */}
                        {hasPrevData && (
                            <div className="mt-1">
                                <div className="h-2 rounded-full bg-violet-100 dark:bg-white/10 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                    <div className="flex items-center gap-1">
                                        <Target size={11} className={exceeded ? 'text-emerald-500' : 'text-violet-400 dark:text-violet-300'} />
                                        {exceeded ? (
                                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                ¡Superaste el mes pasado! +{fmt(total - prevTotal)}
                                            </p>
                                        ) : (
                                            <p className="text-[11px] font-semibold text-gray-500 dark:text-white/40">
                                                Falta {fmt(remaining)} para igualar
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-white/30 font-mono">
                                        {Math.round(progress)}%
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Sin datos del mes anterior */}
                        {!hasPrevData && (
                            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">
                                Sin datos del mes anterior para comparar
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function MobilityWidget(props) {
    return <MobilityWidgetInner {...props} />;
}
