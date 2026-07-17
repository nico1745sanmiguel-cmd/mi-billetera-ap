import React from 'react';

const MobilityTrendChart = ({ trend6, maxTrend, monthKey, isGlass, privacyMode, fmt }) => {
    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const sub = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-4 ${sub}`}>Tendencia · últimos 6 meses</p>
            <div className="grid grid-cols-6 gap-1 items-end" style={{ height: '120px' }}>
                {trend6.map(({ label, total, gastos, key }) => {
                    const heightPct = maxTrend > 0 ? Math.max((total / maxTrend) * 100, total > 0 ? 4 : 0) : 0;
                    const gastosPct = maxTrend > 0 ? Math.max((gastos / maxTrend) * 100, gastos > 0 ? 4 : 0) : 0;
                    const isCurrentMonth = key === monthKey;
                    return (
                        <div key={key} className="flex flex-col items-center gap-0.5 h-full justify-end">
                            <div className="w-full flex flex-col items-center justify-end" style={{ height: '82px' }}>
                                <div
                                    className={`w-full rounded-t-md transition-all duration-700 ${
                                        isCurrentMonth
                                            ? 'bg-gradient-to-t from-violet-600 to-indigo-400'
                                            : isGlass
                                                ? 'bg-white/20'
                                                : 'bg-gray-200'
                                    }`}
                                    style={{ height: `${heightPct}%` }}
                                    title={fmt(total)}
                                />
                                {gastosPct > 0 && (
                                    <div
                                        className="w-full rounded-t-sm bg-red-400/60 -mt-0.5 transition-all duration-700"
                                        style={{ height: `${Math.min(gastosPct, heightPct * 0.8)}%` }}
                                        title={`Gastos: ${fmt(gastos)}`}
                                    />
                                )}
                            </div>
                            <span className={`text-[10px] font-medium leading-none mt-1 ${isCurrentMonth ? (isGlass ? 'text-violet-300' : 'text-violet-600') : sub}`}>
                                {label}
                            </span>
                            {!privacyMode && total > 0 && (
                                <span className={`hidden sm:block text-[9px] ${sub} leading-none`}>{fmt(total)}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-violet-600 to-indigo-400" />
                    <span className={`text-[10px] ${sub}`}>Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-400/60" />
                    <span className={`text-[10px] ${sub}`}>Gastos</span>
                </div>
            </div>
        </div>
    );
};

export default MobilityTrendChart;
