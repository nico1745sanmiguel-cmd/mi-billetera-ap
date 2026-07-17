import React, { useMemo, useState } from 'react';
import { TrendingUp, ArrowRightLeft, Target } from 'lucide-react';
import { useFinancial } from '../../../context/FinancialContext';
import { useSavings } from '../../../context/SavingsContext';

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function SavingsWidget({ setView, privacyMode, size }) {
    const { dolarBlue } = useFinancial();
    const { posiciones, savingsGoal } = useSavings();
    const [currencyView, setCurrencyView] = useState('ARS');
    const [imgError, setImgError] = useState(false);

    const { total, totalARS } = useMemo(() => {
        let totalUSD = 0;
        const rate = dolarBlue || 1000;

        posiciones.forEach(pos => {
            totalUSD += pos.valorActualUSD;
        });

        const computedTotalARS = totalUSD * rate;
        
        return {
            totalARS: computedTotalARS,
            total: currencyView === 'ARS' ? computedTotalARS : totalUSD
        };
    }, [posiciones, dolarBlue, currencyView]);

    const formatCurrency = (amount, currency) => {
        if (privacyMode) return '****';
        return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
    };

    // Progreso del objetivo para el widget
    const goalAmount = savingsGoal ? parseFloat(savingsGoal.amount) : 0;

    const progress = savingsGoal && goalAmount > 0
        ? Math.min(100, (totalARS / goalAmount) * 100)
        : 0;

    const hasGoalImage = savingsGoal?.imageUrl && !imgError;
    const isHalf = size === 'half';

    // ─── Modo COMPACTO ────────────────────────────────────────────────────────
    if (isHalf) {
        return (
            <div
                onClick={() => setView('savings')}
                className={`h-full flex flex-col justify-between rounded-3xl overflow-hidden cursor-pointer transition-all group relative ${hasGoalImage ? 'bg-gray-800 dark:bg-gray-900' : ''}`}
            >
                {/* Fondo imagen (idéntico al full) */}
                {hasGoalImage && (
                    <>
                        <img src={savingsGoal.imageUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'grayscale(100%) brightness(0.45)' }} onError={() => setImgError(true)} />
                        {progress > 0 && (
                            <img src={savingsGoal.imageUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: `inset(${(100 - progress).toFixed(2)}% 0 0 0)`, transition: 'clip-path 0.8s cubic-bezier(0.22, 1, 0.36, 1)', filter: 'brightness(0.6)' }} />
                        )}
                        {progress > 1 && progress < 99 && (
                            <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: `${(100 - progress).toFixed(2)}%`, height: '1.5px', background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 6px 2px rgba(255,255,255,0.4)', transition: 'top 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 z-10" />
                    </>
                )}

                {/* Contenido */}
                <div className={`relative z-20 h-full flex flex-col justify-between ${hasGoalImage ? '' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm dark:backdrop-blur-md'}`}>
                    {/* Header */}
                    <div className={`px-3 py-2.5 flex justify-between items-center ${hasGoalImage ? 'border-b border-white/10' : 'border-b border-gray-50 dark:border-white/5'}`}>
                        <h3 className={`font-bold text-xs flex items-center gap-1.5 ${hasGoalImage ? 'text-white' : 'text-gray-800 dark:text-white/90'}`}>
                            <TrendingUp size={13} className="text-green-400" />
                            Mis Ahorros
                        </h3>
                        <button aria-label="Acción" type="button"
                            onClick={(e) => { e.stopPropagation(); setCurrencyView(prev => prev === 'ARS' ? 'USD' : 'ARS'); }}
                            className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${hasGoalImage ? 'text-white/70 bg-white/10 hover:bg-white/20' : 'text-gray-400 dark:text-white/40 bg-gray-50 dark:bg-white/5 hover:text-green-600 dark:hover:text-green-400'}`}
                        >
                            <ArrowRightLeft size={10} />
                            {currencyView === 'ARS' ? 'USD' : 'ARS'}
                        </button>
                    </div>

                    {/* Monto + objetivo */}
                    <div className="px-3 py-2.5 flex flex-col justify-center flex-1">
                        <div className={`text-xl font-black truncate ${hasGoalImage ? 'text-white' : `${privacyMode ? 'blur-sm' : ''} text-gray-900 dark:text-white`}`}>
                            {formatCurrency(total, currencyView)}
                        </div>
                        <p className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${hasGoalImage ? 'text-white/60' : 'text-gray-400 dark:text-white/40'}`}>
                            Total Acumulado
                        </p>

                        {savingsGoal && (
                            <div className="mt-2.5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[9px] font-bold flex items-center gap-0.5 truncate pr-1 ${hasGoalImage ? 'text-white/70' : 'text-amber-600 dark:text-amber-400'}`}>
                                        <Target size={9} />
                                        <span className="truncate">{savingsGoal.name}</span>
                                    </span>
                                    <span className={`text-[9px] font-black shrink-0 ${hasGoalImage ? 'text-white/90' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {privacyMode ? '**%' : `${progress.toFixed(0)}%`}
                                    </span>
                                </div>
                                <div className={`h-1.5 rounded-full overflow-hidden ${hasGoalImage ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}`}>
                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Modo COMPLETO ────────────────────────────────────────────────────────
    return (
        <div
            onClick={() => setView('savings')}
            className={`h-full flex flex-col justify-between rounded-3xl overflow-hidden mx-1 cursor-pointer transition-all group relative ${hasGoalImage ? 'bg-gray-800 dark:bg-gray-900' : ''}`}
            style={{ minHeight: hasGoalImage ? '160px' : undefined }}
        >
            {/* Fondo: imagen del objetivo con revelado progresivo */}
            {hasGoalImage && (
                <>
                    {/* Capa B&N */}
                    <img
                        src={savingsGoal.imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'grayscale(100%) brightness(0.45)' }}
                        onError={() => setImgError(true)}
                    />
                    {/* Capa color, revelada desde abajo */}
                    {progress > 0 && (
                        <img
                            src={savingsGoal.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                                clipPath: `inset(${(100 - progress).toFixed(2)}% 0 0 0)`,
                                transition: 'clip-path 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                                filter: 'brightness(0.6)',
                            }}
                        />
                    )}
                    {/* Línea de agua */}
                    {progress > 1 && progress < 99 && (
                        <div
                            className="absolute left-0 right-0 pointer-events-none z-10"
                            style={{
                                top: `${(100 - progress).toFixed(2)}%`,
                                height: '1.5px',
                                background: 'rgba(255,255,255,0.7)',
                                boxShadow: '0 0 6px 2px rgba(255,255,255,0.4)',
                                transition: 'top 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                        />
                    )}
                    {/* Gradiente oscuro para legibilidad del texto */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 z-10" />
                </>
            )}

            {/* Contenido del widget encima */}
            <div className={`relative z-20 ${
                hasGoalImage
                    ? ''
                    : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm dark:backdrop-blur-md hover:border-gray-300 dark:hover:bg-white/10'
            }`}>
                {/* Header */}
                <div className={`px-5 py-3 flex justify-between items-center ${
                    hasGoalImage
                        ? 'border-b border-white/10'
                        : 'border-b border-gray-50 dark:border-white/5'
                }`}>
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${hasGoalImage ? 'text-white' : 'text-gray-800 dark:text-white/90'}`}>
                        <TrendingUp size={16} className="text-green-400" />
                        Mis Ahorros
                    </h3>
                    <button aria-label="Acción" type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrencyView(prev => prev === 'ARS' ? 'USD' : 'ARS');
                        }}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                            hasGoalImage
                                ? 'text-white/70 bg-white/10 hover:bg-white/20'
                                : 'text-gray-400 dark:text-white/40 bg-gray-50 dark:bg-white/5 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                        title={`Ver en ${currencyView === 'ARS' ? 'USD' : 'ARS'}`}
                    >
                        <ArrowRightLeft size={12} />
                        {currencyView === 'ARS' ? 'USD' : 'ARS'}
                    </button>
                </div>

                {/* Total */}
                <div className="p-4 flex flex-col justify-center">
                    <div className="flex items-end justify-between">
                        <div>
                            <div className={`text-2xl font-black truncate ${hasGoalImage ? 'text-white' : `${privacyMode ? 'blur-sm' : ''} text-gray-900 dark:text-white`}`}>
                                {formatCurrency(total, currencyView)}
                            </div>
                            <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${hasGoalImage ? 'text-white/60' : 'text-gray-400 dark:text-white/40'}`}>
                                Total Acumulado
                            </p>
                        </div>
                        {dolarBlue && currencyView === 'ARS' && (
                            <div className={`text-[10px] text-right ${hasGoalImage ? 'text-white/50' : 'text-gray-400 dark:text-white/30'}`}>
                                <span className="block">Dólar Blue</span>
                                <span className="font-semibold">${dolarBlue}</span>
                            </div>
                        )}
                    </div>

                    {/* Mini barra de objetivo (solo si hay goal) */}
                    {savingsGoal && (
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-bold flex items-center gap-1 ${hasGoalImage ? 'text-white/70' : 'text-amber-600 dark:text-amber-400'}`}>
                                    <Target size={10} />
                                    {savingsGoal.name}
                                </span>
                                <span className={`text-[10px] font-black ${hasGoalImage ? 'text-white/90' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {privacyMode ? '**%' : `${progress.toFixed(0)}%`}
                                </span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${hasGoalImage ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}`}>
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
