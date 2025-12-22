import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const CAT_LABELS = {
    'supermarket': 'Supermercado',
    'health': 'Salud',
    'food': 'Comida',
    'transport': 'Transporte',
    'services': 'Servicios',
    'shopping': 'Compras',
    'home': 'Hogar',
    'education': 'Educación',
    'varios': 'Varios'
};

export default function Dashboard({ transactions = [], cards = [], services = [], privacyMode, currentDate, isGlass }) {

    const [viewMode, setViewMode] = useState('general'); // 'general' | 'cards_detail'

    // 1. CLAVE DEL MES (Máquina del Tiempo ⏳)
    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // =================================================================
    // 1. CÁLCULOS GENERALES (Compatibles con Fecha Seleccionada)
    // =================================================================

    // Filtro de Transacciones del Mes SELECCIONADO
    const monthlyTransactions = useMemo(() => {
        const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();

        return transactions.filter(t => {
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);

            if (t.type === 'cash') {
                return tLocal.getMonth() === currentDate.getMonth() && tLocal.getFullYear() === currentDate.getFullYear();
            }
            // Si es CRÉDITO, tiene que ser una cuota activa en este mes
            const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
            const endMonthVal = startMonthVal + (t.installments || 1);
            return targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal;
        });
    }, [transactions, currentDate]);

    // A. MOCHILA FUTURA (Mes Siguiente)
    const futureBackpack = useMemo(() => {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const targetMonthVal = nextMonth.getFullYear() * 12 + nextMonth.getMonth();
        const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

        let total = 0;

        // 1. Sumar Deuda de Tarjetas (Considerando Ajustes Manuales Futuros si existieran)
        cards.forEach(c => {
            // Si hay ajuste manual para el mes que viene, usamos ese.
            if (c.adjustments?.[nextMonthKey] !== undefined) {
                total += c.adjustments[nextMonthKey];
            } else {
                // Si no, calculamos transacciones
                const cardDebt = transactions
                    .filter(t => t.cardId === c.id && t.type !== 'cash')
                    .reduce((acc, t) => {
                        const tDate = new Date(t.date);
                        const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                        const startVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                        const endVal = startVal + t.installments;
                        if (targetMonthVal >= startVal && targetMonthVal < endVal) {
                            return acc + t.monthlyInstallment;
                        }
                        return acc;
                    }, 0);
                total += cardDebt;
            }
        });
        return total;
    }, [transactions, currentDate, cards]);

    // B. GASTO CONTADO (Mes Seleccionado)
    const cashSpent = useMemo(() => {
        return monthlyTransactions
            .filter(t => t.type === 'cash')
            .reduce((acc, t) => acc + t.amount, 0);
    }, [monthlyTransactions]);

    // C. MAREA SEMANAL (Usando lógica robusta de ajustes)
    const weeklyTide = useMemo(() => {
        const weeks = [0, 0, 0, 0];

        // 1. Servicios
        services.forEach(s => {
            // Lógica simplificada de frecuencia para visualización rápida
            // (Idealmente importar lógica de ServicesManager, pero aquí asumimos todos los activos para marea)
            const day = s.day || 1;
            const idx = day <= 7 ? 0 : day <= 15 ? 1 : day <= 23 ? 2 : 3;
            weeks[idx] += s.amount;
        });

        // 2. Tarjetas (Con Ajuste Manual)
        cards.forEach(c => {
            let debt = 0;
            if (c.adjustments?.[currentMonthKey] !== undefined) {
                debt = c.adjustments[currentMonthKey];
            } else {
                debt = monthlyTransactions
                    .filter(t => t.cardId === c.id)
                    .reduce((acc, t) => acc + (t.monthlyInstallment || 0), 0);
            }

            if (debt > 0) {
                const day = c.dueDay || 10;
                const idx = day <= 7 ? 0 : day <= 15 ? 1 : day <= 23 ? 2 : 3;
                weeks[idx] += debt;
            }
        });

        const max = Math.max(...weeks, 1);
        return weeks.map(amount => ({ amount, height: (amount / max) * 100 }));
    }, [services, cards, monthlyTransactions, currentMonthKey]);

    // D. BARRAS APILADAS
    const stackedData = useMemo(() => {
        const groups = {};
        monthlyTransactions.forEach(t => {
            const cat = t.category || 'varios';
            if (!groups[cat]) groups[cat] = { cash: 0, credit: 0, total: 0 };

            const val = t.type === 'cash' ? t.amount : t.monthlyInstallment;
            if (t.type === 'cash') groups[cat].cash += val;
            else groups[cat].credit += val;
            groups[cat].total += val;
        });

        return Object.entries(groups)
            .map(([key, val]) => ({
                label: CAT_LABELS[key] || key,
                ...val,
                cashPct: (val.cash / val.total) * 100,
                creditPct: (val.credit / val.total) * 100
            }))
            .sort((a, b) => b.total - a.total);
    }, [monthlyTransactions]);


    // =================================================================
    // 2. LÓGICA VISTA DETALLE
    // =================================================================
    const [selectedCard, setSelectedCard] = useState('all');
    const [analysisMode, setAnalysisMode] = useState('monthly'); // monthly | total
    const [detailViewType, setDetailViewType] = useState('list');

    const detailTransactions = useMemo(() => {
        if (analysisMode === 'monthly') return monthlyTransactions.filter(t => t.type !== 'cash');

        // Modo Total: Todas las deudas activas a futuro
        return transactions.filter(t => t.type !== 'cash' && t.installments > 1);
    }, [transactions, monthlyTransactions, analysisMode]);

    const spendingByCard = useMemo(() => {
        return cards.map(card => {
            const total = detailTransactions
                .filter(t => t.cardId === card.id)
                .reduce((acc, t) => acc + (analysisMode === 'monthly' ? t.monthlyInstallment : (t.finalAmount || t.amount)), 0);
            return { ...card, total };
        }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    }, [cards, detailTransactions, analysisMode]);

    const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;

    const filteredDetailList = useMemo(() => {
        let list = selectedCard === 'all' ? detailTransactions : detailTransactions.filter(t => t.cardId === selectedCard);
        return list.sort((a, b) => {
            const valA = analysisMode === 'monthly' ? a.monthlyInstallment : a.finalAmount;
            const valB = analysisMode === 'monthly' ? b.monthlyInstallment : b.finalAmount;
            return valB - valA;
        });
    }, [detailTransactions, selectedCard, analysisMode]);

    const detailHeaderTotal = filteredDetailList.reduce((acc, t) => acc + (analysisMode === 'monthly' ? t.monthlyInstallment : (t.finalAmount || t.amount)), 0);

    // Proyección Simple
    const projectionData = useMemo(() => {
        const months = [];
        const baseDate = currentDate || new Date();
        for (let i = 0; i < 6; i++) { // Prox 6 meses
            const futureDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            const futureMonthVal = futureDate.getFullYear() * 12 + futureDate.getMonth();

            let monthlyTotal = 0;
            transactions.filter(t => t.type !== 'cash').forEach(t => {
                const tDate = new Date(t.date);
                const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                const startVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                const endVal = startVal + t.installments;

                if (futureMonthVal >= startVal && futureMonthVal < endVal) {
                    monthlyTotal += t.monthlyInstallment;
                }
            });
            if (monthlyTotal > 0) months.push({ label: futureDate.toLocaleString('es-AR', { month: 'short' }), amount: monthlyTotal });
        }
        return months;
    }, [transactions, currentDate]);

    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    const getCardName = (id) => cards.find(c => c.id === id)?.name || 'Tarjeta';
    const handleDelete = async (id) => { if (window.confirm("¿Eliminar consumo?")) await deleteDoc(doc(db, 'transactions', id)); };


    // =================================================================
    // RENDER
    // =================================================================

    if (viewMode === 'general') {
        return (
            <div className="space-y-6 animate-fade-in pb-20">

                {/* 1. MOCHILA FUTURA VS GASTO HOY */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border shadow-sm ${isGlass ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-green-100 text-gray-800'}`}>
                        <p className={`text-[10px] uppercase font-bold mb-1 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Gasto Contado ({currentDate.toLocaleString('es-AR', { month: 'short' })})</p>
                        <p className="text-2xl font-bold">{showMoney(cashSpent)}</p>
                        <p className="text-[10px] text-green-500 font-medium">Salida de caja real</p>
                    </div>
                    <div className={`p-4 rounded-2xl shadow-lg relative overflow-hidden ${isGlass ? 'bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border border-white/10 text-white' : 'bg-indigo-900 text-white'}`}>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-5 rounded-full -mr-5 -mt-5"></div>
                        <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">Mochila Futura (Próx Mes)</p>
                        <p className="text-2xl font-bold">{showMoney(futureBackpack)}</p>
                        <p className="text-[10px] text-indigo-300 font-medium">Ya comprometido</p>
                    </div>
                </div>

                {/* 2. MAREA SEMANAL */}
                <div className={`p-5 rounded-2xl shadow-sm border ${isGlass ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
                    <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>🌊 Marea Semanal <span className={`text-[10px] font-normal ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>(Vencimientos)</span></h3>
                    <div className="flex items-end justify-between h-32 gap-4 px-2">
                        {weeklyTide.map((week, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[10px] py-1 px-2 rounded transition-opacity whitespace-nowrap z-10">{showMoney(week.amount)}</div>
                                <div className={`w-full rounded-t-lg relative flex items-end overflow-hidden h-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <div className={`w-full rounded-t-lg transition-all duration-700 ${week.height > 50 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ height: `${week.height}%` }}></div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${isGlass ? 'text-white/40' : 'text-gray-500'}`}>Sem {idx + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. BARRAS APILADAS */}
                <div className={`p-5 rounded-2xl shadow-sm border ${isGlass ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
                    <h3 className={`text-sm font-bold mb-4 ${isGlass ? 'text-white' : 'text-gray-800'}`}>Estructura de Gasto</h3>
                    <div className="space-y-4">
                        {stackedData.map((cat, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-xs mb-1"><span className={`font-bold capitalize ${isGlass ? 'text-white/80' : 'text-gray-700'}`}>{cat.label}</span><span className={`font-mono font-medium ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>{showMoney(cat.total)}</span></div>
                                <div className={`w-full h-2.5 rounded-full flex overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <div className="h-full bg-green-500" style={{ width: `${cat.cashPct}%` }}></div>
                                    <div className="h-full bg-blue-500" style={{ width: `${cat.creditPct}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {stackedData.length === 0 && <p className={`text-center text-xs ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Sin datos este mes.</p>}
                    </div>
                </div>

                <button onClick={() => setViewMode('cards_detail')} className={`w-full py-3 border font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${isGlass ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    Analizar Tarjetas en Detalle
                </button>
            </div>
        );
    }

    // VISTA 2: DETALLE TARJETAS
    return (
        <div className="space-y-6 animate-fade-in pb-32">
            <button onClick={() => setViewMode('general')} className={`flex items-center gap-1 text-xs font-bold mb-2 ${isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>← Volver al Resumen Operativo</button>

            {/* HEADER TARJETA */}
            <div className={`p-6 rounded-2xl text-white shadow-lg relative overflow-hidden transition-all duration-500 ${isGlass ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-[#0f172a]'}`}>
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
                <div className="absolute top-4 right-4 flex bg-black/20 rounded-lg p-1 backdrop-blur-md z-20">
                    <button onClick={() => setAnalysisMode('monthly')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'monthly' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}>Cuota Mes</button>
                    <button onClick={() => setAnalysisMode('total')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'total' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}>Deuda Total</button>
                </div>
                <div className="relative z-10 mt-2">
                    <h2 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">{analysisMode === 'monthly' ? 'A pagar este mes (Calculado)' : 'Deuda Total Activa'}</h2>
                    <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">{showMoney(detailHeaderTotal)}</h1>
                    <p className="text-[10px] text-gray-400 italic">Nota: Si usaste ajustes manuales, este detalle muestra los consumos individuales originales.</p>
                </div>
            </div>

            {/* RANKING */}
            <div className={`p-5 rounded-2xl shadow-sm border ${isGlass ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-center mb-4"><h3 className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>Ranking de Deuda</h3>{selectedCard !== 'all' && <button onClick={() => setSelectedCard('all')} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold hover:bg-gray-200">Ver Todas</button>}</div>
                <div className="space-y-3">
                    {spendingByCard.map((card) => (
                        <div key={card.id} onClick={() => setSelectedCard(card.id === selectedCard ? 'all' : card.id)} className="cursor-pointer group">
                            <div className="flex justify-between text-xs mb-1"><span className={`font-bold ${selectedCard === card.id ? 'text-indigo-600' : (isGlass ? 'text-white/80' : 'text-gray-600')}`}>{card.name}</span><span className={`font-mono font-medium ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>{showMoney(card.total)}</span></div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}><div className={`h-full rounded-full transition-all duration-1000 ${selectedCard === card.id ? 'bg-indigo-600' : 'bg-gray-400'}`} style={{ width: `${(card.total / maxCardSpend) * 100}%` }}></div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* VISTAS DETALLE */}
            <div>
                <div className={`flex p-1 rounded-xl mb-4 ${isGlass ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <button onClick={() => setDetailViewType('list')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${detailViewType === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>📄 Lista</button>
                    <button onClick={() => setDetailViewType('blocks')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${detailViewType === 'blocks' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🧱 Bloques</button>
                    <button onClick={() => setDetailViewType('projection')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${detailViewType === 'projection' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🔮 Futuro</button>
                </div>

                {detailViewType === 'list' && (
                    <div className={`rounded-2xl shadow-sm border overflow-hidden divide-y ${isGlass ? 'bg-white/5 border-white/10 divide-white/10' : 'bg-white border-gray-100 divide-gray-50'}`}>
                        {filteredDetailList.map((item) => (
                            <div key={item.id} className={`p-4 flex justify-between items-start group ${isGlass ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}>
                                <div className="flex-1 pr-2">
                                    <p className={`text-sm font-bold line-clamp-1 ${isGlass ? 'text-white' : 'text-gray-800'}`}>{item.description}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap"><span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">{getCardName(item.cardId)}</span>{item.installments > 1 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">{item.installments} pagos</span>}</div>
                                </div>
                                <div className="text-right whitespace-nowrap"><p className={`font-mono font-bold text-sm ${isGlass ? 'text-emerald-300' : 'text-gray-900'}`}>{showMoney(analysisMode === 'monthly' ? item.monthlyInstallment : (item.finalAmount || item.amount))}</p><button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity block w-full text-right">Eliminar</button></div>
                            </div>
                        ))}
                        {filteredDetailList.length === 0 && <p className={`text-center p-8 text-sm ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Sin datos.</p>}
                    </div>
                )}

                {detailViewType === 'blocks' && (
                    <div className={`p-4 rounded-2xl shadow-sm border flex flex-wrap gap-1 min-h-[300px] content-start ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                        {filteredDetailList.map((item, index) => {
                            const val = analysisMode === 'monthly' ? item.monthlyInstallment : (item.finalAmount || item.amount);
                            const percent = (val / detailHeaderTotal) * 100;
                            const widthClass = percent > 40 ? 'w-full' : percent > 20 ? 'w-[49%]' : 'w-[32%]';
                            return (<div key={item.id} className={`${widthClass} h-20 flex-grow rounded-lg ${index < 3 ? 'bg-indigo-600 text-white' : 'bg-indigo-400 text-white'} p-2 flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02] shadow-sm`}><span className="text-[10px] font-bold truncate z-10">{item.description}</span><span className="text-xs font-mono font-bold z-10">{showMoney(val)}</span></div>)
                        })}
                    </div>
                )}

                {detailViewType === 'projection' && (
                    <div className={`p-6 rounded-2xl shadow-sm border relative ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}><div className={`absolute left-8 top-6 bottom-6 w-0.5 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}></div><div className="space-y-6 relative">{projectionData.map((month, index) => (<div key={index} className="flex items-center gap-6 relative group"><div className={`absolute left-[7px] w-3 h-3 bg-indigo-300 rounded-full z-10`}></div><div className={`pl-8 flex-1 flex justify-between items-center p-3 rounded-xl transition-colors ${isGlass ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}><div><p className={`font-bold capitalize text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>{month.label}</p></div><p className={`font-mono font-bold ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>{showMoney(month.amount)}</p></div></div>))}</div></div>
                )}
            </div>
        </div>
    );
}