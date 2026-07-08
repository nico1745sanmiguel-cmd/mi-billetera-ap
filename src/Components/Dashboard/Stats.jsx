import React, { useMemo, useState } from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
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
import StatsChart from './StatsChart';
import StatsDetails from './StatsDetails';

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

// Renderizado personalizado para el sector activo del gráfico de Dona
const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12} fill={fill} />
        </g>
    );
};

export default function Stats() {
    const { currentDate, privacyMode, isGlass, expenseScope, setExpenseScope } = useUI();
    const { transactions, cards } = useCards();
    const { services } = useServices();
    const { superItems: supermarketItems, freshItems } = useSupermarket();
    const [activeIndex, setActiveIndex] = useState(0);
    const [filter, setFilter] = useState('all'); // 'all', 'super_fresh', 'cards_services', 'manual'
    const [expandedItemId, setExpandedItemId] = useState(null);

    const filterByScope = (item) => {
        if (expenseScope === 'all') return true;
        if (expenseScope === 'family') return item.isShared !== false;
        if (expenseScope === 'personal') return item.isShared === false;
        return true;
    };

    // 1. CLAVE DEL MES
    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const targetMonthVal = useMemo(() => currentDate.getFullYear() * 12 + currentDate.getMonth(), [currentDate]);

    // =================================================================
    // PROCESAMIENTO DE DATOS
    // =================================================================

    // A. Transacciones del Mes
    const monthlyTransactions = useMemo(() => {
        return transactions.flatMap(t => {
            if (!filterByScope(t)) return [];
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            if (t.type === 'cash') {
                if (!(tLocal.getMonth() === currentDate.getMonth() && tLocal.getFullYear() === currentDate.getFullYear())) return [];
            } else {
                const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                const endMonthVal = startMonthVal + (t.installments || 1);
                if (!(targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal)) return [];
            }
            return [{
                ...t,
                displayAmount: t.type === 'cash' ? t.amount : t.monthlyInstallment
            }];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactions, currentDate, targetMonthVal, expenseScope]);

    const cashTransactions = useMemo(() => monthlyTransactions.filter(t => t.type === 'cash'), [monthlyTransactions]);
    const cashSpent = cashTransactions.reduce((acc, t) => acc + t.displayAmount, 0);

    // B. Tarjetas
    const cardsStatus = useMemo(() => {
        return cards.flatMap(c => {
            if (!filterByScope(c)) return [];
            let debt = 0;
            let cardTransactions = [];
            const manualDebt = c.monthlyStatements?.[currentMonthKey]?.totalDue ?? c.adjustments?.[currentMonthKey];
            
            if (manualDebt !== undefined) {
                debt = manualDebt;
                cardTransactions = [{ id: 'adj', description: 'Resumen Manual', monthlyInstallment: debt, installments: 1, installmentCount: 1, displayAmount: debt }];
            } else {
                cardTransactions = monthlyTransactions.filter(t => t.cardId === c.id);
                debt = cardTransactions.reduce((acc, t) => acc + t.displayAmount, 0);
            }
            return debt > 0 ? [{ ...c, currentMonthDebt: debt, details: cardTransactions }] : [];
        }).sort((a, b) => b.currentMonthDebt - a.currentMonthDebt);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, monthlyTransactions, currentMonthKey, expenseScope]);
    
    const cardsTotalDebt = cardsStatus.reduce((acc, c) => acc + c.currentMonthDebt, 0);

    // C. Servicios
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const scopedServices = useMemo(() => services.filter(filterByScope), [services, expenseScope]);
    const servicesTotal = scopedServices.reduce((acc, s) => acc + Number(s.amount || 0), 0);

    // D. Supermercado
    const scopedSuperItems = useMemo(() => expenseScope === 'personal' ? [] : supermarketItems, [supermarketItems, expenseScope]);
    const monthlySuper = scopedSuperItems.filter(i => i.month === currentMonthKey);
    const superSpent = monthlySuper.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const superProjected = monthlySuper.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const superEffective = monthlySuper.some(i => i.checked) ? superSpent : superProjected;

    // E. Feria & Frescos
    const scopedFreshItems = useMemo(() => expenseScope === 'personal' ? [] : freshItems, [freshItems, expenseScope]);
    const monthlyFresh = scopedFreshItems.filter(i => i.month === currentMonthKey);
    const freshSpent = monthlyFresh.filter(i => i.checked).reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    const freshProjected = monthlyFresh.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    const freshEffective = monthlyFresh.some(i => i.checked) ? freshSpent : freshProjected;

    // F. TOTALES GLOBALES
    const grandTotal = cashSpent + cardsTotalDebt + servicesTotal + superEffective + freshEffective;

    // G. Proyección Mes Próximo
    const nextMonthCommitted = useMemo(() => {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthVal = nextMonth.getFullYear() * 12 + nextMonth.getMonth();
        const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

        let total = 0;
        cards.forEach(c => {
            if (!filterByScope(c)) return;
            const manualNextValue = c.monthlyStatements?.[nextMonthKey]?.totalDue ?? c.adjustments?.[nextMonthKey];
            if (manualNextValue !== undefined) {
                total += manualNextValue;
            } else {
                const cardDebt = transactions.reduce((acc, t) => {
                    if (t.cardId !== c.id || t.type === 'cash') return acc;
                    const tDate = new Date(t.date);
                    const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                    const startVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                    const endVal = startVal + t.installments;
                    if (nextMonthVal >= startVal && nextMonthVal < endVal) { return acc + t.monthlyInstallment; }
                    return acc;
                }, 0);
                total += cardDebt;
            }
        });
        return total + servicesTotal;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactions, currentDate, cards, servicesTotal, expenseScope]);


    // =================================================================
    // GENERACIÓN DE DATOS PARA EL GRÁFICO SEGÚN FILTRO
    // =================================================================
    
    const chartData = useMemo(() => {
        if (filter === 'all') {
            return [
                { name: 'Súper', value: superEffective, color: '#3b82f6', icon: ShoppingCart },
                { name: 'Feria', value: freshEffective, color: '#10b981', icon: Apple },
                { name: 'Servicios', value: servicesTotal, color: '#f59e0b', icon: Lightbulb },
                { name: 'Tarjetas', value: cardsTotalDebt, color: '#8b5cf6', icon: CreditCard },
                { name: 'Manuales', value: cashSpent, color: '#ec4899', icon: Wallet }
            ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        }

        if (filter === 'super_fresh') {
            const categoryMap = {};
            monthlySuper.forEach(i => {
                if (!categoryMap['Almacén']) categoryMap['Almacén'] = { value: 0, color: '#3b82f6', icon: ShoppingCart };
                categoryMap['Almacén'].value += (i.price * i.quantity);
            });
            monthlyFresh.forEach(i => {
                const catName = i.categoryId || 'Feria';
                if (!categoryMap[catName]) categoryMap[catName] = { value: 0, color: '#10b981', icon: Apple };
                categoryMap[catName].value += Number(i.total || 0);
            });
            return Object.entries(categoryMap).flatMap(([name, data]) => data.value > 0 ? [{ name, ...data }] : []).sort((a, b) => b.value - a.value);
        }

        if (filter === 'cards_services') {
            const data = [];
            cardsStatus.forEach((c, idx) => {
                const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#6366f1'];
                data.push({ name: c.name, value: c.currentMonthDebt, color: COLORS[idx % COLORS.length], icon: CreditCard });
            });
            scopedServices.forEach((s, idx) => {
                const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d'];
                data.push({ name: s.name, value: Number(s.amount), color: COLORS[idx % COLORS.length], icon: Lightbulb });
            });
            return data.sort((a, b) => b.value - a.value);
        }

        if (filter === 'manual') {
            const groups = {};
            cashTransactions.forEach(t => {
                const cat = t.category || 'varios';
                if (!groups[cat]) groups[cat] = 0;
                groups[cat] += t.displayAmount;
            });
            const COLORS = ['#ec4899', '#f43f5e', '#fb7185', '#fda4af', '#fce7f3'];
            return Object.entries(groups).map(([key, amount], idx) => {
                return {
                    name: CAT_LABELS[key] || key,
                    value: amount,
                    color: COLORS[idx % COLORS.length],
                    icon: CAT_ICONS[key] || Package
                };
            }).sort((a, b) => b.value - a.value);
        }
        return [];
    }, [filter, superEffective, freshEffective, servicesTotal, cardsTotalDebt, cashSpent, monthlySuper, monthlyFresh, cardsStatus, scopedServices, cashTransactions]);

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
            <StatsChart 
                chartData={chartData}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                activeChartItem={activeChartItem}
                currentChartTotal={currentChartTotal}
                showMoney={showMoney}
                renderActiveShape={renderActiveShape}
                glassClass={glassClass}
                glassTextPrimary={glassTextPrimary}
                glassTextSecondary={glassTextSecondary}
                isGlass={isGlass}
            />

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