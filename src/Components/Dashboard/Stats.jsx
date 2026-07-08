import React, { useState, Suspense, lazy } from 'react';
import { 
    ShoppingCart, Stethoscope, Utensils, CarFront, Lightbulb, ShoppingBag, 
    Home, BookOpen, Package, BarChart3, CreditCard, Banknote, CalendarDays, 
    ChevronDown, Apple, Wallet, ChevronRight, CheckCircle2, Circle
} from 'lucide-react';
import { useCards } from '../../context/CardsContext';
import { useServices } from '../../context/ServicesContext';
import { useSupermarket } from '../../context/SupermarketContext';
import { formatMoney } from '../../utils';
import { useUI } from '../../context/UIContext';
import StatsDetails from './StatsDetails';
import { useStatsData } from '../../hooks/useStatsData';

const StatsChart = lazy(() => import('./StatsChart'));

const CAT_LABELS = {
    'supermarket': 'Supermercado',
    'health': 'Salud',
    'food': 'Comida Fuera',
    'transport': 'Transporte',
    'services': 'Servicios',
    'shopping': 'Compras',
    'home': 'Hogar',
    'education': 'Educación',
    'varios': 'Varios'
};

const CAT_ICONS = {
    'supermarket': ShoppingCart,
    'health': Stethoscope,
    'food': Utensils,
    'transport': CarFront,
    'services': Lightbulb,
    'shopping': ShoppingBag,
    'home': Home,
    'education': BookOpen,
    'varios': Package
};

export default function Stats() {
    const { currentDate, privacyMode, isGlass, expenseScope, setExpenseScope } = useUI();
    const { transactions, cards } = useCards();
    const { services } = useServices();
    const { superItems: supermarketItems, freshItems } = useSupermarket();
    const [activeIndex, setActiveIndex] = useState(0);
    const [filter, setFilter] = useState('all'); // 'all', 'super_fresh', 'cards_services', 'manual'

    const {
        grandTotal,
        nextMonthCommitted,
        chartData,
        cardsStatus,
        cashTransactions,
        monthlySuper,
        monthlyFresh,
        scopedServices,
        currentMonthKey,
        superEffective,
        superSpent,
        superProjected,
        freshEffective,
        freshSpent,
        freshProjected,
        cashSpent,
        cardsTotalDebt
    } = useStatsData({
        currentDate,
        expenseScope,
        transactions,
        cards,
        services,
        supermarketItems,
        freshItems,
        filter
    });

    const activeChartItem = chartData[activeIndex];
    const currentChartTotal = chartData.reduce((acc, i) => acc + i.value, 0);

    // Helpers UI
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    
    const glassClass = isGlass ? 'bg-white/5 border-white/10 text-white backdrop-blur-md' : 'bg-white border-gray-100 text-gray-800';
    const glassTextSecondary = isGlass ? 'text-white/60' : 'text-gray-400';
    const glassTextPrimary = isGlass ? 'text-white' : 'text-gray-800';

    return (
        <div className="space-y-6 animate-fade-in pb-24">

            {/* 0. TOGGLE DE ALCANCE (SCOPE) */}
            <div className="flex justify-center -mb-2">
                <div className={`flex items-center p-1 rounded-full ${isGlass ? 'bg-white/10 border border-white/10 backdrop-blur-md' : 'bg-gray-100'}`}>
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'family', label: 'Familiar' },
                        { id: 'personal', label: 'Personal' }
                    ].map(s => (
                        <button type="button"
                            key={s.id}
                            onClick={() => setExpenseScope(s.id)}
                            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                expenseScope === s.id 
                                ? (isGlass ? 'bg-white text-indigo-900 shadow-sm' : 'bg-white text-indigo-600 shadow-sm')
                                : (isGlass ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-black/5')
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 1. HERO CARD - GLOBAL STATUS */}
            <div className={`relative overflow-hidden rounded-[32px] p-6 shadow-xl ${isGlass ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10' : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white'}`}>
                {/* Decoration */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 flex items-center gap-2">
                        <BarChart3 size={14} /> Total Consolidado
                    </span>
                    <h2 className="text-4xl font-black mb-1">{showMoney(grandTotal)}</h2>
                    <p className="text-sm opacity-80 mb-6">Presupuesto del Mes Actual</p>

                    <div className="flex gap-4 w-full">
                        <div className={`flex-1 rounded-2xl p-3 text-left ${isGlass ? 'bg-white/10' : 'bg-black/20'}`}>
                            <p className="text-[10px] uppercase font-bold opacity-70 mb-1 flex items-center gap-1"><Wallet size={12}/> Ejecutado</p>
                            <p className="font-bold">{showMoney(cashSpent + cardsTotalDebt + (monthlySuper.filter(i=>i.checked).reduce((a,i)=>a+(i.price*i.quantity),0)) + (monthlyFresh.filter(i=>i.checked).reduce((a,i)=>a+Number(i.total),0)))}</p>
                        </div>
                        <div className={`flex-1 rounded-2xl p-3 text-left ${isGlass ? 'bg-white/10' : 'bg-black/20'}`}>
                            <p className="text-[10px] uppercase font-bold opacity-70 mb-1 flex items-center gap-1"><CalendarDays size={12}/> Mes Próximo</p>
                            <p className="font-bold">{showMoney(nextMonthCommitted)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. FILTROS (SEGMENTED CONTROL) */}
            <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-1`}>
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'super_fresh', label: 'Super & Feria' },
                    { id: 'cards_services', label: 'Tarjetas & Fijos' },
                    { id: 'manual', label: 'Gastos Sueltos' }
                ].map(f => (
                    <button type="button" 
                        key={f.id}
                        onClick={() => { setFilter(f.id); setActiveIndex(0); }}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                            filter === f.id 
                            ? (isGlass ? 'bg-white text-indigo-900 border-white' : 'bg-indigo-600 text-white border-indigo-600 shadow-md')
                            : (isGlass ? 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* 3. DONUT CHART INTERACTIVO */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-pulse w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>}>
                <StatsChart 
                    chartData={chartData}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    activeChartItem={activeChartItem}
                    currentChartTotal={currentChartTotal}
                    showMoney={showMoney}
                    glassClass={glassClass}
                    glassTextPrimary={glassTextPrimary}
                    glassTextSecondary={glassTextSecondary}
                    isGlass={isGlass}
                />
            </Suspense>

            {/* 4. DETALLE DE ACUERDO AL FILTRO */}
            <StatsDetails 
                filter={filter}
                chartData={chartData}
                showMoney={showMoney}
                cardsStatus={cardsStatus}
                scopedServices={scopedServices}
                currentMonthKey={currentMonthKey}
                cashTransactions={cashTransactions}
                CAT_LABELS={CAT_LABELS}
                superEffective={superEffective}
                superSpent={superSpent}
                superProjected={superProjected}
                freshEffective={freshEffective}
                freshSpent={freshSpent}
                freshProjected={freshProjected}
                currentChartTotal={currentChartTotal}
                glassClass={glassClass}
                glassTextPrimary={glassTextPrimary}
                glassTextSecondary={glassTextSecondary}
                isGlass={isGlass}
            />

        </div>
    );
}