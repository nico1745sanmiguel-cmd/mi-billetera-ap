import React, { useState, useMemo, useRef } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Leaf, Beef, Plus, Trash2, ChevronDown, ChevronUp, Users, Lock, ShoppingBag } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';

// ────────────────────────────────────────────────────────────────
// Categorías disponibles
// ────────────────────────────────────────────────────────────────
export const FRESH_CATEGORIES = {
    verduleria: {
        id: 'verduleria',
        label: 'Verdulería',
        icon: Leaf,
        color: 'green',
        glassColors: 'bg-green-500/10 border-green-500/20 text-green-300',
        lightColors: 'bg-green-50 border-green-200 text-green-700',
        headerGlass: 'from-green-900/40 to-emerald-900/20 border-green-500/20',
        headerLight: 'from-green-50 to-emerald-50 border-green-200',
        accentGlass: 'bg-green-500/20 text-green-300',
        accentLight: 'bg-green-100 text-green-700',
        btnGlass: 'bg-green-500 hover:bg-green-400 shadow-green-500/30',
        btnLight: 'bg-green-600 hover:bg-green-700 shadow-green-200',
        barColor: 'bg-green-500',
        tagGlass: 'bg-green-500/15 text-green-300 border-green-500/20',
        tagLight: 'bg-green-100 text-green-700 border-green-200',
    },
    carniceria: {
        id: 'carniceria',
        label: 'Carnicería / Freezer',
        icon: Beef,
        color: 'red',
        glassColors: 'bg-red-500/10 border-red-500/20 text-red-300',
        lightColors: 'bg-red-50 border-red-200 text-red-700',
        headerGlass: 'from-red-900/40 to-rose-900/20 border-red-500/20',
        headerLight: 'from-red-50 to-rose-50 border-red-200',
        accentGlass: 'bg-red-500/20 text-red-300',
        accentLight: 'bg-red-100 text-red-700',
        btnGlass: 'bg-red-500 hover:bg-red-400 shadow-red-500/30',
        btnLight: 'bg-red-600 hover:bg-red-700 shadow-red-200',
        barColor: 'bg-red-500',
        tagGlass: 'bg-red-500/15 text-red-300 border-red-500/20',
        tagLight: 'bg-red-100 text-red-700 border-red-200',
    }
};

