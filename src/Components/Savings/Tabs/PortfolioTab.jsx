import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useSavings } from '../../../context/SavingsContext';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function PortfolioTab({ isGlass, privacyMode }) {
    const { posiciones } = useSavings();

    const formatAmount = (amount, formatter) => privacyMode ? '****' : formatter.format(amount);

    // Agrupar por cartera para el chart
    const dataByCartera = useMemo(() => {
        const ag = {};
        posiciones.forEach(p => {
            ag[p.cartera] = (ag[p.cartera] || 0) + p.valorActualUSD;
        });
        return Object.keys(ag).map(c => ({ name: c, value: ag[c] })).filter(d => d.value > 0);
    }, [posiciones]);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';

    if (posiciones.length === 0) {
        return (
            <div className={`text-center p-8 rounded-2xl ${cardBg}`}>
                <p className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                    Todavía no agregaste operaciones a tu portafolio.<br/>Hacé clic en "Nueva Operación" para empezar.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Distribución de Carteras */}
            <div className={`rounded-3xl p-6 ${cardBg}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${textColor}`}>
                    <Wallet size={18} />
                    Distribución por Cartera
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-1/2 h-48 relative">
                        {!privacyMode ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataByCartera}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {dataByCartera.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val) => usdFormatter.format(val)}
                                        contentStyle={{ backgroundColor: isGlass ? 'rgba(0,0,0,0.8)' : 'white', borderRadius: '12px', border: 'none' }}
                                        itemStyle={{ color: isGlass ? 'white' : 'black' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className={isGlass ? 'text-white/50' : 'text-gray-400'}>Oculto por privacidad</span>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-1/2 space-y-3">
                        {dataByCartera.map((d, i) => (
                            <div key={d.name} className="flex justify-between items-center text-sm font-bold">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className={isGlass ? 'text-white/80' : 'text-gray-600'}>{d.name}</span>
                                </div>
                                <span className={textColor}>{formatAmount(d.value, usdFormatter)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posiciones Abiertas */}
            <div className={`rounded-3xl p-6 overflow-hidden ${cardBg}`}>
                <h3 className={`font-bold mb-4 ${textColor}`}>Posiciones Abiertas</h3>
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className={isGlass ? 'text-white/50' : 'text-gray-400'}>
                                <th className="pb-3 font-semibold">Activo</th>
                                <th className="pb-3 font-semibold">Cartera</th>
                                <th className="pb-3 font-semibold text-right">Cant.</th>
                                <th className="pb-3 font-semibold text-right">Precio Actual</th>
                                <th className="pb-3 font-semibold text-right">Valor USD</th>
                                <th className="pb-3 font-semibold text-right">P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/20">
                            {posiciones.map(pos => {
                                const isProfit = pos.gananciaPérdidaUSD >= 0;
                                return (
                                    <tr key={`${pos.cartera}-${pos.especie}`} className="hover:bg-white/5 transition-colors">
                                        <td className={`py-4 font-bold ${textColor}`}>{pos.especie}</td>
                                        <td className={`py-4 ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>{pos.cartera}</td>
                                        <td className={`py-4 text-right font-medium ${textColor}`}>
                                            {privacyMode ? '****' : pos.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
                                        </td>
                                        <td className={`py-4 text-right ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                                            {formatAmount(pos.precioActualUSD, usdFormatter)}
                                        </td>
                                        <td className={`py-4 text-right font-bold ${textColor}`}>
                                            {formatAmount(pos.valorActualUSD, usdFormatter)}
                                        </td>
                                        <td className={`py-4 text-right font-bold flex justify-end items-center gap-1 ${
                                            isProfit ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                            {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {formatAmount(Math.abs(pos.gananciaPérdidaUSD), usdFormatter)}
                                            <span className="text-xs opacity-70 ml-1">
                                                ({isProfit ? '+' : ''}{pos.gananciaPorcentaje.toFixed(2)}%)
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
