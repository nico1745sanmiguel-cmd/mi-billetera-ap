import React, { useMemo } from 'react';
import { Car, TrendingUp, ChevronRight } from 'lucide-react';
import { useMobilityState, MobilityProvider } from '../../../context/MobilityContext';

function MobilityWidgetInner({ setView, currentDate, privacyMode }) {
    const { sessions, loading } = useMobilityState();
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const filtered = useMemo(() =>
        sessions.filter(s => s.date?.startsWith(monthKey)),
        [sessions, monthKey]
    );

    const totals = useMemo(() => {
        return {
            total: filtered.reduce((a, s) => a + (s.total || 0), 0),
            hours: filtered.reduce((a, s) => a + (s.hoursWorked || 0), 0),
            km:    filtered.reduce((a, s) => a + (s.kilometers || 0), 0),
        };
    }, [filtered]);

    return (
        <div 
            onClick={() => setView('mobility')}
            className="rounded-2xl p-5 shadow-sm border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-white/10 dark:to-white/5 dark:border-white/10 relative overflow-hidden group cursor-pointer transition-all active:scale-95"
        >
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-violet-200/50 to-indigo-200/50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:scale-110"></div>
            
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
                <button className="text-gray-400 dark:text-white/40 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="relative z-10">
                {loading && filtered.length === 0 ? (
                    <div className="animate-pulse flex gap-2 items-center">
                        <div className="h-8 w-24 bg-violet-200/50 dark:bg-white/10 rounded-lg"></div>
                    </div>
                ) : (
                    <div className="flex items-end gap-3">
                        <p className="text-3xl font-extrabold text-violet-700 dark:text-violet-300">
                            {privacyMode ? '••••' : `$${totals.total.toLocaleString('es-AR')}`}
                        </p>
                        {(totals.hours > 0 || totals.km > 0) && (
                            <p className="text-xs font-semibold text-gray-500 dark:text-white/60 mb-1.5 flex items-center gap-1.5 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg">
                                <TrendingUp size={14} className="text-violet-500 dark:text-violet-400" />
                                {totals.hours}h · {totals.km}km
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// El Provider ahora está en main.jsx
export default function MobilityWidget(props) {
    return <MobilityWidgetInner {...props} />;
}
