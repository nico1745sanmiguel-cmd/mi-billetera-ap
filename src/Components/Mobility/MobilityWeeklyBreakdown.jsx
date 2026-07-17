import React from 'react';

const MobilityWeeklyBreakdown = ({ weeks, totalEarnings, isGlass, privacyMode, text, sub, fmt }) => {
    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;

    if (!weeks || weeks.length === 0) return null;

    return (
        <div className={card}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Desglose semanal</p>
            <div className="space-y-2.5">
                {weeks.map(w => (
                    <div key={w.label}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold w-6 flex-shrink-0 ${text}`}>{w.label}</span>
                            <div className="flex-1 mx-2 min-w-0">
                                <div className={`h-2 rounded-full mb-0.5 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700"
                                        style={{ width: `${totalEarnings > 0 ? (w.total / totalEarnings) * 100 : 0}%` }}
                                    />
                                </div>
                                {w.gastos > 0 && (
                                    <div className={`h-1.5 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                        <div
                                            className="h-1.5 rounded-full bg-red-400/70 transition-all duration-700"
                                            style={{ width: `${totalEarnings > 0 ? (w.gastos / totalEarnings) * 100 : 0}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className={`text-xs font-bold ${text}`}>
                                    {privacyMode ? '••' : fmt(w.total)}
                                </p>
                                {w.gastos > 0 && (
                                    <p className={`text-[10px] ${isGlass ? 'text-red-300' : 'text-red-500'}`}>
                                        {privacyMode ? '••' : `-${fmt(w.gastos)}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MobilityWeeklyBreakdown;
