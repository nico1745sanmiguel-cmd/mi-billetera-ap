import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export default function StatsDetails({
    filter,
    chartData,
    showMoney,
    cardsStatus,
    scopedServices,
    currentMonthKey,
    cashTransactions,
    CAT_LABELS,
    superEffective,
    superSpent,
    superProjected,
    freshEffective,
    freshSpent,
    freshProjected,
    currentChartTotal,
    glassClass,
    glassTextPrimary,
    glassTextSecondary,
    isGlass
}) {
    return (
        <div className="space-y-4">
            <h3 className={`font-bold text-sm px-2 ${glassTextPrimary}`}>Detalle del Segmento</h3>
            
            {/* VIEW: ALL */}
            {filter === 'all' && (
                <div className="grid grid-cols-2 gap-3">
                    {chartData.map((item, idx) => (
                        <div key={item.name || idx} className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${glassClass}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className={`text-xs font-bold ${glassTextSecondary}`}>{item.name}</span>
                            </div>
                            <span className={`text-lg font-black ${glassTextPrimary}`}>{showMoney(item.value)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* VIEW: CARDS & SERVICES */}
            {filter === 'cards_services' && (
                <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <p className="text-xs font-bold uppercase opacity-50 mb-3">Tarjetas</p>
                        <div className="space-y-3">
                            {cardsStatus.map(card => (
                                <div key={card.id} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{card.name}</span>
                                        <span className="text-[10px] opacity-60">{card.details.length} consumos</span>
                                    </div>
                                    <span className="font-mono font-bold">{showMoney(card.currentMonthDebt)}</span>
                                </div>
                            ))}
                            {cardsStatus.length === 0 && <p className="text-xs opacity-50">Sin consumos</p>}
                        </div>
                    </div>
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <p className="text-xs font-bold uppercase opacity-50 mb-3">Servicios Fijos</p>
                        <div className="space-y-3">
                            {scopedServices.map(s => {
                                const isPaid = s.paidPeriods?.includes(currentMonthKey);
                                return (
                                    <div key={s.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            {isPaid ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="opacity-30" />}
                                            <span className={`font-bold ${isPaid ? 'opacity-70 line-through' : ''}`}>{s.name}</span>
                                        </div>
                                        <span className={`font-mono font-bold ${isPaid ? 'opacity-70' : ''}`}>{showMoney(Number(s.amount))}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: MANUAL */}
            {filter === 'manual' && (
                <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                    <div className="space-y-4 mb-6">
                        {chartData.map((cat) => (
                            <div key={cat.name}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <cat.icon size={16} className="opacity-70" />
                                        <span className="text-sm font-bold">{cat.name}</span>
                                    </div>
                                    <span className="font-mono font-bold">{showMoney(cat.value)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(cat.value / currentChartTotal) * 100}%`, backgroundColor: cat.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Listado de Movimientos Manuales */}
                    <div className={`pt-4 border-t ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                        <h4 className={`text-xs font-bold uppercase opacity-50 mb-3 ${glassTextPrimary}`}>Movimientos Registrados</h4>
                        <div className="space-y-3">
                            {cashTransactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${glassTextPrimary}`}>{t.description || 'Gasto General'}</span>
                                        <span className={`text-[10px] ${glassTextSecondary}`}>
                                            {t.date} • {CAT_LABELS[t.category] || t.category || 'Varios'}
                                        </span>
                                    </div>
                                    <span className={`font-mono font-bold ${glassTextPrimary}`}>{showMoney(t.amount)}</span>
                                </div>
                            ))}
                            {cashTransactions.length === 0 && <p className={`text-xs ${glassTextSecondary}`}>Sin movimientos este mes</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: SUPER & FRESH */}
            {filter === 'super_fresh' && (
                <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold uppercase opacity-50">Resumen Supermercado</p>
                            <span className="font-mono font-bold text-sm">{showMoney(superEffective)}</span>
                        </div>
                        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500" style={{ width: `${superProjected > 0 ? (superSpent/superProjected)*100 : 0}%`}}></div>
                        </div>
                        <p className="text-[10px] text-right mt-1 opacity-60">Gastado: {showMoney(superSpent)} / Proyectado: {showMoney(superProjected)}</p>
                    </div>
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold uppercase opacity-50">Resumen Feria</p>
                            <span className="font-mono font-bold text-sm">{showMoney(freshEffective)}</span>
                        </div>
                        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${freshProjected > 0 ? (freshSpent/freshProjected)*100 : 0}%`}}></div>
                        </div>
                        <p className="text-[10px] text-right mt-1 opacity-60">Gastado: {showMoney(freshSpent)} / Proyectado: {showMoney(freshProjected)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
