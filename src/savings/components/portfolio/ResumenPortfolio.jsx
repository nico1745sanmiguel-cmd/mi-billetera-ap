import React from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function ResumenPortfolio({
    isGlass,
    privacyMode,
    currencyView,
    formatAmount,
    chartView,
    setChartView,
    posicionesByCartera,
    chartData
}) {
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';

    return (
        <div className={`rounded-3xl p-6 ${cardBg}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                    <Wallet size={18} />
                    Distribución de Tenencias
                </h3>
                <select
                    value={chartView}
                    onChange={(e) => setChartView(e.target.value)}
                    className={`p-2 rounded-xl text-sm font-semibold outline-none transition-all ${isGlass ? 'bg-white/10 text-white border border-white/20' : 'bg-gray-50 text-gray-800 border border-gray-200 focus:border-green-500'}`}
                >
                    <option value="general">Visión General (Anillos)</option>
                    <option value="global">Todas las tenencias (Agrupadas)</option>
                    <optgroup label="Por Cartera">
                        {posicionesByCartera.map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                    </optgroup>
                </select>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-1/2 h-64 relative">
                    {!privacyMode ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {chartData.type === '2-level' ? (
                                    <>
                                        <Pie
                                            data={chartData.innerData}
                                            cx="50%" cy="50%"
                                            innerRadius={0} outerRadius={60}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.innerData.map((entry, index) => (
                                                <Cell key={`cell-inner-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Pie
                                            data={chartData.outerData}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.outerData.map((entry, index) => (
                                                <Cell key={`cell-outer-${index}`} fill={entry.parentFill} opacity={0.8} />
                                            ))}
                                        </Pie>
                                    </>
                                ) : (
                                    <Pie
                                        data={chartData.outerData}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.outerData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                )}
                                <Tooltip
                                    formatter={(val) => currencyView === 'USD' ? usdFormatter.format(val) : arsFormatter.format(val)}
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
                <div className="w-full md:w-1/2 space-y-3 max-h-64 overflow-y-auto hide-scrollbar pr-2">
                    {(chartData.type === '2-level' ? chartData.innerData : chartData.outerData).map((d, i) => (
                        <div key={d.name} className="flex justify-between items-center text-sm font-bold">
                            <div className="flex items-center gap-2 truncate">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.fill || COLORS[i % COLORS.length] }} />
                                <span className={`truncate ${isGlass ? 'text-white/80' : 'text-gray-600'}`} title={d.name}>{d.name}</span>
                            </div>
                            <span className={textColor}>{formatAmount(d.value, currencyView)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
