import React from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpDown, Shield, ShoppingCart } from 'lucide-react';

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

    const renderSortIcon = (columnName) => {
        if (sortConfig.key === columnName) {
            return <ArrowUpDown size={14} className={`inline-block ml-1 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
        }
        return <ArrowUpDown size={14} className="inline-block ml-1 opacity-30 hover:opacity-100 transition-opacity" />;
    };

    return (
        <div className="space-y-4">
            {posicionesByCartera.map((carteraData, index) => (
                <div key={carteraData.name} className={`rounded-3xl p-6 overflow-hidden ${cardBg}`}>
                    <div className="flex justify-between items-end mb-4 border-b border-gray-200/20 pb-3">
                        <div>
                            <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {carteraData.name}
                            </h3>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs font-semibold uppercase tracking-wider ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                                Total {currencyView}
                            </div>
                            <div className={`text-lg font-black ${textColor}`}>
                                {formatAmount(currencyView === 'ARS' ? carteraData.totalARS : carteraData.totalUSD, currencyView)}
                            </div>
                        </div>
                    </div>

                    {/* Mostrar Liquidez si hay */}
                    {carteraData.liquidez && (carteraData.liquidez.ARS > 0 || carteraData.liquidez.USD > 0 || carteraData.liquidez.ARS < 0 || carteraData.liquidez.USD < 0) && (
                        <div className={`mb-4 p-3 rounded-2xl flex flex-wrap gap-4 items-center justify-between ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className={`text-sm font-bold flex items-center gap-2 ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                                <Wallet size={16} /> Dinero Líquido
                            </div>
                            <div className="flex gap-4">
                                {carteraData.liquidez.ARS !== 0 && (
                                    <div className="text-right">
                                        <span className={`text-xs block ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>ARS</span>
                                        <span className={`font-black ${textColor}`}>{arsFormatter.format(carteraData.liquidez.ARS)}</span>
                                    </div>
                                )}
                                {carteraData.liquidez.USD !== 0 && (
                                    <div className="text-right">
                                        <span className={`text-xs block ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>USD</span>
                                        <span className={`font-black ${textColor}`}>{usdFormatter.format(carteraData.liquidez.USD)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className={isGlass ? 'text-white/50' : 'text-gray-400'}>
                                    <th className="pb-3 font-semibold cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('especie')}>
                                        Activo {renderSortIcon('especie')}
                                    </th>
                                    <th className="pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('variacionDiaria')}>
                                        Var. 24h {renderSortIcon('variacionDiaria')}
                                    </th>
                                    <th className="hidden md:table-cell pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('cantidad')}>
                                        Cant. {renderSortIcon('cantidad')}
                                    </th>
                                    <th className="hidden md:table-cell pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('precioActualUSD')}>
                                        Precio Actual {renderSortIcon('precioActualUSD')}
                                    </th>
                                    <th className="hidden md:table-cell pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('valorActualUSD')}>
                                        Valor {currencyView} {renderSortIcon('valorActualUSD')}
                                    </th>
                                    <th className="pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('gananciaPérdidaUSD')}>
                                        P&L {renderSortIcon('gananciaPérdidaUSD')}
                                    </th>
                                    <th className="pb-3 font-semibold text-right">
                                        Acción
                                    </th>
                                    <th className="pb-3 font-semibold text-right">
                                        Stop Loss (T)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/20">
                                {carteraData.items.map(pos => {
                                    const valueBase = currencyView === 'ARS' ? (pos.valorActualUSD * rate) : pos.valorActualUSD;
                                    const priceBase = currencyView === 'ARS' ? (pos.precioActualUSD * rate) : pos.precioActualUSD;
                                    const pnlBase = currencyView === 'ARS' ? (pos.gananciaPérdidaUSD * rate) : pos.gananciaPérdidaUSD;
                                    const isProfit = pos.gananciaPérdidaUSD >= 0;

                                    const stopPrice = pos.stopLoss ? pos.stopLoss.stopPrecio : null;
                                    const stopPriceBase = stopPrice && (currencyView === 'ARS' ? (stopPrice * rate) : stopPrice);
                                    
                                    let stopStatus = 'none'; // 'none', 'normal', 'near', 'triggered'
                                    if (pos.stopLoss) {
                                        const currentPrice = pos.precioActualUSD;
                                        if (currentPrice <= stopPrice) {
                                            stopStatus = 'triggered';
                                        } else if (currentPrice <= stopPrice * 1.05) {
                                            stopStatus = 'near';
                                        } else {
                                            stopStatus = 'normal';
                                        }
                                    }

                                    const stopBadge = {
                                        none: { text: '+ Configurar', cls: 'text-gray-400 hover:text-red-400 hover:border-red-400/50 border border-dashed border-gray-400/30' },
                                        normal: { text: formatAmount(stopPriceBase, currencyView), cls: 'text-green-500 border border-green-500/20 bg-green-500/5' },
                                        near: { text: formatAmount(stopPriceBase, currencyView), cls: 'text-yellow-500 border border-yellow-500/20 bg-yellow-500/5 animate-pulse' },
                                        triggered: { text: '🚨 STOPPED', cls: 'text-white border border-red-500 bg-red-600 animate-bounce' }
                                    }[stopStatus];

                                    return (
                                        <tr 
                                            key={`${pos.cartera}-${pos.especie}`} 
                                            className="hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => handleRowClick(pos)}
                                        >
                                            <td className={`py-4 font-bold ${textColor}`}>{pos.especie}</td>
                                            <td className={`py-4 text-right font-bold ${pos.variacionDiaria >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {pos.variacionDiaria !== 0 ? (pos.variacionDiaria > 0 ? '+' : '') + formatPercentage(pos.variacionDiaria) : '-'}
                                            </td>
                                            <td className={`hidden md:table-cell py-4 text-right font-medium ${textColor}`}>
                                                {privacyMode ? '****' : pos.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
                                            </td>
                                            <td className={`hidden md:table-cell py-4 text-right ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                                                {formatAmount(priceBase, currencyView)}
                                            </td>
                                            <td className={`hidden md:table-cell py-4 text-right font-bold ${textColor}`}>
                                                {formatAmount(valueBase, currencyView)}
                                            </td>
                                            <td className={`py-4 text-right font-bold flex justify-end items-center gap-1 ${
                                                isProfit ? 'text-green-500' : 'text-red-500'
                                            }`}>
                                                {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {formatAmount(Math.abs(pnlBase), currencyView)}
                                                <span className="text-xs opacity-70 ml-1">
                                                    ({isProfit ? '+' : ''}{formatPercentage(pos.gananciaPorcentaje)})
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button 
                                                    onClick={(e) => handleSellClick(e, pos)}
                                                    className={`p-2 rounded-xl transition-all font-bold text-xs flex items-center justify-end w-full gap-1 ${
                                                        isGlass 
                                                        ? 'text-white/70 hover:text-white bg-white/10 hover:bg-white/20' 
                                                        : 'text-gray-500 hover:text-white bg-gray-100 hover:bg-red-500 hover:shadow-md'
                                                    }`}
                                                >
                                                    <ShoppingCart size={14} /> Vender
                                                </button>
                                            </td>
                                            <td className="py-4 text-right" onClick={(e) => { e.stopPropagation(); handleStopClick(pos); }}>
                                                 <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${stopBadge.cls}`}>
                                                     <Shield size={12} />
                                                     {stopBadge.text}
                                                 </span>
                                             </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
