import React, { useState, useEffect } from 'react';
import { X, Shield, Bell, AlertTriangle, RefreshCw, Trash } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { getStopLossPercentage, mapBetaToVol, mapVolToBeta } from '../../utils/stopLossService';

export default function StopLossModal({ isOpen, onClose, asset, isGlass }) {
    const { saveStopLoss, deleteStopLoss } = useSavings();
    
    // Obtener promedio de costo ponderado de la posición
    const defaultPrecioCompra = asset ? (asset.inversionTotalUSD / asset.cantidad) : 0;
    
    const [precioCompra, setPrecioCompra] = useState('');
    const [volatilidad, setVolatilidad] = useState('medium');
    const [beta, setBeta] = useState('1.20');
    const [isCustomBeta, setIsCustomBeta] = useState(false);
    const [maxPrecioRegistrado, setMaxPrecioRegistrado] = useState('');
    const [alarmaActiva, setAlarmaActiva] = useState(true);
    const [loading, setLoading] = useState(false);

    // Cargar datos si el activo ya tiene un stop loss configurado
    useEffect(() => {
        if (asset) {
            if (asset.stopLoss) {
                setPrecioCompra(asset.stopLoss.precioCompra.toString());
                setBeta(asset.stopLoss.beta.toString());
                setMaxPrecioRegistrado(asset.stopLoss.maxPrecioRegistrado.toString());
                setAlarmaActiva(asset.stopLoss.alarmaActiva);
                
                const vol = mapBetaToVol(asset.stopLoss.beta);
                setVolatilidad(vol);
                setIsCustomBeta(vol === 'custom' || ![0.7, 1.2, 2.1].includes(parseFloat(asset.stopLoss.beta)));
            } else {
                setPrecioCompra(defaultPrecioCompra.toFixed(2));
                setVolatilidad('medium');
                setBeta('1.20');
                setIsCustomBeta(false);
                setMaxPrecioRegistrado(asset.precioActualUSD ? asset.precioActualUSD.toFixed(2) : '0');
                setAlarmaActiva(true);
            }
        }
    }, [asset, defaultPrecioCompra]);

    if (!isOpen || !asset) return null;

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const bgClass = isGlass ? 'bg-[#0f0c29]/95 border border-white/20 backdrop-blur-xl' : 'bg-white';
    const secondaryTextColor = isGlass ? 'text-white/70' : 'text-gray-500';
    const inputBg = isGlass ? 'bg-white/10 text-white border-white/20' : 'bg-gray-50 text-gray-800 border-gray-200';

    // Manejar cambios en selector de volatilidad
    const handleVolatilidadChange = (e) => {
        const val = e.target.value;
        setVolatilidad(val);
        if (val !== 'custom') {
            setIsCustomBeta(false);
            setBeta(mapVolToBeta(val).toFixed(2));
        } else {
            setIsCustomBeta(true);
        }
    };

    // Cálculos dinámicos
    const bValue = parseFloat(beta) || 1.20;
    const pct = getStopLossPercentage(bValue);
    const maxP = parseFloat(maxPrecioRegistrado) || 0;
    const stopPriceCalculado = maxP * (1 - pct);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await saveStopLoss(
                asset.especie,
                parseFloat(precioCompra) || 0,
                bValue,
                parseFloat(maxPrecioRegistrado) || parseFloat(precioCompra) || 0,
                alarmaActiva
            );
            onClose();
        } catch (error) {
            console.error('Error al guardar stop loss:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`¿Querés eliminar el Stop Loss de ${asset.especie}?`)) {
            setLoading(true);
            try {
                await deleteStopLoss(asset.especie);
                onClose();
            } catch (error) {
                console.error('Error al borrar stop loss:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleResetTrail = () => {
        if (asset.precioActualUSD) {
            setMaxPrecioRegistrado(asset.precioActualUSD.toFixed(2));
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
            <div className={`relative w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 animate-scale-in ${bgClass}`}>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Shield className="text-red-500" size={24} />
                        <h2 className={`text-xl font-black ${textColor}`}>
                            Stop Loss para {asset.especie}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className={`p-1.5 rounded-full transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                    {/* Precio de compra */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${secondaryTextColor}`}>
                            Precio Promedio de Compra (USD)
                        </label>
                        <input
                            type="number"
                            step="any"
                            required
                            value={precioCompra}
                            onChange={(e) => setPrecioCompra(e.target.value)}
                            className={`w-full p-3 rounded-xl text-sm font-semibold outline-none border transition-all ${inputBg} focus:border-red-500`}
                        />
                        <p className={`text-[10px] mt-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            Costo promedio calculado en tu billetera: USD {defaultPrecioCompra.toFixed(2)}
                        </p>
                    </div>

                    {/* Volatilidad y Beta */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${secondaryTextColor}`}>
                                Volatilidad (Beta)
                            </label>
                            <select
                                value={volatilidad}
                                onChange={handleVolatilidadChange}
                                className={`w-full p-3 rounded-xl text-sm font-semibold outline-none border transition-all ${inputBg} focus:border-red-500`}
                            >
                                <option value="low">Baja (Beta &lt; 0.85)</option>
                                <option value="medium">Media (Beta 0.85 - 1.95)</option>
                                <option value="high">Alta (Beta &gt; 1.95)</option>
                                <option value="custom">Personalizado (Beta)</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${secondaryTextColor}`}>
                                Coeficiente Beta
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                disabled={!isCustomBeta}
                                value={beta}
                                onChange={(e) => setBeta(e.target.value)}
                                className={`w-full p-3 rounded-xl text-sm font-semibold outline-none border transition-all ${inputBg} ${!isCustomBeta ? 'opacity-60 cursor-not-allowed' : 'focus:border-red-500'}`}
                            />
                        </div>
                    </div>

                    {/* Info de Stop Pct */}
                    <div className={`p-3 rounded-xl text-xs flex items-center justify-between font-bold ${isGlass ? 'bg-white/5 text-white/90' : 'bg-gray-50 text-gray-700'}`}>
                        <span>Pérdida máxima sugerida por el autor:</span>
                        <span className="text-red-500 text-sm">{(pct * 100).toFixed(0)}%</span>
                    </div>

                    {/* Precio Máximo (Trailing) */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${secondaryTextColor}`}>
                                Precio Máximo Alcanzado (USD)
                            </label>
                            <button
                                type="button"
                                onClick={handleResetTrail}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline"
                            >
                                <RefreshCw size={10} /> Reiniciar al actual
                            </button>
                        </div>
                        <input
                            type="number"
                            step="any"
                            required
                            value={maxPrecioRegistrado}
                            onChange={(e) => setMaxPrecioRegistrado(e.target.value)}
                            className={`w-full p-3 rounded-xl text-sm font-semibold outline-none border transition-all ${inputBg} focus:border-red-500`}
                        />
                        <p className={`text-[10px] mt-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            Precio actual de mercado: USD {asset.precioActualUSD ? asset.precioActualUSD.toFixed(2) : '—'}
                        </p>
                    </div>

                    {/* Stop Loss Resultante */}
                    <div className={`p-4 rounded-2xl border ${isGlass ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'} flex justify-between items-center`}>
                        <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isGlass ? 'text-red-300' : 'text-red-600'}`}>
                                Precio de Stop Loss Activado
                            </span>
                            <span className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                Si el precio cae a este nivel o menos
                            </span>
                        </div>
                        <div className={`text-xl font-black ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                            USD {stopPriceCalculado > 0 ? stopPriceCalculado.toFixed(2) : '0.00'}
                        </div>
                    </div>

                    {/* Alarma Activa */}
                    <div className="flex items-center justify-between p-1">
                        <div className="flex items-center gap-2">
                            <Bell className={alarmaActiva ? 'text-yellow-500' : 'text-gray-400'} size={20} />
                            <div>
                                <span className={`text-sm font-bold block ${textColor}`}>Notificación de escritorio</span>
                                <span className={`text-xs block ${secondaryTextColor}`}>Avisar en el navegador si toca el stop</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alarmaActiva}
                                onChange={(e) => setAlarmaActiva(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-3 pt-2">
                        {asset.stopLoss && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className={`p-3 rounded-xl transition-all ${isGlass ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'} flex items-center justify-center`}
                                title="Eliminar Stop Loss"
                            >
                                <Trash size={18} />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-xl text-sm transition-all shadow-md"
                        >
                            {loading ? 'Guardando...' : 'Guardar Stop Loss'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
