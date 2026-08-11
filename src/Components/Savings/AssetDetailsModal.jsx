import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Info, Activity, Shield, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAssetDescription } from '../../utils/assetDescriptions';
import { useSavings } from '../../context/SavingsContext';

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const formatAmount = (amount, currency) => {
    return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
};

const formatPercentage = (amount) => {
    return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

// ─── Panel de Venta Rápida ─────────────────────────────────────────────────────
function QuickSellPanel({ asset, isGlass, currencyView, rate, textColor, secondaryTextColor, onClose }) {
    const { addSavingsTransaction } = useSavings();

    const lastOp = asset.operaciones?.slice().reverse().find(op => op.tipo === 'compra' || op.tipo === 'deposito');
    const monedaVenta = lastOp?.monedaPrecio || 'USD';

    const precioVenta = monedaVenta === 'ARS'
        ? (asset.precioActualUSD * rate)
        : asset.precioActualUSD;

    const [modo, setModo] = useState(null); // null | 'total' | 'parcial'
    const [cantidadParcial, setCantidadParcial] = useState('');
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const cantidadTotal = asset.cantidad;
    const cantidadAVender = modo === 'total'
        ? cantidadTotal
        : (parseFloat(cantidadParcial) || 0);

    const montoResultante = cantidadAVender * precioVenta;
    const formatter = monedaVenta === 'ARS' ? arsFormatter : usdFormatter;

    const handleConfirm = async () => {
        if (cantidadAVender <= 0 || cantidadAVender > cantidadTotal) {
            setError('Cantidad inválida.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const fecha = new Date().toISOString();

            // 1. Registrar la venta del activo
            await addSavingsTransaction({
                cartera: asset.cartera,
                especie: asset.especie,
                tipo: 'venta',
                cantidad: cantidadAVender,
                precioUnitario: precioVenta,
                monedaPrecio: monedaVenta,
                fecha,
                nota: modo === 'total' ? 'Venta total desde portafolio' : 'Venta parcial desde portafolio',
            });

            // 2. Registrar el dinero resultante como depósito líquido en la misma cartera
            await addSavingsTransaction({
                cartera: asset.cartera,
                especie: monedaVenta, // 'ARS' o 'USD'
                tipo: 'deposito',
                cantidad: montoResultante,
                precioUnitario: 1,
                monedaPrecio: monedaVenta,
                fecha,
                nota: `Líquido por venta de ${asset.especie}`,
            });

            setDone(true);
            setTimeout(() => onClose(), 1800);
        } catch (e) {
            console.error(e);
            setError('Error al registrar la venta. Intentá de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = `w-full p-3 rounded-xl text-sm font-bold outline-none transition-all ${
        isGlass
            ? 'bg-white/10 text-white border border-white/20 focus:border-green-400 placeholder-white/30'
            : 'bg-gray-50 text-gray-800 border border-gray-200 focus:border-green-500 focus:bg-white'
    }`;

    if (done) {
        return (
            <div className={`mb-6 p-5 rounded-2xl flex flex-col items-center gap-2 ${isGlass ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-100'}`}>
                <CheckCircle2 size={32} className="text-green-500" />
                <p className="font-black text-green-500">¡Venta registrada!</p>
                <p className={`text-xs text-center ${secondaryTextColor}`}>
                    {formatter.format(montoResultante)} quedaron como dinero líquido en <strong>{asset.cartera}</strong>.
                </p>
            </div>
        );
    }

    if (!modo) {
        return (
            <button
                type="button"
                onClick={() => setModo('elegir')}
                className="w-full mb-6 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
                <DollarSign size={20} /> Vender Activo
            </button>
        );
    }

    return (
        <div className={`mb-6 rounded-2xl overflow-hidden border ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
            {/* Header del panel */}
            <div className={`px-5 py-4 flex items-center justify-between ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-green-500" />
                    <span className={`text-sm font-black ${textColor}`}>Vender este activo</span>
                </div>
                <span className={`text-xs ${secondaryTextColor}`}>
                    Disponible: <strong>{cantidadTotal.toLocaleString('es-AR', { maximumFractionDigits: 6 })}</strong> {asset.especie}
                </span>
            </div>

            <div className="p-5 space-y-4">
                {/* Selector total/parcial */}
                {modo === 'elegir' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setModo('total')}
                                className={`py-3 px-4 rounded-xl font-black text-sm transition-all active:scale-95 ${
                                    isGlass
                                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                                        : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                                }`}
                            >
                                Vender Todo
                            </button>
                            <button
                                type="button"
                                onClick={() => { setModo('parcial'); setCantidadParcial(''); }}
                                className={`py-3 px-4 rounded-xl font-black text-sm transition-all active:scale-95 ${
                                    isGlass
                                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                                }`}
                            >
                                Venta Parcial
                            </button>
                        </div>
                        <button type="button" onClick={() => setModo(null)} className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isGlass ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}>
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Modo total: resumen y confirmación */}
                {modo === 'total' && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'} space-y-2`}>
                            <div className="flex justify-between text-sm">
                                <span className={secondaryTextColor}>Cantidad a vender</span>
                                <span className={`font-bold ${textColor}`}>{cantidadTotal.toLocaleString('es-AR', { maximumFractionDigits: 6 })} {asset.especie}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className={secondaryTextColor}>Precio actual</span>
                                <span className={`font-bold ${textColor}`}>{formatter.format(precioVenta)}</span>
                            </div>
                            <div className={`flex justify-between text-sm pt-2 border-t ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                                <span className={`font-black ${textColor}`}>Líquido a recibir ({monedaVenta})</span>
                                <span className="font-black text-green-500">{formatter.format(montoResultante)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setModo(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isGlass ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                Cancelar
                            </button>
                            <button type="button" onClick={handleConfirm} disabled={saving} className="flex-2 flex-grow py-2.5 px-6 rounded-xl text-sm font-black bg-green-500 hover:bg-green-600 text-white transition-all active:scale-95 disabled:opacity-60">
                                {saving ? 'Guardando...' : 'Confirmar Venta'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Modo parcial: input de cantidad */}
                {modo === 'parcial' && (
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-xs font-bold mb-2 ${secondaryTextColor}`}>
                                CANTIDAD A VENDER (máx. {cantidadTotal.toLocaleString('es-AR', { maximumFractionDigits: 6 })})
                            </label>
                            <input
                                autoComplete="off"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                max={cantidadTotal}
                                placeholder={`0 – ${cantidadTotal.toLocaleString('es-AR', { maximumFractionDigits: 6 })}`}
                                value={cantidadParcial}
                                onChange={e => { setCantidadParcial(e.target.value); setError(''); }}
                                className={inputClass}
                                autoFocus
                            />
                        </div>

                        {cantidadAVender > 0 && cantidadAVender <= cantidadTotal && (
                            <div className={`p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'} space-y-1 text-sm`}>
                                <div className="flex justify-between">
                                    <span className={secondaryTextColor}>Precio actual</span>
                                    <span className={`font-bold ${textColor}`}>{formatter.format(precioVenta)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={`font-black ${textColor}`}>Líquido a recibir ({monedaVenta})</span>
                                    <span className="font-black text-green-500">{formatter.format(montoResultante)}</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setModo(null); setError(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isGlass ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={saving || cantidadAVender <= 0 || cantidadAVender > cantidadTotal}
                                className="flex-2 flex-grow py-2.5 px-6 rounded-xl text-sm font-black bg-green-500 hover:bg-green-600 text-white transition-all active:scale-95 disabled:opacity-40"
                            >
                                {saving ? 'Guardando...' : 'Confirmar Venta'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AssetDetailsModal({ isOpen, onClose, asset, currencyView, isGlass, rate, onSellClick }) {
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

                {/* Panel de Venta Rápida */}
                <QuickSellPanel
                    asset={asset}
                    isGlass={isGlass}
                    currencyView={currencyView}
                    rate={rate}
                    textColor={textColor}
                    secondaryTextColor={secondaryTextColor}
                    onClose={onClose}
                />

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

                {asset.stopLoss ? (
                    <div className={`p-5 rounded-2xl mt-4 ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 ${textColor}`}>
                            <Shield size={16} className="text-red-500" /> Protección Stop Loss (Sistema T)
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-500/20 pb-2">
                                <span className={secondaryTextColor}>Precio de Stop Loss</span>
                                <span className="font-black text-red-500">
                                    {formatAmount(currencyView === 'ARS' ? asset.stopLoss.stopPrecio * rate : asset.stopLoss.stopPrecio, currencyView)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-500/20 pb-2">
                                <span className={secondaryTextColor}>Máximo Registrado (Trailing)</span>
                                <span className={`font-semibold ${textColor}`}>
                                    {formatAmount(currencyView === 'ARS' ? asset.stopLoss.maxPrecioRegistrado * rate : asset.stopLoss.maxPrecioRegistrado, currencyView)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-500/20 pb-2">
                                <span className={secondaryTextColor}>Precio de Compra</span>
                                <span className={`font-semibold ${textColor}`}>
                                    {formatAmount(currencyView === 'ARS' ? asset.stopLoss.precioCompra * rate : asset.stopLoss.precioCompra, currencyView)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={secondaryTextColor}>Coeficiente Beta / Alarma</span>
                                <span className={`font-semibold ${textColor}`}>
                                    Beta {parseFloat(asset.stopLoss.beta).toFixed(2)} | {asset.stopLoss.alarmaActiva ? '🔔 Activa' : '🔕 Inactiva'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={`p-4 rounded-2xl mt-4 border border-dashed ${isGlass ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50/50'} text-center`}>
                        <p className={`text-xs ${secondaryTextColor}`}>
                            No tenés configurado un Stop Loss dinámico para este activo. Podés hacerlo haciendo clic en el escudo en la tabla de tenencias.
                        </p>
                    </div>
                )}
                
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
