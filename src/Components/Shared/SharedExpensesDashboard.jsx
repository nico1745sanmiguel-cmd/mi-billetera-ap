import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Scale, Users, ChevronLeft, CreditCard, ShoppingCart, Lightbulb, User, LayoutList, Plus, X, CheckCircle, Clock, TrendingUp, Wallet, ArrowLeftRight, AlertTriangle, Copy, Share2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCards } from '../../context/CardsContext';
import { useSupermarket } from '../../context/SupermarketContext';
import { useServices } from '../../context/ServicesContext';
import { useUI } from '../../context/UIContext';
import { formatMoney } from '../../utils';
import { calcularProporciones, calcularAportesExactos, calcularLiquidacionNeta } from '../../utils/salaryUtils';
import { buildCardsWithDebt, formatMonthKey } from '../../utils/cardDebtUtils';
import { COLLECTIONS } from '../../config/constants';

// ── MODAL DE APORTES ──────────────────────────────────────────────────────────
function ContributionModal({ person, totalTarget, monthKey, householdId, isGlass, onClose, privacyMode }) {
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const showMoney = (v) => privacyMode ? '****' : formatMoney(v);
    const isMe = person.uid === auth.currentUser?.uid;
    const colors = isMe ? 'from-indigo-600 to-blue-600' : 'from-emerald-600 to-teal-600';
    const accentColor = isMe ? 'indigo' : 'emerald';

    // Escuchar aportes en tiempo real
    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.CONTRIBUTIONS),
            where('householdId', '==', householdId),
            where('uid', '==', person.uid),
            where('monthKey', '==', monthKey)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setContributions(data);
            setLoading(false);
        });
        return () => unsub();
    }, [householdId, person.uid, monthKey]);

    const totalPagado = useMemo(() => contributions.reduce((acc, c) => acc + (c.amount || 0), 0), [contributions]);
    const progreso = totalTarget > 0 ? Math.min((totalPagado / totalTarget) * 100, 100) : 0;
    const falta = Math.max(totalTarget - totalPagado, 0);

    const [saveError, setSaveError] = useState('');

    const handleAdd = async () => {
        const num = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (!num || num <= 0) return;

        if (!householdId) {
            setSaveError('Error: no se encontró el hogar. Volvé al inicio y reintentá.');
            return;
        }

        setSaving(true);
        setSaveError('');
        try {
            await addDoc(collection(db, COLLECTIONS.CONTRIBUTIONS), {
                householdId,
                uid: person.uid,
                monthKey,
                amount: num,
                note: note.trim() || null,
                createdAt: serverTimestamp(),
            });
            setAmount('');
            setNote('');
        } catch (e) {
            console.error('Error al guardar aporte:', e);
            setSaveError(`No se pudo guardar: ${e.message}`);
        }
        setSaving(false);
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') handleAdd(); };

    // Formatear input con puntos de miles al escribir
    const handleAmountChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) { setAmount(''); return; }
        setAmount(Number(raw).toLocaleString('es-AR'));
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            {/* Fondo oscuro */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

            {/* Panel centrado */}
            <div
                className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto ${
                    isGlass
                        ? 'bg-gray-900 text-white border border-white/10'
                        : 'bg-white text-gray-900'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Encabezado con gradiente */}
                <div className={`bg-gradient-to-br ${colors} p-5 mx-4 mt-4 rounded-2xl text-white`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs font-bold uppercase opacity-70 tracking-widest">
                                {isMe ? 'Tu Aporte' : `Aporte ${person.displayName?.split(' ')[0]}`}
                            </p>
                            <p className="text-2xl font-bold font-mono">{showMoney(totalPagado)}</p>
                            <p className="text-xs opacity-70 mt-0.5">de {showMoney(totalTarget)}</p>
                        </div>
                        <button aria-label="Acción" type="button" onClick={onClose} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Barra de progreso grande */}
                    <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-700"
                            style={{ width: `${progreso}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] font-bold">
                        <span>{progreso.toFixed(0)}% aportado</span>
                        {falta > 0
                            ? <span className="opacity-70">Falta {showMoney(falta)}</span>
                            : <span className="flex items-center gap-1"><CheckCircle size={11} /> Completado!</span>
                        }
                    </div>
                </div>

                {/* Input para nuevo aporte */}
                <div className="px-4 mt-4">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                        Registrar aporte
                    </p>
                    <div className="flex gap-2">
                        <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border ${
                            isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                        }`}>
                            <span className={`text-sm font-bold ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>$</span>
                            <input autoComplete="off" id="contribution-amount"
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={amount}
                                onChange={handleAmountChange}
                                onKeyDown={handleKeyDown}
                                className={`flex-1 bg-transparent font-mono font-bold text-base outline-none ${
                                    isGlass ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-300'
                                }`}
                            />
                        </div>
                        <button aria-label="Acción" type="button"
                            onClick={handleAdd}
                            disabled={!amount || saving}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold transition-all active:scale-95 bg-gradient-to-br ${colors} text-white disabled:opacity-40`}
                        >
                            {saving ? <Clock size={20} className="animate-spin" /> : <Plus size={20} />}
                        </button>
                    </div>

                    {/* Nota opcional */}
                    <input autoComplete="off" id="contribution-note"
                        type="text"
                        placeholder="Nota (opcional)..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`w-full mt-2 px-4 py-2.5 rounded-xl border text-sm outline-none ${
                            isGlass
                                ? 'bg-white/5 border-white/10 text-white placeholder-gray-600'
                                : 'bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400'
                        }`}
                    />
                    {saveError && (
                        <p className="mt-2 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">
                            ⚠️ {saveError}
                        </p>
                    )}
                </div>

                {/* Lista de aportes previos */}
                <div className="px-4 mt-5 pb-8">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                        Aportes del mes
                    </p>

                    {loading && (
                        <div className={`text-center py-4 text-sm ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>Cargando...</div>
                    )}

                    {!loading && contributions.length === 0 && (
                        <div className={`text-center py-6 rounded-2xl border border-dashed ${isGlass ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                            <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin aportes registrados aún</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {contributions.map((c) => {
                            const fecha = c.createdAt?.toDate?.()?.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) || '—';
                            return (
                                <div key={c.id} className={`flex items-center justify-between px-4 py-3 rounded-2xl ${
                                    isGlass ? 'bg-white/5' : 'bg-gray-50'
                                }`}>
                                    <div>
                                        <p className={`text-xs ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>{fecha}</p>
                                        {c.note && <p className={`text-xs mt-0.5 ${isGlass ? 'text-gray-300' : 'text-gray-600'}`}>{c.note}</p>}
                                    </div>
                                    <p className={`font-mono font-bold text-sm text-${accentColor}-${isGlass ? '300' : '600'}`}>
                                        + {showMoney(c.amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function SharedExpensesDashboard({ onBack }) {
    const { currentDate, privacyMode, isGlass } = useUI();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const householdId = userData?.householdId;

    const { cards, transactions } = useCards();
    const { superItems: supermarketItems, freshItems } = useSupermarket();
    const { services } = useServices();
    const [proporciones, setProporciones] = useState([]);
    const [loadingProps, setLoadingProps] = useState(false);
    const [propsError, setPropsError] = useState('');
    const [splitMode, setSplitMode] = useState('proportional');
    const [selectedPerson, setSelectedPerson] = useState(null); // { uid, displayName, proportion }
    const [allContributions, setAllContributions] = useState([]);
    const [copiedSettlement, setCopiedSettlement] = useState(false);

    const currentUid = auth.currentUser?.uid;
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const currentMonthKey = useMemo(() => formatMonthKey(currentDate), [currentDate]);
    const targetMonthVal = useMemo(() => currentDate.getFullYear() * 12 + currentDate.getMonth(), [currentDate]);

    // 1. OBTENER ITEMS COMPARTIDOS
    const sharedItems = useMemo(() => {
        const sharedServices = services.flatMap(s => s.isShared !== false ? [{
            ...s, type: 'service',
            icon: <Lightbulb size={16} className="text-yellow-400" />
        }] : []);

        const allCardsWithDebt = buildCardsWithDebt(cards, transactions, currentMonthKey, targetMonthVal);
        const sharedCards = allCardsWithDebt.flatMap(c => 
            c.isShared !== false && c.currentDebt > 0 ? [{
                id: c.id, name: c.name, amount: c.currentDebt,
                day: c.dueDay || 10, type: 'card',
                icon: <CreditCard size={16} className="text-indigo-400" />
            }] : []
        );

        const sharedSuperItems = supermarketItems.filter(i => i.month === currentMonthKey && i.isShared !== false);
        const superTotal = sharedSuperItems.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0);
        
        const sharedFreshItems = freshItems.filter(i => i.month === currentMonthKey && i.isShared !== false);
        const freshTotal = sharedFreshItems.reduce((acc, i) => acc + (Number(i.total) || 0), 0);

        const result = [...sharedServices, ...sharedCards];
        if (superTotal > 0) result.push({ id: 'super_total', name: 'Supermercado (Presupuesto)', amount: superTotal, day: 1, type: 'super', icon: <ShoppingCart size={16} className="text-purple-400" /> });
        if (freshTotal > 0) result.push({ id: 'fresh_total', name: 'Planificador (Presupuesto/Gasto)', amount: freshTotal, day: 1, type: 'fresh', icon: <LayoutList size={16} className="text-indigo-400" /> });

        // Añadir Gastos Manuales compartidos
        const sharedCash = transactions.filter(t => 
            t.type === 'cash' && 
            t.date && t.date.substring(0, 7) === currentMonthKey && 
            t.isShared !== false
        );
        const cashTotal = sharedCash.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        if (cashTotal > 0) result.push({ id: 'cash_total', name: 'Gastos Manuales', amount: cashTotal, day: 1, type: 'cash', icon: <Wallet size={16} className="text-pink-400" /> });

        return result.sort((a, b) => a.day - b.day);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services, cards, transactions, supermarketItems, currentMonthKey, currentDate, freshItems]);

    const grandTotal = useMemo(() => sharedItems.reduce((acc, i) => acc + (i.amount || 0), 0), [sharedItems]);

    // 2. CARGAR PROPORCIONES
    useEffect(() => {
        if (!householdId) return;
        const loadProps = async () => {
            setLoadingProps(true);
            setPropsError('');
            try {
                const hhSnap = await getDoc(doc(db, 'households', householdId));
                if (!hhSnap.exists()) return;
                const data = hhSnap.data();
                const memberIds = data.members || [];
                const snaps = await Promise.all(memberIds.map(uid => getDoc(doc(db, 'users', uid))));
                const members = snaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id, displayName: '?', salaryHistory: [] });
                setProporciones(calcularProporciones(members, splitMode));
            } catch (e) {
                console.error(e);
                setPropsError('No se pudieron cargar los datos del grupo familiar.');
            }
            finally { setLoadingProps(false); }
        };
        loadProps();
         
    }, [householdId, splitMode]);

    // 3. ESCUCHAR TODOS LOS APORTES DEL MES (tiempo real, para las barras de las tarjetas)
    useEffect(() => {
        if (!householdId) return;
        const q = query(
            collection(db, COLLECTIONS.CONTRIBUTIONS),
            where('householdId', '==', householdId),
            where('monthKey', '==', currentMonthKey)
        );
        const unsub = onSnapshot(q, (snap) => {
            setAllContributions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
         
    }, [householdId, currentMonthKey]);

    // Total pagado por persona (para las barras)
    const getPagadoPor = useCallback((uid) => {
        return allContributions
            .filter(c => c.uid === uid)
            .reduce((acc, c) => acc + (c.amount || 0), 0);
    }, [allContributions]);

    const allHaveProportions = proporciones.length > 0;

    // Aportes exactos por miembro con Hare-Niemeyer (sin drift de centavos)
    const aportesPorMiembro = useMemo(() => {
        if (!allHaveProportions || grandTotal <= 0) return [];
        return calcularAportesExactos(grandTotal, proporciones);
    }, [allHaveProportions, grandTotal, proporciones]);

    // Liquidación neta: quién le debe a quién
    const liquidacion = useMemo(() => {
        if (!allHaveProportions) return null;
        return calcularLiquidacionNeta(proporciones, sharedItems, allContributions, { splitMode });
    }, [allHaveProportions, proporciones, sharedItems, allContributions, splitMode]);

    const handleCopySettlement = () => {
        if (!liquidacion || !liquidacion.transferencias || liquidacion.transferencias.length === 0) return;
        const monthLabel = currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
        const modeLabel = splitMode === 'proportional' ? 'Proporcional por sueldos' : 'Equitativo (partes iguales)';
        let text = `💳 *Liquidación Neta - Mi Billetera (${monthLabel})*\n`;
        text += `Modo: ${modeLabel}\n`;
        text += `Total Gastos Compartidos: ${formatMoney(grandTotal)}\n\n`;
        text += `*Transferencias de Compensación:*\n`;
        liquidacion.transferencias.forEach(t => {
            text += `• ${t.fromName} ➔ ${t.toName}: ${formatMoney(t.amount)}\n`;
        });
        navigator.clipboard.writeText(text);
        setCopiedSettlement(true);
        setTimeout(() => setCopiedSettlement(false), 2500);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* HEADER */}
            <div className="flex items-center gap-4 px-2">
                <button aria-label="Acción" type="button" onClick={onBack} className={`p-2 rounded-xl transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-white shadow-sm hover:bg-gray-50'}`}>
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold">Desglose Compartido</h1>
                    <p className={`text-xs font-bold uppercase ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        {currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* TOGGLE: Proporcional / Equitativo */}
            {allHaveProportions && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                        <Scale size={16} className={isGlass ? 'text-indigo-300' : 'text-indigo-500'} />
                        <span className="text-sm font-bold">Modo de reparto</span>
                    </div>
                    <div className={`flex rounded-xl overflow-hidden border ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                        <button
                            type="button"
                            onClick={() => setSplitMode('proportional')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all ${
                                splitMode === 'proportional'
                                    ? 'bg-indigo-600 text-white'
                                    : isGlass ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            Proporcional
                        </button>
                        <button
                            type="button"
                            onClick={() => setSplitMode('equal')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all ${
                                splitMode === 'equal'
                                    ? 'bg-indigo-600 text-white'
                                    : isGlass ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            Equitativo
                        </button>
                    </div>
                </div>
            )}

            {/* AVISO: Sueldos incompletos (fallback a equitativo) */}
            {proporciones.hasIncompleteSalaries && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl ${isGlass ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className={`text-xs font-bold ${isGlass ? 'text-amber-300' : 'text-amber-700'}`}>Reparto equitativo temporal</p>
                        <p className={`text-[11px] mt-0.5 ${isGlass ? 'text-amber-400/70' : 'text-amber-600'}`}>
                            Faltan datos de sueldo en uno o más miembros. El reparto se divide en partes iguales hasta que todos carguen su sueldo.
                        </p>
                    </div>
                </div>
            )}

            {/* ERROR: Carga de proporciones */}
            {propsError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <p className="text-xs font-bold text-red-400">{propsError}</p>
                </div>
            )}

            {/* LIQUIDACIÓN NETA / TRANSFERENCIAS DE COMPENSACIÓN */}
            {allHaveProportions && liquidacion && (
                <div className={`rounded-3xl border overflow-hidden p-5 ${
                    isGlass ? 'bg-indigo-950/40 border-indigo-500/20' : 'bg-indigo-50/70 border-indigo-100'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <ArrowLeftRight size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold">Liquidación Neta</h2>
                                <p className={`text-xs ${isGlass ? 'text-indigo-300/70' : 'text-indigo-600/80'}`}>
                                    Compensación de cuentas
                                </p>
                            </div>
                        </div>

                        {liquidacion.transferencias?.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopySettlement}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                    copiedSettlement
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                }`}
                            >
                                {copiedSettlement ? (
                                    <>
                                        <Check size={14} /> ¡Copiado!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copiar Resumen
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {liquidacion.transferencias?.length > 0 ? (
                        <div className="space-y-2.5">
                            {liquidacion.transferencias.map((t, i) => {
                                const isFromMe = t.from === currentUid;
                                const isToMe = t.to === currentUid;
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                                            isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                <span className={`px-2 py-0.5 rounded-lg ${isFromMe ? 'bg-amber-500/20 text-amber-500 font-bold' : isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                    {t.fromName}
                                                </span>
                                                <span className="text-indigo-400">➔</span>
                                                <span className={`px-2 py-0.5 rounded-lg ${isToMe ? 'bg-emerald-500/20 text-emerald-500 font-bold' : isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                    {t.toName}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-sm text-indigo-500">
                                            {showMoney(t.amount)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed ${
                            isGlass ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-emerald-200 bg-emerald-50/50 text-emerald-700'
                        }`}>
                            <CheckCircle size={18} />
                            <span className="text-sm font-bold">¡Cuentas al día!</span>
                        </div>
                    )}
                </div>
            )}

            {/* RESUMEN DE APORTES — Botones con barra de progreso */}
            {allHaveProportions && (
                <div className="grid grid-cols-2 gap-4 px-1">
                    {proporciones.map((p, idx) => {
                        const isMe = p.uid === currentUid;
                        const aporte = aportesPorMiembro[idx]?.aporte ?? Math.round(grandTotal * (p.proportion || 0));
                        const pagado = getPagadoPor(p.uid);
                        const progreso = aporte > 0 ? Math.min((pagado / aporte) * 100, 100) : 0;
                        const falta = Math.max(aporte - pagado, 0);
                        const colors = isMe ? 'from-indigo-600 to-blue-600' : 'from-emerald-600 to-teal-600';
                        const completo = pagado >= aporte && aporte > 0;

                        return (
                            <button aria-label="Acción" type="button"
                                key={p.uid}
                                onClick={() => setSelectedPerson({ ...p, totalTarget: aporte })}
                                className={`relative overflow-hidden p-4 rounded-[24px] text-white shadow-lg bg-gradient-to-br ${colors} text-left active:scale-95 transition-transform select-none`}
                            >
                                <div className="relative z-10">
                                    <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mb-1">
                                        {isMe ? 'Tu Aporte' : `Aporte ${p.displayName?.split(' ')[0]}`}
                                    </p>
                                    <p className="text-xl font-bold font-mono leading-none">{showMoney(pagado)}</p>
                                    <p className="text-[10px] opacity-60 font-mono mt-0.5">de {showMoney(aporte)}</p>

                                    {/* Barra de progreso */}
                                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mt-3 mb-1.5">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-700"
                                            style={{ width: `${progreso}%` }}
                                        />
                                    </div>

                                    {completo
                                        ? <p className="text-[10px] font-bold bg-white/20 w-fit px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle size={9} /> Completo
                                          </p>
                                        : <p className="text-[10px] font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full">
                                            Falta {showMoney(falta)}
                                          </p>
                                    }
                                </div>
                                <div className="absolute -right-2 -bottom-2 opacity-20">
                                    <User size={64} />
                                </div>
                                {/* Indicador de toque */}
                                <div className="absolute top-2 right-2 opacity-40">
                                    <Plus size={14} />
                                </div>
                            </button>
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

                            {allHaveProportions && (() => {
                                const itemAportes = calcularAportesExactos(item.amount || 0, proporciones);
                                return (
                                <div className="flex gap-1 pt-2 border-t border-white/5 w-full">
                                    {proporciones.map((p, index) => {
                                        const aporteIndividual = itemAportes[index]?.aporte ?? 0;
                                        const isMe = p.uid === currentUid;
                                        
                                        const isFirst = index === 0;
                                        const isLast = index === proporciones.length - 1;
                                        const radiusClass = proporciones.length > 1 
                                            ? (isFirst ? "rounded-l-xl rounded-r-md" : isLast ? "rounded-r-xl rounded-l-md" : "rounded-md")
                                            : "rounded-xl";

                                        const pctWidth = Math.max((p.proportion || 0) * 100, 20);

                                        return (
                                            <div 
                                                key={p.uid} 
                                                style={{ width: `${pctWidth}%`, minWidth: '4.5rem' }}
                                                className={`p-2 flex justify-between items-center overflow-hidden ${radiusClass} ${
                                                isMe 
                                                ? (isGlass ? 'bg-indigo-500/20 text-indigo-200' : 'bg-indigo-50 text-indigo-700')
                                                : (isGlass ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700')
                                            }`}>
                                                <span className="text-[10px] font-bold uppercase opacity-70 truncate mr-1">{p.displayName?.split(' ')[0]}</span>
                                                <span className="text-xs font-mono font-bold whitespace-nowrap">{showMoney(aporteIndividual)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                );
                            })()}
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
                                <p className="text-[10px] text-gray-400 font-medium">
                                    {splitMode === 'proportional' ? 'Proporcional por sueldos' : 'Equitativo (partes iguales)'}
                                </p>
                                <button aria-label="Acción" type="button" onClick={() => navigate('/household')} className="text-[10px] font-bold text-indigo-500 underline mt-1 block">Configurar Sueldos</button>
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
                    <button aria-label="Acción" type="button" onClick={() => navigate('/household')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
                        Configurar Sueldos Ahora
                    </button>
                </div>
            )}

            {/* MODAL DE APORTES */}
            {selectedPerson && (
                <ContributionModal
                    person={selectedPerson}
                    totalTarget={selectedPerson.totalTarget}
                    monthKey={currentMonthKey}
                    householdId={householdId}
                    isGlass={isGlass}
                    privacyMode={privacyMode}
                    onClose={() => setSelectedPerson(null)}
                />
            )}
        </div>
    );
}