// ────────────────────────────────────────────────────────────────
// Subcomponente: Una sola "salida de compra" (trip)
// ────────────────────────────────────────────────────────────────
function TripCard({ trip, cat, isGlass, onDelete, onUpdateTotal }) {
    const [editing, setEditing] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const inputRef = useRef(null);
    const cfg = FRESH_CATEGORIES[cat];

    const startEdit = () => {
        setInputVal(trip.total > 0 ? String(trip.total) : '');
        setEditing(true);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    const commitEdit = async () => {
        const parsed = parseInputNumber(inputVal);
        await onUpdateTotal(trip.id, parsed);
        setEditing(false);
    };

    const dateLabel = trip.date
        ? new Date(trip.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        : '—';

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:border-gray-200'
        }`}>
            {/* Fecha */}
            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-center ${
                isGlass ? cfg.accentGlass : cfg.accentLight
            }`}>
                <span className="text-[10px] uppercase leading-none">{dateLabel.split(' ')[1]}</span>
                <span className="text-base leading-none">{dateLabel.split(' ')[0]}</span>
            </div>

            {/* Nota */}
            <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                    {trip.note || 'Sin nota'}
                </p>
            </div>

            {/* Monto (editable al tap) */}
            {editing ? (
                <div className="flex items-center gap-2">
                    <div className={`flex items-center rounded-xl px-3 border h-9 w-32 ${
                        isGlass ? 'bg-black/40 border-white/20' : 'bg-white border-gray-300'
                    }`}>
                        <span className={`text-sm mr-1 ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>$</span>
                        <input
                            ref={inputRef}
                            type="tel"
                            className={`w-full bg-transparent outline-none text-sm font-bold text-right ${
                                isGlass ? 'text-white' : 'text-gray-800'
                            }`}
                            value={formatInputNumber(inputVal)}
                            onChange={e => setInputVal(String(parseInputNumber(e.target.value)))}
                            onBlur={commitEdit}
                            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                            enterKeyHint="done"
                        />
                    </div>
                </div>
            ) : (
                <button
                    onClick={startEdit}
                    className={`font-mono font-bold text-sm min-w-[80px] text-right px-2 py-1 rounded-xl transition-colors ${
                        trip.total > 0
                            ? (isGlass ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-50')
                            : (isGlass ? 'text-gray-500 hover:bg-white/10 border border-dashed border-white/20' : 'text-gray-300 hover:bg-gray-50 border border-dashed border-gray-200')
                    }`}
                >
                    {trip.total > 0 ? formatMoney(trip.total) : '+ precio'}
                </button>
            )}

            {/* Borrar */}
            <button
                onClick={() => onDelete(trip.id)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    isGlass ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                }`}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────
// Subcomponente: Sección de una categoría (verde o roja)
// ────────────────────────────────────────────────────────────────
function FreshSection({ cat, trips, currentMonthKey, isGlass, householdId }) {
    const cfg = FRESH_CATEGORIES[cat];
    const Icon = cfg.icon;

    const [isOpen, setIsOpen] = useState(true);
    const [addingNote, setAddingNote] = useState('');
    const [addingTotal, setAddingTotal] = useState('');
    const [isShared, setIsShared] = useState(true);
    const [adding, setAdding] = useState(false);
    const noteRef = useRef(null);

    // Filtrar solo los de este mes y categoría
    const monthTrips = useMemo(() => {
        return trips
            .filter(t => t.category === cat && t.month === currentMonthKey)
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [trips, cat, currentMonthKey]);

    const totalMes = useMemo(() => monthTrips.reduce((acc, t) => acc + (t.total || 0), 0), [monthTrips]);
    const tripCount = monthTrips.length;

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setAdding(true);
        try {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            await addDoc(collection(db, 'fresh_purchases'), {
                category: cat,
                note: addingNote.trim() || '',
                total: parseInputNumber(addingTotal) || 0,
                date: dateStr,
                month: currentMonthKey,
                userId: auth.currentUser.uid,
                createdAt: new Date().toISOString(),
                ...(householdId && {
                    householdId,
                    ownerId: auth.currentUser.uid,
                    isShared,
                })
            });
            setAddingNote('');
            setAddingTotal('');
            setTimeout(() => noteRef.current?.focus(), 100);
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Borrar esta compra?')) {
            await deleteDoc(doc(db, 'fresh_purchases', id));
        }
    };

    const handleUpdateTotal = async (id, newTotal) => {
        await updateDoc(doc(db, 'fresh_purchases', id), { total: newTotal });
    };

    return (
        <div className={`rounded-3xl border overflow-hidden ${
            isGlass
                ? `bg-gradient-to-b ${cfg.headerGlass} border-white/10`
                : `bg-gradient-to-b ${cfg.headerLight} border-gray-200 shadow-sm`
        }`}>
            {/* Header de la sección */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isGlass ? cfg.accentGlass : cfg.accentLight}`}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>{cfg.label}</p>
                        <p className={`text-[10px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                            {tripCount === 0 ? 'Sin compras este mes' : `${tripCount} compra${tripCount > 1 ? 's' : ''} este mes`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className={`font-mono font-bold ${isGlass ? 'text-white' : 'text-gray-900'} ${totalMes === 0 ? 'opacity-30' : ''}`}>
                            {formatMoney(totalMes)}
                        </p>
                        {householdId && tripCount > 0 && (
                            <p className={`text-[9px] font-bold ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                                {monthTrips.some(t => t.isShared) ? 'Compartido' : 'Solo tuyo'}
                            </p>
                        )}
                    </div>
                    {isOpen
                        ? <ChevronUp size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                        : <ChevronDown size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                    }
                </div>
            </button>

            {/* Cuerpo desplegable */}
            {isOpen && (
                <div className="px-4 pb-4 space-y-3">

                    {/* Lista de compras del mes */}
                    {monthTrips.length > 0 && (
                        <div className="space-y-2">
                            {monthTrips.map(trip => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    cat={cat}
                                    isGlass={isGlass}
                                    onDelete={handleDelete}
                                    onUpdateTotal={handleUpdateTotal}
                                />
                            ))}
                        </div>
                    )}

                    {/* Separador con total acumulado si hay más de 1 compra */}
                    {monthTrips.length > 1 && (
                        <div className={`flex justify-between items-center px-3 py-2 rounded-2xl ${
                            isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100'
                        }`}>
                            <span className={`text-xs font-bold ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                                Total acumulado
                            </span>
                            <span className={`font-mono font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-900'}`}>
                                {formatMoney(totalMes)}
                            </span>
                        </div>
                    )}

                    {/* Formulario: nueva compra */}
                    <form onSubmit={handleAdd} className={`rounded-2xl border p-3 space-y-2 ${
                        isGlass ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                    }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                            + Registrar compra
                        </p>

                        <div className="flex gap-2">
                            {/* Nota (opcional) */}
                            <input
                                ref={noteRef}
                                type="text"
                                className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                                    isGlass
                                        ? 'bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-white/30'
                                        : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-gray-400'
                                }`}
                                placeholder="Nota opcional..."
                                value={addingNote}
                                onChange={e => setAddingNote(e.target.value)}
                            />
                            {/* Precio */}
                            <div className={`flex items-center rounded-xl px-3 border w-32 flex-shrink-0 ${
                                isGlass ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'
                            }`}>
                                <span className={`text-xs mr-1 ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                                <input
                                    type="tel"
                                    className={`w-full bg-transparent outline-none text-sm font-bold text-right py-2 ${
                                        isGlass ? 'text-white placeholder-white/30' : 'text-gray-800'
                                    }`}
                                    placeholder="0"
                                    value={formatInputNumber(addingTotal)}
                                    onChange={e => setAddingTotal(String(parseInputNumber(e.target.value)))}
                                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.form?.requestSubmit()}
                                />
                            </div>
                        </div>

                        {/* Toggle compartir (solo si hay hogar) */}
                        {householdId && (
                            <button
                                type="button"
                                onClick={() => setIsShared(s => !s)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                    isShared
                                        ? (isGlass ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                                        : (isGlass ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500')
                                }`}
                            >
                                <span className="flex items-center gap-2 text-xs font-bold">
                                    {isShared ? <Users size={14} /> : <Lock size={14} />}
                                    {isShared ? 'Gasto del hogar compartido' : 'Solo mi gasto'}
                                </span>
                                <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${isShared ? 'bg-indigo-500' : (isGlass ? 'bg-white/20' : 'bg-gray-300')}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isShared ? 'translate-x-3' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={adding}
                            className={`w-full py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                                isGlass ? cfg.btnGlass : cfg.btnLight
                            } shadow-sm`}
                        >
                            <Plus size={16} />
                            {adding ? 'Guardando...' : 'Agregar compra'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────
export default function FreshShop({ items = [], currentDate, isGlass, householdId }) {

    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const totalMes = useMemo(() => {
        return items
            .filter(t => t.month === currentMonthKey)
            .reduce((acc, t) => acc + (t.total || 0), 0);
    }, [items, currentMonthKey]);

    return (
        <div className="animate-fade-in space-y-4 pb-32">

            {/* Header */}
            <div className={`sticky top-0 z-30 pt-2 pb-3 mb-2 transition-all shadow-sm -mx-4 px-6 border-b ${
                isGlass ? 'bg-[#0f0c29]/95 border-white/10 text-white backdrop-blur-md' : 'bg-[#f3f4f6]/95 border-gray-200/50 text-gray-800 backdrop-blur-sm'
            }`}>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShoppingBag size={20} className={isGlass ? 'text-green-400' : 'text-green-600'} />
                            <h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Mercado Fresco</h2>
                        </div>
                        <p className={`text-xs font-bold uppercase mt-1 ${isGlass ? 'text-green-300' : 'text-green-600'}`}>
                            {currentDate.toLocaleString('es-AR', { month: 'long' })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className={`text-[10px] uppercase font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Total del mes</p>
                        <p className={`text-2xl font-bold font-mono ${totalMes > 0 ? (isGlass ? 'text-white' : 'text-gray-900') : (isGlass ? 'text-white/30' : 'text-gray-300')}`}>
                            {formatMoney(totalMes)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sección verdulería */}
            <FreshSection
                cat="verduleria"
                trips={items}
                currentMonthKey={currentMonthKey}
                isGlass={isGlass}
                householdId={householdId}
            />

            {/* Sección carnicería/freezer */}
            <FreshSection
                cat="carniceria"
                trips={items}
                currentMonthKey={currentMonthKey}
                isGlass={isGlass}
                householdId={householdId}
            />
        </div>
    );
}
