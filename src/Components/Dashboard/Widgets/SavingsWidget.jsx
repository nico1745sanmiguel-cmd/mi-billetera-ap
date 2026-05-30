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

    return (
        <div 
            onClick={() => setView('savings')}
            className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mx-1 cursor-pointer hover:border-gray-300 dark:hover:bg-white/10 transition-all dark:backdrop-blur-md group"
        >
            <div className="px-5 py-3 flex justify-between items-center border-b border-gray-50 dark:border-white/5">
                <h3 className="font-bold text-gray-800 dark:text-white/90 text-sm flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-500" /> Mis Ahorros
                </h3>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        setCurrencyView(prev => prev === 'ARS' ? 'USD' : 'ARS');
                    }} 
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-white/40 bg-gray-50 dark:bg-white/5 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded-full transition-colors"
                    title={`Ver en ${currencyView === 'ARS' ? 'USD' : 'ARS'}`}
                >
                    <ArrowRightLeft size={12} />
                    {currencyView === 'ARS' ? 'USD' : 'ARS'}
                </button>
            </div>

            <div className="p-4 flex flex-col justify-center">
                <div className="flex items-end justify-between">
                    <div>
                        <div className={`text-2xl font-black ${privacyMode ? 'blur-sm' : ''} text-gray-900 dark:text-white truncate`}>
                            {formatCurrency(total, currencyView)}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-wider font-bold mt-1">
                            Total Acumulado
                        </p>
                    </div>
                    {dolarBlue && currencyView === 'ARS' && (
                        <div className="text-[10px] text-gray-400 dark:text-white/30 text-right">
                            <span className="block">Dólar Blue</span>
                            <span className="font-semibold">${dolarBlue}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
