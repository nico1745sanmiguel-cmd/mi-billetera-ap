import React, { useMemo } from 'react';
import { PieChart, List, RotateCcw, AlertCircle } from 'lucide-react';
import { formatMoney } from '../../utils';

export default function StatementDashboard({ statement, isGlass, onReload }) {
    const transactions = statement?.transactions || [];

    const stats = useMemo(() => {
        if (!transactions.length) return null;

        const totals = transactions.reduce((acc, tx) => {
            if (tx.isPayment) return acc; // No sumar los pagos que el usuario hizo a la tarjeta
            const cat = tx.category || 'Varios';
            acc[cat] = (acc[cat] || 0) + (tx.amount || 0);
            return acc;
        }, {});

        const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0);

        const breakdown = Object.entries(totals)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        return { breakdown, totalSpent };
    }, [transactions]);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const subTextColor = isGlass ? 'text-white/60' : 'text-gray-500';
    const bgClass = isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100';

    if (!transactions.length) {
        return (
            <div className={`p-6 rounded-2xl text-center flex flex-col items-center gap-4 ${bgClass}`}>
                <AlertCircle className={`w-10 h-10 ${subTextColor} opacity-50`} />
                <div>
                    <p className={`font-bold ${textColor}`}>Sin detalle de consumos</p>
                    <p className={`text-xs ${subTextColor}`}>Este resumen fue cargado manualmente o no tiene detalles guardados.</p>
                </div>
                <button 
                    onClick={onReload}
                    type="button"
                    className="mt-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl hover:bg-emerald-500/20 transition-colors shadow-sm"
                >
                    Subir PDF para analizar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Cabecera del Dashboard */}
            <div className="flex justify-between items-end">
                <div>
                    <h4 className={`text-sm font-bold uppercase tracking-widest ${subTextColor} mb-1 flex items-center gap-2`}>
                        <PieChart size={14} /> Análisis del Mes
                    </h4>
                    <p className={`text-2xl font-black ${textColor}`}>
                        {formatMoney(stats.totalSpent)}
                    </p>
                </div>
                <button 
                    onClick={onReload}
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${isGlass ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    title="Volver a cargar el PDF"
                >
                    <RotateCcw size={12} />
                    Recargar
                </button>
            </div>

            {/* Barras de Categorías */}
            <div className="space-y-3">
                {stats.breakdown.map((item, idx) => (
                    <div key={item.category || idx} className="relative">
                        <div className="flex justify-between text-xs font-bold mb-1 relative z-10">
                            <span className={textColor}>{item.category}</span>
                            <span className={textColor}>{formatMoney(item.amount)}</span>
                        </div>
                        <div className={`h-2 w-full rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-200'}`}>
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                                style={{ width: `${item.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Listado Rápido de Movimientos */}
            <div className={`mt-6 p-4 rounded-2xl ${bgClass}`}>
                <h4 className={`text-xs font-bold uppercase tracking-widest ${subTextColor} mb-3 flex items-center gap-2`}>
                    <List size={14} /> Principales Movimientos
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {transactions.slice(0, 50).map((tx, i) => (
                        <div key={tx.id || i} className={`flex justify-between items-center pb-2 border-b last:border-0 ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                            <div className="flex-1 min-w-0 pr-2">
                                <p className={`text-xs font-bold truncate ${textColor}`}>
                                    {tx.cleanName || tx.originalDescription}
                                </p>
                                <p className={`text-[9px] uppercase tracking-wider ${subTextColor}`}>
                                    {tx.date} • {tx.category}
                                    {tx.isInstallment && tx.installmentTotal > 1 ? ` • ${tx.installmentCurrent}/${tx.installmentTotal}` : ''}
                                </p>
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <p className={`text-xs font-bold ${tx.isPayment ? 'text-emerald-500' : textColor}`}>
                                    {tx.isPayment ? '+' : ''}{formatMoney(tx.amount || 0)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
