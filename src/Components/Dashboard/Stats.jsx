import React, { useMemo, useState } from 'react';
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
    const { currentDate, privacyMode, isGlass } = useUI();
    const { transactions, cards } = useCards();
    const { services } = useServices();
    const { superItems: supermarketItems, freshItems } = useSupermarket();
    const [activeIndex, setActiveIndex] = useState(0);
    const [filter, setFilter] = useState('all'); // 'all', 'super_fresh', 'cards_services', 'manual'
    const [expandedItemId, setExpandedItemId] = useState(null);

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
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            if (t.type === 'cash') {
                return tLocal.getMonth() === currentDate.getMonth() && tLocal.getFullYear() === currentDate.getFullYear();
            }
            const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
            const endMonthVal = startMonthVal + (t.installments || 1);
            return targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal;
        }).map(t => ({
            ...t,
            displayAmount: t.type === 'cash' ? t.amount : t.monthlyInstallment
        }));
    }, [transactions, currentDate, targetMonthVal]);

    const cashTransactions = useMemo(() => monthlyTransactions.filter(t => t.type === 'cash'), [monthlyTransactions]);
    const cashSpent = cashTransactions.reduce((acc, t) => acc + t.displayAmount, 0);

    // B. Tarjetas
    const cardsStatus = useMemo(() => {
        return cards.map(c => {
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
            return { ...c, currentMonthDebt: debt, details: cardTransactions };
        }).filter(c => c.currentMonthDebt > 0).sort((a, b) => b.currentMonthDebt - a.currentMonthDebt);
    }, [cards, monthlyTransactions, currentMonthKey]);
    
    const cardsTotalDebt = cardsStatus.reduce((acc, c) => acc + c.currentMonthDebt, 0);

    // C. Servicios
    const servicesTotal = services.reduce((acc, s) => acc + Number(s.amount || 0), 0);

    // D. Supermercado
    const monthlySuper = supermarketItems.filter(i => i.month === currentMonthKey);
    const superSpent = monthlySuper.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const superProjected = monthlySuper.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const superEffective = monthlySuper.some(i => i.checked) ? superSpent : superProjected;

    // E. Feria & Frescos
    const monthlyFresh = freshItems.filter(i => i.month === currentMonthKey);
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
            const manualNextValue = c.monthlyStatements?.[nextMonthKey]?.totalDue ?? c.adjustments?.[nextMonthKey];
            if (manualNextValue !== undefined) {
                total += manualNextValue;
            } else {
                const cardDebt = transactions.filter(t => t.cardId === c.id && t.type !== 'cash').reduce((acc, t) => {
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
    }, [transactions, currentDate, cards, servicesTotal]);


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
            return Object.entries(categoryMap).map(([name, data]) => ({ name, ...data })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        }

        if (filter === 'cards_services') {
            const data = [];
            cardsStatus.forEach((c, idx) => {
                const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#6366f1'];
                data.push({ name: c.name, value: c.currentMonthDebt, color: COLORS[idx % COLORS.length], icon: CreditCard });
            });
            services.forEach((s, idx) => {
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
    }, [filter, superEffective, freshEffective, servicesTotal, cardsTotalDebt, cashSpent, monthlySuper, monthlyFresh, cardsStatus, services, cashTransactions]);

    const activeChartItem = chartData[activeIndex];
    const currentChartTotal = chartData.reduce((acc, i) => acc + i.value, 0);

    // Helpers UI
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    
    const glassClass = isGlass ? 'bg-white/5 border-white/10 text-white backdrop-blur-md' : 'bg-white border-gray-100 text-gray-800';
    const glassTextSecondary = isGlass ? 'text-white/60' : 'text-gray-400';
    const glassTextPrimary = isGlass ? 'text-white' : 'text-gray-800';

    return (
        <div className="space-y-6 animate-fade-in pb-24">

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
                    <button 
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
            {chartData.length > 0 ? (
                <div className={`p-6 rounded-[32px] border shadow-sm flex flex-col items-center relative ${glassClass}`}>
                    <h3 className={`w-full text-left font-bold text-sm mb-2 ${glassTextPrimary}`}>Composición del Gasto</h3>
                    <div className="h-56 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    activeIndex={activeIndex}
                                    activeShape={renderActiveShape}
                                    onMouseEnter={(_, index) => setActiveIndex(index)}
                                    onClick={(_, index) => setActiveIndex(index)}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer', outline: 'none' }} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Texto Central */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${glassTextSecondary}`}>
                                {activeChartItem ? 'Selección' : 'Total'}
                            </span>
                            <span className={`text-lg font-black ${glassTextPrimary}`}>
                                {showMoney(activeChartItem ? activeChartItem.value : currentChartTotal)}
                            </span>
                        </div>
                    </div>

                    {/* Leyenda / Info del Activo */}
                    {activeChartItem && (
                        <div className={`mt-4 p-4 rounded-2xl w-full flex items-center justify-between transition-all ${isGlass ? 'bg-white/10' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: activeChartItem.color }}>
                                    <activeChartItem.icon size={20} />
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${glassTextPrimary}`}>{activeChartItem.name}</p>
                                    <p className={`text-[10px] font-bold ${glassTextSecondary}`}>
                                        {Math.round((activeChartItem.value / currentChartTotal) * 100)}% del segmento
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-mono font-bold ${glassTextPrimary}`}>{showMoney(activeChartItem.value)}</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`p-8 rounded-[32px] border text-center ${glassClass}`}>
                    <p className={`text-sm ${glassTextSecondary}`}>No hay datos para este filtro.</p>
                </div>
            )}

            {/* 4. DETALLE DE ACUERDO AL FILTRO */}
            <div className="space-y-4">
                <h3 className={`font-bold text-sm px-2 ${glassTextPrimary}`}>Detalle del Segmento</h3>
                
                {/* VIEW: ALL */}
                {filter === 'all' && (
                    <div className="grid grid-cols-2 gap-3">
                        {chartData.map((item, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${glassClass}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className={`text-xs font-bold ${glassTextSecondary}`}>{item.name}</span>
                                </div>
                                <span className={`text-lg font-black ${glassTextPrimary}`}>{showMoney(item.value)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW: CARDS & SERVICES */}
                {filter === 'cards_services' && (
                    <div className="space-y-3">
                        <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                            <p className="text-xs font-bold uppercase opacity-50 mb-3">Tarjetas</p>
                            <div className="space-y-3">
                                {cardsStatus.map(card => (
                                    <div key={card.id} className="flex justify-between items-center text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{card.name}</span>
                                            <span className="text-[10px] opacity-60">{card.details.length} consumos</span>
                                        </div>
                                        <span className="font-mono font-bold">{showMoney(card.currentMonthDebt)}</span>
                                    </div>
                                ))}
                                {cardsStatus.length === 0 && <p className="text-xs opacity-50">Sin consumos</p>}
                            </div>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                            <p className="text-xs font-bold uppercase opacity-50 mb-3">Servicios Fijos</p>
                            <div className="space-y-3">
                                {services.map(s => {
                                    const isPaid = s.paidPeriods?.includes(currentMonthKey);
                                    return (
                                        <div key={s.id} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                {isPaid ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="opacity-30" />}
                                                <span className={`font-bold ${isPaid ? 'opacity-70 line-through' : ''}`}>{s.name}</span>
                                            </div>
                                            <span className={`font-mono font-bold ${isPaid ? 'opacity-70' : ''}`}>{showMoney(Number(s.amount))}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: MANUAL */}
                {filter === 'manual' && (
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <div className="space-y-4">
                            {chartData.map((cat) => (
                                <div key={cat.name}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <cat.icon size={16} className="opacity-70" />
                                            <span className="text-sm font-bold">{cat.name}</span>
                                        </div>
                                        <span className="font-mono font-bold">{showMoney(cat.value)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${(cat.value / currentChartTotal) * 100}%`, backgroundColor: cat.color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW: SUPER & FRESH */}
                {filter === 'super_fresh' && (
                    <div className="space-y-3">
                        <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-xs font-bold uppercase opacity-50">Resumen Supermercado</p>
                                <span className="font-mono font-bold text-sm">{showMoney(superEffective)}</span>
                            </div>
                            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden flex">
                                <div className="h-full bg-blue-500" style={{ width: `${superProjected > 0 ? (superSpent/superProjected)*100 : 0}%`}}></div>
                            </div>
                            <p className="text-[10px] text-right mt-1 opacity-60">Gastado: {showMoney(superSpent)} / Proyectado: {showMoney(superProjected)}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-xs font-bold uppercase opacity-50">Resumen Feria</p>
                                <span className="font-mono font-bold text-sm">{showMoney(freshEffective)}</span>
                            </div>
                            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${freshProjected > 0 ? (freshSpent/freshProjected)*100 : 0}%`}}></div>
                            </div>
                            <p className="text-[10px] text-right mt-1 opacity-60">Gastado: {showMoney(freshSpent)} / Proyectado: {showMoney(freshProjected)}</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}