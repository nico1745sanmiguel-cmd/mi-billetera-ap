import React, { useMemo } from 'react';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function MobilityHeatmap({ data, isGlass, privacyMode, fmt }) {
    const heatmapData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Inicializamos días
        const daysMap = DAYS.map(name => ({ name, short: name.slice(0, 3), total: 0, hours: 0, count: 0 }));

        data.forEach(s => {
            if (!s.date) return;
            // Parse local date correctly
            const d = new Date(s.date + 'T12:00:00');
            const dayOfWeek = d.getDay();
            daysMap[dayOfWeek].total += Number(s.total || 0);
            daysMap[dayOfWeek].hours += Number(s.hoursWorked || 0);
            daysMap[dayOfWeek].count += 1;
        });

        // Compute ganancia por hora promedio
        const result = daysMap.map(d => {
            const avgHour = d.hours > 0 ? d.total / d.hours : 0;
            return { ...d, avgHour };
        });

        return result;
    }, [data]);

    const maxAvg = Math.max(...heatmapData.map(d => d.avgHour), 1);
    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    if (!data || data.length === 0) return null;

    return (
        <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-4 ${sub}`}>Rentabilidad por Día (Promedio $/h)</p>
            <div className="space-y-3">
                {/* Desplazamos para que empiece en Lunes (índice 1 a 6, y luego 0) */}
                {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
                    const d = heatmapData[dayIndex];
                    if (d.count === 0) return null; // No mostrar si no hay datos

                    const pct = (d.avgHour / maxAvg) * 100;

                    return (
                        <div key={d.name} className="flex items-center group">
                            <span className={`w-8 text-[10px] font-bold uppercase ${text}`}>{d.short}</span>
                            <div className="flex-1 mx-3">
                                <div className={`h-6 rounded-md relative overflow-hidden ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <div 
                                        className="absolute top-0 left-0 h-full rounded-md bg-gradient-to-r from-violet-600/80 to-indigo-500/80 transition-all duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center px-2">
                                        <span className="text-[10px] font-semibold text-white drop-shadow-md z-10 mix-blend-overlay">
                                            {d.count} jornadas
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className={`w-16 text-right text-xs font-bold ${text}`}>
                                {privacyMode ? '••••' : `${fmt(d.avgHour)}/h`}
                            </span>
                        </div>
                    );
                })}
            </div>
            {heatmapData.every(d => d.count === 0) && (
                <p className={`text-center text-xs ${sub}`}>No hay suficientes datos</p>
            )}
        </div>
    );
}
