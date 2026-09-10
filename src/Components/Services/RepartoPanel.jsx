import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Split, ChevronDown, ChevronUp } from 'lucide-react';
import { calcularProporciones, calcularAportesExactos } from '../../utils/salaryUtils';

/**
 * Panel de Reparto del Mes
 * Muestra cómo se dividen los gastos compartidos entre los miembros del hogar.
 */
export default function RepartoPanel({ allItems, householdId, currentUid, isGlass, showMoney }) {
    const [open, setOpen] = useState(false);
    const [proporciones, setProporciones] = useState([]);
    const [loadingProps, setLoadingProps] = useState(false);
    const [propsError, setPropsError] = useState("");

    // Solo tiene sentido si hay hogar
    const sharedItems = useMemo(() => allItems.filter(i => i.isShared !== false), [allItems]);
    const grandTotal = useMemo(() => sharedItems.reduce((acc, i) => acc + (i.amount || 0), 0), [sharedItems]);

    useEffect(() => {
        if (!householdId || !open) return;
        const loadProps = async () => {
            setLoadingProps(true);
            setPropsError("");
            try {
                const hhSnap = await getDoc(doc(db, 'households', householdId));
                if (!hhSnap.exists()) return;
                const memberIds = hhSnap.data().members || [];
                const snaps = await Promise.all(memberIds.map(uid => getDoc(doc(db, 'users', uid))));
                const members = snaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id, displayName: '?', salaryHistory: [] });
                const rawProporciones = calcularProporciones(members);
                // Guard: sanitizar proporciones inválidas
                const safeProporciones = rawProporciones.map(p => ({
                    ...p,
                    proportion: Number.isFinite(p.proportion) ? p.proportion : 0,
                    percentage: Number.isFinite(p.percentage) ? p.percentage : 0,
                }));
                setProporciones(safeProporciones);
            } catch (e) {
                console.error('Error cargando proporciones del reparto:', e);
                setPropsError("No se pudieron cargar las proporciones. Intentá de nuevo.");
            }
            finally { setLoadingProps(false); }
        };
        loadProps();
    }, [householdId, open]);

    if (!householdId || sharedItems.length === 0) return null;

    const allHaveProportions = proporciones.length > 0;

    return (
        <div className={`rounded-3xl border overflow-hidden transition-all ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            {/* Header colapsable */}
            <button aria-label="Acción" type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between p-5 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isGlass ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Split size={18} />
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>Reparto del Mes</p>
                        <p className={`text-[10px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                            {sharedItems.length} concepto{sharedItems.length !== 1 ? 's' : ''} compartidos · {showMoney(grandTotal)}
                        </p>
                    </div>
                </div>
                {open
                    ? <ChevronUp size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                    : <ChevronDown size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                }
            </button>

            {/* Cuerpo */}
            {open && (
                <div className="px-4 pb-5 space-y-3">

                    {loadingProps && (
                        <p className={`text-xs text-center animate-pulse ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>Calculando proporciones...</p>
                    )}

                    {propsError && !loadingProps && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                            {propsError}
                        </div>
                    )}

                    {/* Cabecera de columnas */}
                    {allHaveProportions && !loadingProps && (
                        <div className="flex items-center gap-2 px-1 mb-1">
                            <div className="flex-1 min-w-0"/>
                            {proporciones.map(p => (
                                <div key={p.uid} className="text-center flex-shrink-0" style={{ minWidth: '4rem', width: '6rem' }}>
                                    <p className={`text-[10px] font-bold truncate ${isGlass ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {p.uid === currentUid ? 'Vos' : (p.displayName?.split(' ')[0] || '?')}
                                    </p>
                                    <p className={`text-[9px] ${isGlass ? 'text-indigo-300' : 'text-indigo-500'}`}>
                                        {Number.isFinite(p.percentage) ? p.percentage : 0}%
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fila por concepto */}
                    {sharedItems.map((item) => {
                        // Usar calcularAportesExactos para cada item individual
                        const aportesPorItem = allHaveProportions
                            ? calcularAportesExactos(item.amount || 0, proporciones)
                            : [];
                        return (
                            <div key={item.id} className={`rounded-2xl p-3 border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2 overflow-x-auto">
                                    {/* Día */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                        item.isPaid
                                            ? (isGlass ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700')
                                            : (isGlass ? 'bg-white/10 text-white/60' : 'bg-white text-gray-500 border border-gray-200')
                                    }`}>
                                        {item.day}
                                    </div>
                                    {/* Nombre */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${
                                            item.isPaid
                                                ? (isGlass ? 'text-green-300 line-through' : 'text-green-700 line-through')
                                                : (isGlass ? 'text-white' : 'text-gray-800')
                                        }`}>
                                            {item.name}
                                        </p>
                                        <p className={`text-[10px] font-mono ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {showMoney(item.amount || 0)}
                                        </p>
                                    </div>
                                    {/* Columnas proporcionales */}
                                    {aportesPorItem.map((ap, idx) => {
                                        const aporte = Number.isFinite(ap?.aporte) ? ap.aporte : 0;
                                        const esYo = proporciones[idx]?.uid === currentUid;
                                        return (
                                            <div key={proporciones[idx]?.uid || idx} className={`text-center px-1 py-1.5 rounded-xl text-xs flex-shrink-0 ${
                                                esYo
                                                    ? (isGlass ? 'bg-indigo-500/15 text-indigo-200' : 'bg-indigo-50 text-indigo-700')
                                                    : (isGlass ? 'bg-white/5 text-gray-300' : 'bg-white text-gray-600 border border-gray-100')
                                            }`} style={{ minWidth: '4rem', width: '6rem' }}>
                                                <p className="text-xs font-mono font-bold truncate">{showMoney(aporte)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Totales */}
                    {allHaveProportions && !loadingProps && (() => {
                        const totalAportes = calcularAportesExactos(grandTotal, proporciones);
                        return (
                            <div className={`flex items-center gap-2 p-3 rounded-2xl border-t-2 overflow-x-auto ${isGlass ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold uppercase ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Total compartido</p>
                                    <p className={`text-sm font-mono font-bold ${isGlass ? 'text-white' : 'text-gray-900'}`}>{showMoney(grandTotal)}</p>
                                </div>
                                {totalAportes.map((ap, idx) => {
                                    const myTotal = Number.isFinite(ap?.aporte) ? ap.aporte : 0;
                                    const esYo = proporciones[idx]?.uid === currentUid;
                                    return (
                                        <div key={proporciones[idx]?.uid || idx} className={`text-center px-2 py-2 rounded-xl font-bold text-xs flex-shrink-0 ${
                                            esYo
                                                ? (isGlass ? 'bg-indigo-600/40 text-indigo-200' : 'bg-indigo-600 text-white')
                                                : (isGlass ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-700 border border-gray-200')
                                        }`} style={{ minWidth: '4rem', width: '6rem' }}>
                                            <p className="text-xs font-mono truncate">{showMoney(myTotal)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {!allHaveProportions && !loadingProps && (
                        <p className={`text-xs text-center py-2 ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                            Cargá los sueldos en Grupo Familiar para ver el reparto proporcional.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
