import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';
import { Plus, ArrowRightLeft, TrendingUp, TrendingDown, BarChart2, ListOrdered, Target } from 'lucide-react';
import SavingsGoal from './SavingsGoal';
import { useUI } from '../../context/UIContext';
import OperationModal from './OperationModal';
import OperationsTab from './Tabs/OperationsTab';
import { useStopLossAlerts } from '../../hooks/useStopLossAlerts';

const PortfolioTab = lazy(() => import('./Tabs/PortfolioTab'));
const AnalyticsTab = lazy(() => import('./Tabs/AnalyticsTab'));

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const TABS = [
    { id: 'portafolio',   label: 'Portafolio',  Icon: BarChart2 },
    { id: 'operaciones',  label: 'Operaciones', Icon: ListOrdered },
    { id: 'analisis',     label: 'Análisis',    Icon: TrendingUp },
    { id: 'objetivo',     label: 'Objetivo',    Icon: Target },
];

export default function SavingsDashboard() {
    useStopLossAlerts();

    const { isGlass, privacyMode } = useUI();
    const { posiciones, cauciones } = useSavings();
    const { dolarBlue } = useFinancial();
    const [showAddModal, setShowAddModal] = useState(false);
    const [currencyView, setCurrencyView] = useState('ARS');
    const [activeTab, setActiveTab] = useState('portafolio');

    // ── Cálculo del total general ──────────────────────────────────────────────
    const { total, totalUSD, pnlTotal, pnlPct } = useMemo(() => {
        const rate = dolarBlue || 1000;
        let totalUSD = 0;
        let inversionUSD = 0;

        posiciones.forEach(pos => {
            totalUSD += pos.valorActualUSD;
            inversionUSD += pos.inversionTotalUSD || 0;
        });
        (cauciones || []).forEach(c => {
            totalUSD += c.valorActualUSD || 0;
        });

        const totalARS = totalUSD * rate;
        const pnlUSD = totalUSD - inversionUSD;
        const pnlPct = inversionUSD > 0 ? (pnlUSD / inversionUSD) * 100 : 0;

        return {
            total: currencyView === 'ARS' ? totalARS : totalUSD,
            totalUSD,
            pnlTotal: currencyView === 'ARS' ? pnlUSD * rate : pnlUSD,
            pnlPct,
        };
    }, [posiciones, cauciones, dolarBlue, currencyView]);

    const formatCurrency = (amount, currency) => {
        if (privacyMode) return '****';
        return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
    };

    const isProfit = pnlTotal >= 0;

    // ── Estilos ────────────────────────────────────────────────────────────────
    const textColor = isGlass ? 'text-white' : 'text-gray-900';

    return (
        <div className="relative space-y-5 animate-fade-in pb-24">

            {/* ── HEADER COMPACTO ── */}
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isGlass ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <TrendingUp size={22} />
                </div>
                <div>
                    <h1 className={`text-xl font-black tracking-tight leading-none ${textColor}`}>Mis Ahorros</h1>
                    <p className={`text-xs mt-0.5 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Inversiones y saldos</p>
                </div>
            </div>

            {/* ── HERO CARD ── */}
            <div className={`relative rounded-3xl overflow-hidden ${
                isGlass
                    ? 'bg-gradient-to-br from-green-600/30 via-emerald-500/20 to-teal-600/10 border border-green-400/20'
                    : 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-xl shadow-green-500/25'
            }`}>
                {/* Decoración de fondo */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20 ${isGlass ? 'bg-white' : 'bg-white/30'}`} />
                    <div className={`absolute -bottom-12 -left-6 w-36 h-36 rounded-full opacity-10 ${isGlass ? 'bg-white' : 'bg-white/20'}`} />
                </div>

                <div className="relative p-6">
                    {/* Label + toggle moneda */}
                    <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold uppercase tracking-widest ${isGlass ? 'text-green-300' : 'text-white/70'}`}>
                            Total General
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrencyView(prev => prev === 'ARS' ? 'USD' : 'ARS')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                isGlass
                                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                    : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                            }`}
                        >
                            <ArrowRightLeft size={12} />
                            {currencyView === 'ARS' ? 'USD' : 'ARS'}
                        </button>
                    </div>

                    {/* Monto principal */}
                    <div className={`text-4xl sm:text-5xl font-black tracking-tight truncate ${isGlass ? 'text-white' : 'text-white'}`}>
                        {formatCurrency(total, currencyView)}
                    </div>

                    {/* Métricas secundarias */}
                    <div className="flex items-center gap-4 mt-4">
                        {/* P&L */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
                            isProfit
                                ? 'bg-white/15 text-white'
                                : 'bg-red-500/20 text-red-200'
                        }`}>
                            {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {!privacyMode && <span>{isProfit ? '+' : ''}{formatCurrency(pnlTotal, currencyView)}</span>}
                            {!privacyMode && (
                                <span className="opacity-70 text-xs">
                                    ({isProfit ? '+' : ''}{pnlPct.toFixed(1)}%)
                                </span>
                            )}
                            {privacyMode && <span>P&L</span>}
                        </div>

                        {/* Tipo de cambio */}
                        {dolarBlue && (
                            <span className={`text-xs ${isGlass ? 'text-green-300/70' : 'text-white/60'}`}>
                                Blue ${dolarBlue.toLocaleString('es-AR')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className={`flex gap-1 p-1 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-100/80'}`}>
                {TABS.map(({ id, label, Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                isActive
                                    ? isGlass
                                        ? 'bg-white/20 text-white shadow-md'
                                        : 'bg-white text-green-600 shadow-sm'
                                    : isGlass
                                        ? 'text-white/40 hover:text-white/70'
                                        : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={13} />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── CONTENIDO DE TAB ── */}
            <div className="min-h-[300px]">
                <Suspense fallback={
                    <div className={`flex items-center justify-center p-12 text-sm font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                        <div className="w-5 h-5 border-4 border-t-green-500 border-green-500/20 rounded-full animate-spin mr-3" />
                        Cargando...
                    </div>
                }>
                    {activeTab === 'portafolio'  && <PortfolioTab isGlass={isGlass} privacyMode={privacyMode} currencyView={currencyView} />}
                    {activeTab === 'operaciones' && <OperationsTab isGlass={isGlass} privacyMode={privacyMode} />}
                    {activeTab === 'analisis'    && <AnalyticsTab isGlass={isGlass} privacyMode={privacyMode} />}
                    {activeTab === 'objetivo'    && <SavingsGoal />}
                </Suspense>
            </div>

            {/* ── FAB: Nueva Operación ── */}
            <button
                type="button"
                aria-label="Nueva Operación"
                onClick={() => setShowAddModal(true)}
                className={`fixed bottom-20 right-5 z-40 flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm text-white shadow-2xl transition-all duration-200 active:scale-95 ${
                    isGlass
                        ? 'bg-green-500/80 hover:bg-green-500 backdrop-blur-md border border-green-400/30 shadow-green-500/30'
                        : 'bg-green-500 hover:bg-green-600 shadow-green-500/40'
                }`}
            >
                <Plus size={18} strokeWidth={3} />
                <span>Nueva Operación</span>
            </button>

            {/* ── Modal de operación ── */}
            {showAddModal && (
                <OperationModal
                    onClose={() => setShowAddModal(false)}
                    isGlass={isGlass}
                />
            )}
        </div>
    );
}
