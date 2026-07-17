import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';
import { Plus, Wallet, ArrowRightLeft, TrendingUp } from 'lucide-react';
import SavingsGoal from './SavingsGoal';
import { useUI } from '../../context/UIContext';
import OperationModal from './OperationModal';
import OperationsTab from './Tabs/OperationsTab';

const PortfolioTab = lazy(() => import('./Tabs/PortfolioTab'));
const AnalyticsTab = lazy(() => import('./Tabs/AnalyticsTab'));

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function SavingsDashboard() {
    const { isGlass, privacyMode } = useUI();
    const { posiciones } = useSavings();
    const { dolarBlue } = useFinancial();
    const [showAddModal, setShowAddModal] = useState(false);
    const [currencyView, setCurrencyView] = useState('ARS'); // 'ARS' or 'USD'
    const [activeTab, setActiveTab] = useState('portafolio'); // portafolio, operaciones, analisis

    // 3. Calcular Total General a partir de las posiciones
    const total = useMemo(() => {
        let totalUSD = 0;
        const rate = dolarBlue || 1000;

        // Usar valorActualUSD ya calculado en el contexto en lugar de recalcular.
        // Evita desincronización si la lógica de precios cambia en SavingsContext.
        posiciones.forEach(pos => {
            totalUSD += pos.valorActualUSD;
        });

        const totalARS = totalUSD * rate;
        return currencyView === 'ARS' ? totalARS : totalUSD;
    }, [posiciones, dolarBlue, currencyView]);

    const formatCurrency = (amount, currency) => {
        if (privacyMode) return '****';
        return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
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
                <button aria-label="Acción" type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 font-bold"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Nueva Operación</span>
                </button>
            </div>

            {/* TOTAL CARD */}
            <div className={`rounded-3xl p-6 ${isGlass ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30' : 'bg-gradient-to-br from-green-50 to-emerald-100 shadow-sm border border-green-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-semibold uppercase tracking-wider ${isGlass ? 'text-green-300' : 'text-green-700'}`}>
                        Total General
                    </span>
                    <button aria-label="Acción" type="button" 
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

            {/* TABS NAVIGATION */}
            <div className={`flex gap-2 p-1 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-100'} overflow-x-auto hide-scrollbar`}>
                {[
                    { id: 'portafolio', label: 'Portafolio' },
                    { id: 'operaciones', label: 'Operaciones' },
                    { id: 'analisis', label: 'Análisis' },
                    { id: 'objetivo', label: 'Objetivo' }
                ].map(tab => (
                    <button aria-label="Tab" type="button" key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id
                            ? (isGlass ? 'bg-white/20 text-white shadow-md' : 'bg-white text-green-600 shadow-sm')
                            : (isGlass ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-800')
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="mt-6 min-h-[300px]">
                <Suspense fallback={<div className={`flex items-center justify-center p-12 text-sm font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}><div className="w-6 h-6 border-4 border-t-green-500 border-green-500/20 rounded-full animate-spin mr-3"></div>Cargando...</div>}>
                    {activeTab === 'portafolio' && <PortfolioTab isGlass={isGlass} privacyMode={privacyMode} currencyView={currencyView} />}
                    {activeTab === 'operaciones' && <OperationsTab isGlass={isGlass} privacyMode={privacyMode} />}
                    {activeTab === 'analisis' && <AnalyticsTab isGlass={isGlass} privacyMode={privacyMode} />}
                    {activeTab === 'objetivo' && <SavingsGoal />}
                </Suspense>
            </div>

            {showAddModal && (
                <OperationModal 
                    onClose={() => setShowAddModal(false)}
                    isGlass={isGlass}
                />
            )}
        </div>
    );
}
