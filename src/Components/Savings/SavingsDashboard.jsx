import React, { useState, useMemo, useEffect } from 'react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';
import { Plus, Wallet, ArrowRightLeft, TrendingUp } from 'lucide-react';
import SavingsCard from './SavingsCard';
import AddSavingsModal from './AddSavingsModal';
import SavingsGoal from './SavingsGoal';
import { useUI } from '../../context/UIContext';

export default function SavingsDashboard({ onBack }) {
    const { isGlass, privacyMode } = useUI();
    const { savingsTransactions } = useSavings();
    const { dolarBlue } = useFinancial();
    const [showAddModal, setShowAddModal] = useState(false);
    const [currencyView, setCurrencyView] = useState('ARS'); // 'ARS' or 'USD'
    const [customQuotes, setCustomQuotes] = useState({});

    // Cargar cotizaciones personalizadas guardadas
    useEffect(() => {
        const saved = localStorage.getItem('savings_custom_quotes');
        if (saved) {
            try { setCustomQuotes(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const updateCustomQuote = (especie, value) => {
        // Reemplazar coma por punto para evitar que parseFloat falle
        const cleanValue = value.replace(',', '.');
        const updated = { ...customQuotes, [especie]: cleanValue };
        setCustomQuotes(updated);
        localStorage.setItem('savings_custom_quotes', JSON.stringify(updated));
    };

    // 1. Calcular balances agrupados por cartera y especie
    const balances = useMemo(() => {
        const result = {};
        (savingsTransactions || []).forEach(tx => {
            const { cartera, especie, tipo, cantidad } = tx;
            if (!result[cartera]) result[cartera] = {};
            if (!result[cartera][especie]) result[cartera][especie] = 0;
            
            const num = parseFloat(cantidad) || 0;
            if (tipo === 'ingreso') {
                result[cartera][especie] += num;
            } else if (tipo === 'egreso') {
                result[cartera][especie] -= num;
            }
        });
        
        // Limpiar balances en 0 y formatear en array para mapeo
        const formatted = Object.keys(result).map(cartera => {
            const items = Object.keys(result[cartera])
                .map(especie => ({ especie, cantidad: result[cartera][especie] }))
                .filter(item => item.cantidad !== 0);
            return { cartera, items };
        }).filter(c => c.items.length > 0);

        return formatted;
    }, [savingsTransactions]);

    // 2. Extraer especies "raras" (que no son ARS ni USD)
    const rareSpecies = useMemo(() => {
        const speciesSet = new Set();
        balances.forEach(c => c.items.forEach(i => {
            const es = i.especie.toUpperCase();
            if (es !== 'ARS' && es !== 'USD') speciesSet.add(es);
        }));
        return Array.from(speciesSet);
    }, [balances]);

    // 3. Calcular Total General
    const total = useMemo(() => {
        let totalUSD = 0;
        let totalARS = 0;
        const rate = dolarBlue || 1000; // fallback si falla la API

        balances.forEach(cartera => {
            cartera.items.forEach(item => {
                const es = item.especie.toUpperCase();
                const cant = item.cantidad;
                
                if (es === 'USD') {
                    totalUSD += cant;
                    totalARS += cant * rate;
                } else if (es === 'ARS') {
                    totalARS += cant;
                    totalUSD += cant / rate;
                } else {
                    // Usar cotización personalizada (se asume que la ingresan en USD para unificar)
                    let userQuote = parseFloat(customQuotes[es]);
                    if (isNaN(userQuote)) {
                        // Por defecto, las stablecoins valen 1 USD. Otras criptos u activos, 0 si no se ingresa nada.
                        userQuote = ['USDT', 'USDC', 'DAI', 'USDP'].includes(es) ? 1 : 0;
                    }
                    totalUSD += (cant * userQuote);
                    totalARS += (cant * userQuote * rate);
                }
            });
        });

        return currencyView === 'ARS' ? totalARS : totalUSD;
    }, [balances, dolarBlue, currencyView, customQuotes]);

    const formatCurrency = (amount, currency) => {
        if (privacyMode) return '****';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-lg border border-gray-100';

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* ENCABEZADO */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${isGlass ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-black tracking-tight ${textColor}`}>Mis Ahorros</h1>
                        <p className={`text-sm ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Inversiones y saldos</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 font-bold"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Nuevo Movimiento</span>
                </button>
            </div>

            {/* TOTAL CARD */}
            <div className={`rounded-3xl p-6 ${isGlass ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30' : 'bg-gradient-to-br from-green-50 to-emerald-100 shadow-sm border border-green-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-semibold uppercase tracking-wider ${isGlass ? 'text-green-300' : 'text-green-700'}`}>
                        Total General
                    </span>
                    <button 
                        onClick={() => setCurrencyView(prev => prev === 'ARS' ? 'USD' : 'ARS')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-green-700 shadow-sm'}`}
                    >
                        <ArrowRightLeft size={14} />
                        VER EN {currencyView === 'ARS' ? 'USD' : 'ARS'}
                    </button>
                </div>
                <div className={`text-4xl sm:text-5xl font-black ${isGlass ? 'text-white' : 'text-gray-900'} truncate`}>
                    {formatCurrency(total, currencyView)}
                </div>
                {dolarBlue && (
                    <div className={`mt-3 text-xs ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                        Cotización Dólar Blue: ${dolarBlue}
                    </div>
                )}
            </div>

            {/* COTIZACIONES MANUALES (Removido a petición del usuario) */}

            {/* OBJETIVO DE AHORRO */}
            <SavingsGoal />

            {/* CARTERAS LIST */}
            <div className="space-y-4">
                <h2 className={`text-lg font-bold flex items-center gap-2 ${textColor}`}>
                    <Wallet size={20} />
                    Mis Carteras
                </h2>
                
                {balances.length === 0 ? (
                    <div className={`text-center p-8 rounded-2xl ${cardBg}`}>
                        <p className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                            Todavía no agregaste ningún ahorro.<br/>Hacé clic en "Nuevo Movimiento" para empezar.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {balances.map(carteraData => (
                            <SavingsCard 
                                key={carteraData.cartera}
                                cartera={carteraData.cartera}
                                items={carteraData.items}
                                isGlass={isGlass}
                                privacyMode={privacyMode}
                                dolarBlue={dolarBlue}
                                customQuotes={customQuotes}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddSavingsModal 
                    onClose={() => setShowAddModal(false)}
                    isGlass={isGlass}
                />
            )}
        </div>
    );
}
