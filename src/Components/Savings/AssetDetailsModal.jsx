import React from 'react';
import { X, TrendingUp, TrendingDown, Info, DollarSign, Activity } from 'lucide-react';
import { getAssetDescription } from '../../utils/assetDescriptions';
import { useFinancial } from '../../context/FinancialContext';

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const formatAmount = (amount, currency) => {
    return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
};

const formatPercentage = (amount) => {
    return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

export default function AssetDetailsModal({ isOpen, onClose, asset, currencyView, isGlass, rate }) {
    if (!isOpen || !asset) return null;

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const bgClass = isGlass ? 'bg-[#0f0c29]/90 border border-white/20 backdrop-blur-xl' : 'bg-white';
    const secondaryTextColor = isGlass ? 'text-white/70' : 'text-gray-500';

    const valueBase = currencyView === 'ARS' ? (asset.valorActualUSD * rate) : asset.valorActualUSD;
    const priceBase = currencyView === 'ARS' ? (asset.precioActualUSD * rate) : asset.precioActualUSD;
    const pnlBase = currencyView === 'ARS' ? (asset.gananciaPérdidaUSD * rate) : asset.gananciaPérdidaUSD;
    const investmentBase = currencyView === 'ARS' ? (asset.inversionTotalUSD * rate) : asset.inversionTotalUSD;
    const isProfit = asset.gananciaPérdidaUSD >= 0;

    const description = getAssetDescription(asset.especie);

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 sm:pt-16 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
            <div className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl p-6 md:p-8 animate-scale-in ${bgClass}`}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className={`text-2xl font-black flex items-center gap-2 ${textColor}`}>
                            {asset.especie}
                        </h2>
                        <span className={`text-sm font-semibold uppercase tracking-wider ${secondaryTextColor}`}>
                            {asset.cartera}
                        </span>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Description */}
                <div className={`p-4 rounded-2xl mb-6 flex gap-3 ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <p className={`text-sm leading-relaxed ${textColor}`}>
                        {description}
                    </p>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className={`text-xs font-semibold mb-1 ${secondaryTextColor}`}>Cantidad</div>
                        <div className={`text-lg font-bold ${textColor}`}>
                            {asset.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
                        </div>
                    </div>
                    <div className={`p-4 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className={`text-xs font-semibold mb-1 ${secondaryTextColor}`}>Precio Actual</div>
                        <div className={`text-lg font-bold ${textColor}`}>
                            {formatAmount(priceBase, currencyView)}
                        </div>
                    </div>
                </div>

                {/* Performance Section */}
                <div className={`p-5 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 ${textColor}`}>
                        <Activity size={16} /> Rendimiento de la Inversión
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-500/20 pb-2">
                            <span className={secondaryTextColor}>Inversión Total</span>
                            <span className={`font-semibold ${textColor}`}>{formatAmount(investmentBase, currencyView)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-500/20 pb-2">
                            <span className={secondaryTextColor}>Valor Actual</span>
                            <span className={`font-semibold ${textColor}`}>{formatAmount(valueBase, currencyView)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className={secondaryTextColor}>Ganancia / Pérdida</span>
                            <div className={`font-black flex items-center gap-1 ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {formatAmount(Math.abs(pnlBase), currencyView)}
                                <span className="text-sm opacity-80 ml-1">
                                    ({isProfit ? '+' : ''}{formatPercentage(asset.gananciaPorcentaje)})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Variación Diaria si está disponible */}
                {asset.variacionDiaria !== 0 && (
                    <div className="mt-4 text-center">
                        <span className={`text-sm ${secondaryTextColor}`}>Variación 24hs: </span>
                        <span className={`text-sm font-bold ${asset.variacionDiaria > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {asset.variacionDiaria > 0 ? '+' : ''}{formatPercentage(asset.variacionDiaria)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
