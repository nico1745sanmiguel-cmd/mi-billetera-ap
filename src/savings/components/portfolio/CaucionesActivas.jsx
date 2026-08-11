import React from 'react';
import { Clock, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';

export default function CaucionesActivas({
    caucionesActivas,
    hasCauciones,
    isGlass,
    privacyMode,
    setVencimientoModal,
    textColor,
    cardBg
}) {
    if (!hasCauciones) return null;

    return (
        <div className={`rounded-3xl p-6 ${cardBg}`}>
            <h3 className={`font-bold flex items-center gap-2 mb-4 ${textColor}`}>
                <Clock size={18} className="text-blue-400" />
                Cauciones
                <span className={`ml-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isGlass ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}>
                    {caucionesActivas.length}
                </span>
            </h3>
            <div className="space-y-3">
                {caucionesActivas.map(c => {
                    const badgeConfig = {
                        activa: { label: 'Activa', cls: isGlass ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700', Icon: CheckCircle },
                        vence_hoy: { label: '¡Vence hoy!', cls: isGlass ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700', Icon: AlertTriangle },
                        vencida: { label: 'Vencida', cls: isGlass ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600', Icon: AlertTriangle },
                    }[c.estado];

                    return (
                        <div key={c.id} className={`rounded-2xl p-4 ${
                            isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'
                        }`}>
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className={`font-black text-sm ${textColor}`}>{c.cartera}</span>
                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${badgeConfig.cls}`}>
                                            <badgeConfig.Icon size={11} />
                                            {badgeConfig.label}
                                        </span>
                                        {c.estado === 'activa' && (
                                            <span className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                                {c.diasRestantes} día{c.diasRestantes !== 1 ? 's' : ''} restante{c.diasRestantes !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                        <div className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                                            Capital: <span className={`font-bold ${textColor}`}>
                                                {privacyMode ? '****' : (c.montoARS || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                                            TNA: <span className={`font-bold ${isGlass ? 'text-blue-300' : 'text-blue-700'}`}>{c.tna}%</span>
                                        </div>
                                        <div className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                                            Interés hoy: <span className="font-bold text-green-500">
                                                {privacyMode ? '****' : `+ ${(c.interesAcumuladoARS || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}`}
                                            </span>
                                        </div>
                                        <div className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                                            Vence: <span className={`font-bold ${textColor}`}>
                                                {new Date(c.fechaVencimiento).toLocaleDateString('es-AR')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`text-xs uppercase font-semibold tracking-wide mb-1 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Valor actual</div>
                                    <div className={`font-black text-base ${textColor}`}>
                                        {privacyMode ? '****' : (c.valorActualARS || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                            </div>
                            {(c.estado === 'vencida' || c.estado === 'vence_hoy') && (
                                <button
                                    type="button"
                                    onClick={() => setVencimientoModal(c)}
                                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                                        isGlass
                                            ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    <ChevronRight size={14} />
                                    Registrar Vencimiento
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
