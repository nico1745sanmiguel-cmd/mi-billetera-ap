import React from 'react';

const MobilityWeeklyBreakdown = ({ weeks = [], totalEarnings = 0, isGlass, privacyMode, text, sub, fmt }) => {
    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;

    if (!weeks || weeks.length === 0) return null;

    const safeTotalEarnings = Number(totalEarnings) || 0;
    const maxScale = Math.max(
        safeTotalEarnings,
        ...weeks.map(w => Math.max(Number(w?.total) || 0, Number(w?.gastos) || 0)),
        1
    );

    return (
        <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Desglose semanal</p>
            <div className="space-y-2.5">
                {weeks.map((w, idx) => {
                    const totalVal = Number(w?.total) || 0;
                    const gastosVal = Number(w?.gastos) || 0;
                    const rawTotalPct = (totalVal / maxScale) * 100;
                    const rawGastosPct = (gastosVal / maxScale) * 100;

                    const totalPct = isNaN(rawTotalPct) ? 0 : Math.min(100, Math.max(0, rawTotalPct));
                    const gastosPct = isNaN(rawGastosPct) ? 0 : Math.min(100, Math.max(0, rawGastosPct));

                    return (
                        <div key={w?.label || idx}>
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold w-6 flex-shrink-0 ${text}`}>{w?.label || `S${idx + 1}`}</span>
                                <div className="flex-1 mx-2 min-w-0">
                                    <div className={`h-2 rounded-full mb-0.5 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                        <div
                                            className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700"
                                            style={{ width: `${totalPct}%` }}
                                        />
                                    </div>
                                    {gastosVal > 0 && (
                                        <div className={`h-1.5 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                            <div
                                                className="h-1.5 rounded-full bg-red-400/70 transition-all duration-700"
                                                style={{ width: `${gastosPct}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-xs font-bold ${text}`}>
                                        {privacyMode ? '••••' : fmt(totalVal)}
                                    </p>
                                    {gastosVal > 0 && (
                                        <p className={`text-[10px] ${isGlass ? 'text-red-300' : 'text-red-500'}`}>
                                            {privacyMode ? '••••' : `-${fmt(gastosVal)}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MobilityWeeklyBreakdown;
