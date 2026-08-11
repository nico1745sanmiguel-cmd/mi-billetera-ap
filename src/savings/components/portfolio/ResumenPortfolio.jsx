import React from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, Info } from 'lucide-react';

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
    const secondaryTextColor = isGlass ? 'text-white/60' : 'text-gray-500';

    return (
        <div className={`rounded-3xl p-5 sm:p-6 ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                    <Wallet size={18} className="text-green-500" />
                    Distribución de Tenencias
                </h3>
                <select
                    value={chartView}
                    onChange={(e) => setChartView(e.target.value)}
                    className={`p-2 rounded-xl text-xs font-bold outline-none transition-all cursor-pointer ${
                        isGlass 
                            ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' 
                            : 'bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100'
                    }`}
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
                
                {/* ── GRÁFICO (COMPACTO) ── */}
                <div className="w-full md:w-5/12 h-48 sm:h-56 relative flex justify-center items-center">
                    {!privacyMode ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {chartData.type === '2-level' ? (
                                    <>
                                        <Pie
                                            data={chartData.innerData}
                                            cx="50%" cy="50%"
                                            innerRadius={0} outerRadius="60%"
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
                                            innerRadius="65%" outerRadius="85%"
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
                                        innerRadius="60%" outerRadius="85%"
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
                                    contentStyle={{ 
                                        backgroundColor: isGlass ? 'rgba(15, 23, 42, 0.9)' : 'white', 
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '16px', 
                                        border: isGlass ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f3f4f6',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: isGlass ? 'white' : 'black', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 border-dashed ${isGlass ? 'border-white/20 text-white/50' : 'border-gray-200 text-gray-400'}`}>
                            <span className="text-xs font-bold uppercase tracking-wider">Oculto</span>
                        </div>
                    )}
                </div>

                {/* ── LEYENDA + DISPONIBLE POR CARTERA ── */}
                <div className="w-full md:w-7/12 flex flex-col gap-4">
                    {/* Leyenda del gráfico */}
                    <div className="space-y-2 max-h-36 overflow-y-auto hide-scrollbar pr-2">
                        {(chartData.type === '2-level' ? chartData.innerData : chartData.outerData).map((d, i) => (
                            <div key={d.name} className={`flex justify-between items-center text-sm p-2 rounded-xl transition-colors ${isGlass ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.fill || COLORS[i % COLORS.length] }} />
                                    <span className={`font-bold truncate ${textColor}`} title={d.name}>{d.name}</span>
                                </div>
                                <span className={`font-black ${textColor}`}>{formatAmount(d.value, currencyView)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Fila "Disponible" por cartera (solo en visión general) */}
                    {chartView === 'general' && posicionesByCartera.some(c => c.liquidez && (c.liquidez.ARS > 0 || c.liquidez.USD > 0)) && (
                        <div className={`mt-2 p-3 rounded-2xl ${isGlass ? 'bg-white/5 border border-white/5' : 'bg-green-50 border border-green-100'}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Info size={14} className="text-green-500" />
                                <span className={`text-xs font-bold uppercase tracking-wider ${secondaryTextColor}`}>Líquido Disponible</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {posicionesByCartera.filter(c => c.liquidez && (c.liquidez.ARS > 0 || c.liquidez.USD > 0)).map(c => (
                                    <div key={`liq-${c.name}`} className="flex items-center gap-2 text-xs">
                                        <span className={`font-semibold ${secondaryTextColor}`}>{c.name}:</span>
                                        <div className="flex gap-1.5 font-black">
                                            {c.liquidez.ARS > 0 && <span className={textColor}>{arsFormatter.format(c.liquidez.ARS)}</span>}
                                            {c.liquidez.USD > 0 && <span className="text-green-500">{usdFormatter.format(c.liquidez.USD)}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
}
