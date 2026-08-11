import React from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpDown, Shield, ShoppingCart, ChevronRight } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const formatPercentage = (amount) => {
    return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

export default function TenenciasLista({
    posicionesByCartera,
    currencyView,
    isGlass,
    privacyMode,
    formatAmount,
    rate,
    requestSort,
    sortConfig,
    handleRowClick,
    handleSellClick,
    handleStopClick
}) {
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';
    const secondaryTextColor = isGlass ? 'text-white/60' : 'text-gray-500';

    return (
        <div className="space-y-6">
            {posicionesByCartera.map((carteraData, index) => {
                const hasLiquidez = carteraData.liquidez && (carteraData.liquidez.ARS !== 0 || carteraData.liquidez.USD !== 0);
                
                return (
                    <div key={carteraData.name} className={`rounded-3xl p-5 sm:p-6 overflow-hidden ${cardBg}`}>
                        {/* ── HEADER DE CARTERA ── */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 pb-4 border-b border-gray-200/20 gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                                    <Wallet size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className={`font-black text-xl ${textColor}`}>
                                        {carteraData.name}
                                    </h3>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${secondaryTextColor}`}>
                                        {carteraData.items.length} activos
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <div className={`text-xs font-bold uppercase tracking-wider ${secondaryTextColor}`}>
                                    Total {currencyView}
                                </div>
                                <div className={`text-2xl font-black ${textColor}`}>
                                    {formatAmount(currencyView === 'ARS' ? carteraData.totalARS : carteraData.totalUSD, currencyView)}
                                </div>
                            </div>
                        </div>

                        {/* ── DINERO LÍQUIDO ── */}
                        {hasLiquidez && (
                            <div className={`mb-6 p-4 rounded-2xl flex flex-wrap gap-6 items-center justify-between border ${isGlass ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                        <span className="font-black text-xs">$</span>
                                    </div>
                                    <div>
                                        <span className={`block text-xs font-bold uppercase tracking-wider ${isGlass ? 'text-green-300' : 'text-green-700'}`}>Dinero Líquido</span>
                                        <span className={`block text-xs ${isGlass ? 'text-green-300/70' : 'text-green-600/70'}`}>Disponible para operar</span>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    {carteraData.liquidez.ARS !== 0 && (
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isGlass ? 'text-green-300/70' : 'text-green-600/70'}`}>ARS</span>
                                            <span className={`font-black text-lg ${isGlass ? 'text-white' : 'text-green-800'}`}>{arsFormatter.format(carteraData.liquidez.ARS)}</span>
                                        </div>
                                    )}
                                    {carteraData.liquidez.USD !== 0 && (
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isGlass ? 'text-green-300/70' : 'text-green-600/70'}`}>USD</span>
                                            <span className={`font-black text-lg ${isGlass ? 'text-white' : 'text-green-800'}`}>{usdFormatter.format(carteraData.liquidez.USD)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── HEADER DE ORDENAMIENTO (Mobile-first) ── */}
                        {carteraData.items.length > 0 && (
                            <div className={`flex items-center gap-3 mb-3 px-2 text-[10px] font-bold uppercase tracking-wider ${secondaryTextColor}`}>
                                <span>Ordenar por:</span>
                                <button onClick={() => requestSort('variacionDiaria')} className="hover:text-green-500 transition-colors flex items-center">
                                    Var {sortConfig.key === 'variacionDiaria' && <ArrowUpDown size={10} className={`ml-0.5 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />}
                                </button>
                                <button onClick={() => requestSort('valorActualUSD')} className="hover:text-green-500 transition-colors flex items-center">
                                    Valor {sortConfig.key === 'valorActualUSD' && <ArrowUpDown size={10} className={`ml-0.5 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />}
                                </button>
                                <button onClick={() => requestSort('gananciaPérdidaUSD')} className="hover:text-green-500 transition-colors flex items-center">
                                    P&L {sortConfig.key === 'gananciaPérdidaUSD' && <ArrowUpDown size={10} className={`ml-0.5 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />}
                                </button>
                            </div>
                        )}

                        {/* ── LISTA DE INVERSIONES (TARJETAS) ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {carteraData.items.map(pos => {
                                const valueBase = currencyView === 'ARS' ? (pos.valorActualUSD * rate) : pos.valorActualUSD;
                                const pnlBase = currencyView === 'ARS' ? (pos.gananciaPérdidaUSD * rate) : pos.gananciaPérdidaUSD;
                                const isProfit = pos.gananciaPérdidaUSD >= 0;

                                const stopPrice = pos.stopLoss ? pos.stopLoss.stopPrecio : null;
                                
                                let stopStatus = 'none';
                                if (pos.stopLoss) {
                                    const currentPrice = pos.precioActualUSD;
                                    if (currentPrice <= stopPrice) stopStatus = 'triggered';
                                    else if (currentPrice <= stopPrice * 1.05) stopStatus = 'near';
                                    else stopStatus = 'normal';
                                }

                                const stopBadge = {
                                    none: { icon: Shield, cls: 'text-gray-400 bg-gray-500/10 border-gray-400/20' },
                                    normal: { icon: Shield, cls: 'text-green-500 bg-green-500/10 border-green-500/20' },
                                    near: { icon: Shield, cls: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20 animate-pulse' },
                                    triggered: { icon: Shield, cls: 'text-white bg-red-600 border-red-500 animate-bounce' }
                                }[stopStatus];

                                return (
                                    <div 
                                        key={`${pos.cartera}-${pos.especie}`}
                                        onClick={() => handleRowClick(pos)}
                                        className={`group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                                            isGlass 
                                                ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20' 
                                                : 'bg-white border-gray-100 hover:border-green-200 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Fila superior: Especie + Var */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className={`text-lg font-black leading-tight ${textColor}`}>{pos.especie}</h4>
                                                <p className={`text-xs font-semibold ${secondaryTextColor}`}>
                                                    {privacyMode ? '****' : pos.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })} unidades
                                                </p>
                                            </div>
                                            <div className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                                                pos.variacionDiaria > 0 
                                                    ? 'bg-green-500/10 text-green-500' 
                                                    : pos.variacionDiaria < 0 
                                                        ? 'bg-red-500/10 text-red-500' 
                                                        : isGlass ? 'bg-white/10 text-white/50' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {pos.variacionDiaria !== 0 ? (pos.variacionDiaria > 0 ? '+' : '') + formatPercentage(pos.variacionDiaria) : '-'}
                                            </div>
                                        </div>

                                        {/* Valores principales */}
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${secondaryTextColor}`}>Valor {currencyView}</p>
                                                <p className={`text-lg font-black ${textColor}`}>{formatAmount(valueBase, currencyView)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${secondaryTextColor}`}>P&L</p>
                                                <div className={`flex items-center justify-end gap-1 font-black ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    {formatAmount(Math.abs(pnlBase), currencyView)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fila inferior: Acciones rápidas (Stop Loss + Vender) */}
                                        <div className={`flex items-center justify-between pt-3 border-t mt-auto ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleStopClick(pos); }}
                                                className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${stopBadge.cls} ${isGlass ? 'hover:bg-white/20' : 'hover:bg-gray-100'}`}
                                                title={stopStatus === 'none' ? 'Configurar Stop Loss' : 'Ver Stop Loss'}
                                            >
                                                <stopBadge.icon size={16} />
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => handleSellClick(e, pos)}
                                                className={`flex items-center justify-center gap-2 px-4 h-10 rounded-xl font-bold text-xs transition-all ${
                                                    isGlass 
                                                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10' 
                                                        : 'bg-green-50 hover:bg-green-500 hover:text-white text-green-700 border border-green-100'
                                                }`}
                                            >
                                                <ShoppingCart size={14} /> 
                                                <span>Vender</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                );
            })}
        </div>
    );
}
