import React from 'react';

const MobilityTrendChart = ({ trend6 = [], maxTrend = 0, monthKey, isGlass, privacyMode, fmt }) => {
    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const sub = isGlass ? 'text-white/50' : 'text-gray-400';

    const chartMax = Math.max(
        maxTrend || 0,
        ...trend6.map(t => Math.max(Number(t.total) || 0, Number(t.gastos) || 0)),
        1
    );

    return (
        <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-4 ${sub}`}>Tendencia · últimos 6 meses</p>
            <div className="grid grid-cols-6 gap-1 items-end" style={{ height: '120px' }}>
                {trend6.map(({ label, total, gastos, key }) => {
                    const totalVal = Number(total) || 0;
                    const gastosVal = Number(gastos) || 0;
                    const heightPct = chartMax > 0 ? (totalVal / chartMax) * 100 : 0;
                    const gastosPct = chartMax > 0 ? (gastosVal / chartMax) * 100 : 0;

                    const totalBarHeight = totalVal > 0 ? Math.min(100, Math.max(heightPct, 4)) : 0;
                    const gastosBarHeight = gastosVal > 0 ? Math.min(100, Math.max(gastosPct, 4)) : 0;

                    const isCurrentMonth = key === monthKey;
                    const isDeficit = gastosVal > totalVal && gastosVal > 0;

                    return (
                        <div key={key} className="flex flex-col items-center h-full justify-end group">
                            {/* Barras agrupadas lado a lado */}
                            <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5" style={{ height: '82px' }}>
                                {/* Barra de Ingresos */}
                                <div className="w-1/2 max-w-[14px] flex flex-col justify-end h-full">
                                    {totalVal > 0 ? (
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-700 ${
                                                isCurrentMonth
                                                    ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/20'
                                                    : isGlass
                                                        ? 'bg-emerald-400/50 group-hover:bg-emerald-400/75'
                                                        : 'bg-emerald-500/70 group-hover:bg-emerald-600/90'
                                            }`}
                                            style={{ height: `${totalBarHeight}%` }}
                                            title={privacyMode ? 'Ingresos: ••••' : `Ingresos: ${fmt(totalVal)}`}
                                        />
                                    ) : (
                                        <div className={`w-full h-1 rounded-full ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`} />
                                    )}
                                </div>

                                {/* Barra de Gastos */}
                                <div className="w-1/2 max-w-[14px] flex flex-col justify-end h-full">
                                    {gastosVal > 0 ? (
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-700 ${
                                                isCurrentMonth
                                                    ? 'bg-gradient-to-t from-rose-600 to-amber-500 shadow-sm shadow-rose-500/20'
                                                    : isGlass
                                                        ? 'bg-rose-400/50 group-hover:bg-rose-400/75'
                                                        : 'bg-rose-400/70 group-hover:bg-rose-500/90'
                                            }`}
                                            style={{ height: `${gastosBarHeight}%` }}
                                            title={privacyMode ? 'Gastos: ••••' : `Gastos: ${fmt(gastosVal)}${isDeficit ? ' (Déficit)' : ''}`}
                                        />
                                    ) : (
                                        <div className={`w-full h-1 rounded-full ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`} />
                                    )}
                                </div>
                            </div>

                            <span className={`text-[10px] font-semibold leading-none mt-2 ${isCurrentMonth ? (isGlass ? 'text-violet-300' : 'text-violet-600') : sub}`}>
                                {label}
                            </span>
                            {!privacyMode && (
                                <span className={`hidden sm:block text-[9px] leading-none mt-1 ${isDeficit ? (isGlass ? 'text-rose-300 font-semibold' : 'text-rose-600 font-semibold') : sub}`}>
                                    {fmt(totalVal)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" />
                        <span className={`text-[10px] font-medium ${sub}`}>Ingresos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-rose-600 to-amber-500" />
                        <span className={`text-[10px] font-medium ${sub}`}>Gastos</span>
                    </div>
                </div>
                <span className={`text-[9px] ${sub}`}>6 meses</span>
            </div>
        </div>
    );
};

export default MobilityTrendChart;
