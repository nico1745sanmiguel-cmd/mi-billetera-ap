import React, { useState, useMemo, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Scale, Users, ChevronLeft, CreditCard, ShoppingCart, Lightbulb, User } from 'lucide-react';
import { formatMoney } from '../../utils';
import { calcularProporciones, getLatestSalary } from '../../utils/salaryUtils';

export default function SharedExpensesDashboard({ 
    services = [], 
    cards = [], 
    transactions = [], 
    supermarketItems = [], 
    currentDate, 
    privacyMode, 
    isGlass, 
    householdId,
    onBack,
    setView 
}) {
    const [proporciones, setProporciones] = useState([]);
    const [loadingProps, setLoadingProps] = useState(false);

    const currentUid = auth.currentUser?.uid;
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // 1. OBTENER ITEMS COMPARTIDOS
    const sharedItems = useMemo(() => {
        // A. Servicios compartidos
        const sharedServices = services.filter(s => s.isShared !== false).map(s => ({
            ...s,
            type: 'service',
            icon: <Lightbulb size={16} className="text-yellow-400" />
        }));

        // B. Tarjetas compartidas (deuda del mes)
        const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();
        const sharedCards = cards.filter(c => c.isShared !== false).map(c => {
            const manualAmount = c.monthlyStatements?.[currentMonthKey]?.totalDue ?? c.adjustments?.[currentMonthKey];
            let debt = 0;
            if (manualAmount !== undefined) {
                debt = manualAmount;
            } else {
                debt = transactions
                    .filter(t => t.cardId === c.id && t.type !== 'cash')
                    .reduce((acc, t) => {
                        const tDate = new Date(t.date);
                        const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                        const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                        const endMonthVal = startMonthVal + (t.installments || 1);
                        if (targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal) {
                            return acc + Number(t.monthlyInstallment);
                        }
                        return acc;
                    }, 0);
            }
            if (debt === 0 && manualAmount === undefined) return null;
            return {
                id: c.id,
                name: c.name,
                amount: debt,
                day: c.dueDay || 10,
                type: 'card',
                icon: <CreditCard size={16} className="text-indigo-400" />
            };
        }).filter(Boolean);

        // C. Supermercado compartido
        const sharedSuperItems = supermarketItems.filter(i => i.month === currentMonthKey && i.isShared !== false);
        const superTotal = sharedSuperItems.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0);
        
        const result = [...sharedServices, ...sharedCards];
        if (superTotal > 0) {
            result.push({
                id: 'super_total',
                name: 'Supermercado (Presupuesto)',
                amount: superTotal,
                day: 1, 
                type: 'super',
                icon: <ShoppingCart size={16} className="text-purple-400" />
            });
        }

        return result.sort((a, b) => a.day - b.day);
    }, [services, cards, transactions, supermarketItems, currentMonthKey, currentDate]);

    const grandTotal = useMemo(() => sharedItems.reduce((acc, i) => acc + (i.amount || 0), 0), [sharedItems]);

    // 2. CARGAR PROPORCIONES
    useEffect(() => {
        if (!householdId) return;
        const loadProps = async () => {
            setLoadingProps(true);
            try {
                const hhSnap = await getDoc(doc(db, 'households', householdId));
                if (!hhSnap.exists()) return;
                const data = hhSnap.data();
                const memberIds = data.members || [];
                const snaps = await Promise.all(memberIds.map(uid => getDoc(doc(db, 'users', uid))));
                const members = snaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id, displayName: '?', salaryHistory: [] });
                setProporciones(calcularProporciones(members));
            } catch (e) { console.error(e); }
            finally { setLoadingProps(false); }
        };
        loadProps();
    }, [householdId]);

    const allHaveProportions = proporciones.length > 0;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* HEADER */}
            <div className="flex items-center gap-4 px-2">
                <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-white shadow-sm hover:bg-gray-50'}`}>
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold">Desglose Compartido</h1>
                    <p className={`text-xs font-bold uppercase ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        {currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* RESUMEN DE APORTES (Cartas superiores) */}
            {allHaveProportions && (
                <div className="grid grid-cols-2 gap-4 px-1">
                    {proporciones.map((p, idx) => {
                        const isMe = p.uid === currentUid;
                        const aporte = Math.round(grandTotal * p.proportion);
                        const colors = isMe ? 'from-indigo-600 to-blue-600' : 'from-emerald-600 to-teal-600';
                        return (
                            <div key={p.uid} className={`relative overflow-hidden p-4 rounded-[24px] text-white shadow-lg bg-gradient-to-br ${colors}`}>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mb-1">
                                        {isMe ? 'Tu Aporte' : `Aporte ${p.displayName?.split(' ')[0]}`}
                                    </p>
                                    <p className="text-xl font-bold font-mono leading-none">{showMoney(aporte)}</p>
                                    <p className="text-[10px] mt-2 font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full">{p.percentage}% del total</p>
                                </div>
                                <div className="absolute -right-2 -bottom-2 opacity-20">
                                    <User size={64} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LISTA DETALLADA */}
            <div className={`rounded-3xl border overflow-hidden ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className={`px-5 py-4 border-b ${isGlass ? 'border-white/5 bg-white/5' : 'border-gray-50 bg-gray-50/50'}`}>
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <Scale size={18} className="text-blue-500" /> Conceptos a Dividir
                    </h2>
                </div>

                <div className="p-2 space-y-2">
                    {sharedItems.map((item) => (
                        <div key={item.id} className={`p-3 rounded-2xl border transition-all ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-50 hover:bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{item.name}</p>
                                        <p className={`text-[10px] font-mono ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>{showMoney(item.amount)}</p>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isGlass ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-gray-400'}`}>
                                    Día {item.day}
                                </div>
                            </div>

                            {/* División por persona */}
                            {allHaveProportions && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                    {proporciones.map(p => {
                                        const aporteIndividual = Math.round(item.amount * p.proportion);
                                        const isMe = p.uid === currentUid;
                                        return (
                                            <div key={p.uid} className={`p-2 rounded-xl flex justify-between items-center ${
                                                isMe 
                                                ? (isGlass ? 'bg-indigo-500/20 text-indigo-200' : 'bg-indigo-50 text-indigo-700')
                                                : (isGlass ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700')
                                            }`}>
                                                <span className="text-[10px] font-bold uppercase opacity-70">{p.displayName?.split(' ')[0]}</span>
                                                <span className="text-xs font-mono font-bold">{showMoney(aporteIndividual)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* TOTAL FINAL */}
                    <div className={`mt-4 p-5 rounded-2xl border-2 border-dashed ${isGlass ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-100 bg-indigo-50'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Total del Mes</p>
                                <p className="text-2xl font-bold font-mono">{showMoney(grandTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-medium">Dividido por sueldos netos</p>
                                <button onClick={() => setView('household')} className="text-[10px] font-bold text-indigo-500 underline mt-1 block">Configurar Sueldos</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!allHaveProportions && !loadingProps && (
                <div className={`p-8 text-center rounded-3xl border border-dashed ${isGlass ? 'border-white/20' : 'border-gray-200'}`}>
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    <h3 className="font-bold mb-2">Faltan datos de sueldos</h3>
                    <p className="text-sm opacity-60 mb-6">Para calcular el reparto proporcional, ambos miembros deben cargar su sueldo neto en Grupo Familiar.</p>
                    <button onClick={() => setView('household')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
                        Configurar Sueldos Ahora
                    </button>
                </div>
            )}
        </div>
    );
}
