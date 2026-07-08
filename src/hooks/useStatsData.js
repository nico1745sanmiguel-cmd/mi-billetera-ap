import { useMemo } from 'react';
import { ShoppingCart, Stethoscope, Utensils, CarFront, Lightbulb, ShoppingBag, Home, BookOpen, Package, CreditCard, Apple, Wallet } from 'lucide-react';

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

export const useStatsData = ({
    currentDate,
    expenseScope,
    transactions,
    cards,
    services,
    supermarketItems,
    freshItems,
    filter
}) => {
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

    return {
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
    };
};
