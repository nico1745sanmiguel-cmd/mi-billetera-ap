import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, ArrowRightLeft } from 'lucide-react';
import { useFinancial } from '../../../context/FinancialContext';

export default function SavingsWidget({ setView, privacyMode }) {
    const { savingsTransactions, dolarBlue } = useFinancial();
    const [currencyView, setCurrencyView] = useState('ARS');
    const [customQuotes, setCustomQuotes] = useState({});

    // Cargar cotizaciones manuales que guardó el usuario en el dashboard de ahorros
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

        // Calcular saldos
        const balances = {};
        (savingsTransactions || []).forEach(tx => {
            const { cartera, especie, tipo, cantidad } = tx;
            if (!balances[cartera]) balances[cartera] = {};
            if (!balances[cartera][especie]) balances[cartera][especie] = 0;
            
            const num = parseFloat(cantidad) || 0;
            if (tipo === 'ingreso') {
                balances[cartera][especie] += num;
            } else if (tipo === 'egreso') {
                balances[cartera][especie] -= num;
            }
        });

        // Sumar todo
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
                    const userQuote = customQuotes[es] || 0;
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

    return (
        <div 
            onClick={() => setView('savings')}
            className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-500/10 dark:to-emerald-500/5 rounded-3xl border border-green-100 dark:border-green-500/20 shadow-sm overflow-hidden mx-1 cursor-pointer hover:border-green-300 dark:hover:bg-white/5 transition-all dark:backdrop-blur-md group"
        >
            <div className="px-5 py-4 border-b border-green-100 dark:border-white/5 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-green-800 dark:text-green-300 text-sm flex items-center gap-2">
                        <TrendingUp size={18} className="text-green-600 dark:text-green-400" /> Mis Ahorros
                    </h3>
                </div>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        setCurrencyView(prev => prev === 'ARS' ? 'USD' : 'ARS');
                    }} 
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 dark:text-green-300 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 px-2 py-1 rounded-full transition-colors shadow-sm dark:shadow-none border border-green-200 dark:border-white/10"
                    title={`Ver en ${currencyView === 'ARS' ? 'USD' : 'ARS'}`}
                >
                    <ArrowRightLeft size={12} />
                    {currencyView === 'ARS' ? 'USD' : 'ARS'}
                </button>
            </div>

            <div className="p-5 flex flex-col items-center justify-center">
                <p className="text-xs text-green-600/80 dark:text-green-200/50 uppercase tracking-widest font-bold mb-1">
                    Total Acumulado
                </p>
                <div className={`text-3xl font-black ${privacyMode ? 'blur-sm' : ''} text-green-900 dark:text-white truncate max-w-full`}>
                    {formatCurrency(total, currencyView)}
                </div>
                {dolarBlue && currencyView === 'ARS' && (
                    <p className="text-[10px] text-green-600/60 dark:text-green-200/40 mt-2">
                        Dólar Blue: ${dolarBlue}
                    </p>
                )}
            </div>
        </div>
    );
}
