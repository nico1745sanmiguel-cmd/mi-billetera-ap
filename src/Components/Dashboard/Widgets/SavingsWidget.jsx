import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, ArrowRightLeft, Target } from 'lucide-react';
import { useFinancial } from '../../../context/FinancialContext';
import { useSavings } from '../../../context/SavingsContext';

export default function SavingsWidget({ setView, privacyMode }) {
    const { dolarBlue } = useFinancial();
    const { savingsTransactions, savingsGoal } = useSavings();
    const [currencyView, setCurrencyView] = useState('ARS');
    const [customQuotes, setCustomQuotes] = useState({});
    const [imgError, setImgError] = useState(false);

    // Cargar cotizaciones manuales
    useEffect(() => {
        const saved = localStorage.getItem('savings_custom_quotes');
        if (saved) {
            try { setCustomQuotes(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const total = useMemo(() => {
        let totalUSD = 0;
        let totalARS = 0;
        const rate = dolarBlue || 1000;

        const balances = {};
        (savingsTransactions || []).forEach(tx => {
            const { cartera, especie, tipo, cantidad } = tx;
            if (!balances[cartera]) balances[cartera] = {};
            if (!balances[cartera][especie]) balances[cartera][especie] = 0;

            const num = parseFloat(cantidad) || 0;
            if (tipo === 'ingreso') balances[cartera][especie] += num;
            else if (tipo === 'egreso') balances[cartera][especie] -= num;
        });

        Object.keys(balances).forEach(cartera => {
            Object.keys(balances[cartera]).forEach(especie => {
                const cant = balances[cartera][especie];
                const es = especie.toUpperCase();

                if (es === 'USD') {
                    totalUSD += cant;
                    totalARS += cant * rate;
                } else if (es === 'ARS') {
                    totalARS += cant;
                    totalUSD += cant / rate;
                } else {
                    let userQuote = customQuotes[es];
                    if (userQuote === undefined || isNaN(parseFloat(userQuote))) {
                        userQuote = ['USDT', 'USDC', 'DAI', 'USDP'].includes(es) ? 1 : 0;
                    } else {
                        userQuote = parseFloat(userQuote);
                    }
                    totalUSD += (cant * userQuote);
                    totalARS += (cant * userQuote * rate);
                }
            });
        });

        return currencyView === 'ARS' ? totalARS : totalUSD;
    }, [savingsTransactions, dolarBlue, currencyView, customQuotes]);

    const formatCurrency = (amount, currency) => {
        if (privacyMode) return '****';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Progreso del objetivo para el widget
    const goalAmount = savingsGoal ? parseFloat(savingsGoal.amount) : 0;
    const totalARS = useMemo(() => {
        const rate = dolarBlue || 1000;
        const balances = {};
        (savingsTransactions || []).forEach(tx => {
            const { cartera, especie, tipo, cantidad } = tx;
            if (!balances[cartera]) balances[cartera] = {};
            if (!balances[cartera][especie]) balances[cartera][especie] = 0;
            const num = parseFloat(cantidad) || 0;
            if (tipo === 'ingreso') balances[cartera][especie] += num;
            else if (tipo === 'egreso') balances[cartera][especie] -= num;
        });
        let t = 0;
        Object.values(balances).forEach(c => {
            Object.entries(c).forEach(([esp, cant]) => {
                const es = esp.toUpperCase();
                if (es === 'ARS') t += cant;
                else if (es === 'USD') t += cant * rate;
                else if (['USDT', 'USDC', 'DAI', 'USDP'].includes(es)) t += cant * rate;
            });
        });
        return t;
    }, [savingsTransactions, dolarBlue]);

    const progress = savingsGoal && goalAmount > 0
        ? Math.min(100, (totalARS / goalAmount) * 100)
        : 0;

    const hasGoalImage = savingsGoal?.imageUrl && !imgError;

    return (
        <div
            onClick={() => setView('savings')}
            className="rounded-3xl overflow-hidden mx-1 cursor-pointer transition-all group relative"
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
                                transition: 'clip-path 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
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
                                transition: 'top 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
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
                    <button type="button"
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
