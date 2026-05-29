import React, { useState, useMemo, useRef, useEffect } from 'react';
import { auth } from '../../firebase';
import { 
    Leaf, Beef, Plus, Trash2, ChevronDown, ChevronUp, Users, Lock, 
    CheckCircle2, Circle, Calendar, LayoutList, Folder, Wrench, 
    Car, Gift, Home as HomeIcon, Plane, GraduationCap, Heart, Palette
} from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import {
    addFreshItem,
    deleteFreshItem,
    updateFreshTotal,
    toggleFreshCompleted,
} from '../../repositories/freshRepository';
import { addPlannerCategory, deletePlannerCategory } from '../../repositories/plannerCategoriesRepository';

// ────────────────────────────────────────────────────────────────
// Íconos y Colores disponibles para nuevas categorías
// ────────────────────────────────────────────────────────────────
const AVAILABLE_ICONS = {
    Folder, Wrench, Car, Gift, Home: HomeIcon, Plane, GraduationCap, Heart, Palette, LayoutList
};

const AVAILABLE_COLORS = {
    blue: {
        glassColors: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
        lightColors: 'bg-blue-50 border-blue-200 text-blue-700',
        headerGlass: 'from-blue-900/40 to-indigo-900/20 border-blue-500/20',
        headerLight: 'from-blue-50 to-indigo-50 border-blue-200',
        accentGlass: 'bg-blue-500/20 text-blue-300',
        accentLight: 'bg-blue-100 text-blue-700',
        btnGlass: 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/30',
        btnLight: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    },
    purple: {
        glassColors: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
        lightColors: 'bg-purple-50 border-purple-200 text-purple-700',
        headerGlass: 'from-purple-900/40 to-fuchsia-900/20 border-purple-500/20',
        headerLight: 'from-purple-50 to-fuchsia-50 border-purple-200',
        accentGlass: 'bg-purple-500/20 text-purple-300',
        accentLight: 'bg-purple-100 text-purple-700',
        btnGlass: 'bg-purple-500 hover:bg-purple-400 shadow-purple-500/30',
        btnLight: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
    },
    orange: {
        glassColors: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
        lightColors: 'bg-orange-50 border-orange-200 text-orange-700',
        headerGlass: 'from-orange-900/40 to-amber-900/20 border-orange-500/20',
        headerLight: 'from-orange-50 to-amber-50 border-orange-200',
        accentGlass: 'bg-orange-500/20 text-orange-300',
        accentLight: 'bg-orange-100 text-orange-700',
        btnGlass: 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/30',
        btnLight: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200',
    },
    pink: {
        glassColors: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
        lightColors: 'bg-pink-50 border-pink-200 text-pink-700',
        headerGlass: 'from-pink-900/40 to-rose-900/20 border-pink-500/20',
        headerLight: 'from-pink-50 to-rose-50 border-pink-200',
        accentGlass: 'bg-pink-500/20 text-pink-300',
        accentLight: 'bg-pink-100 text-pink-700',
        btnGlass: 'bg-pink-500 hover:bg-pink-400 shadow-pink-500/30',
        btnLight: 'bg-pink-600 hover:bg-pink-700 shadow-pink-200',
    },
    green: {
        glassColors: 'bg-green-500/10 border-green-500/20 text-green-300',
        lightColors: 'bg-green-50 border-green-200 text-green-700',
        headerGlass: 'from-green-900/40 to-emerald-900/20 border-green-500/20',
        headerLight: 'from-green-50 to-emerald-50 border-green-200',
        accentGlass: 'bg-green-500/20 text-green-300',
        accentLight: 'bg-green-100 text-green-700',
        btnGlass: 'bg-green-500 hover:bg-green-400 shadow-green-500/30',
        btnLight: 'bg-green-600 hover:bg-green-700 shadow-green-200',
    },
    red: {
        glassColors: 'bg-red-500/10 border-red-500/20 text-red-300',
        lightColors: 'bg-red-50 border-red-200 text-red-700',
        headerGlass: 'from-red-900/40 to-rose-900/20 border-red-500/20',
        headerLight: 'from-red-50 to-rose-50 border-red-200',
        accentGlass: 'bg-red-500/20 text-red-300',
        accentLight: 'bg-red-100 text-red-700',
        btnGlass: 'bg-red-500 hover:bg-red-400 shadow-red-500/30',
        btnLight: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    }
};

const DEFAULT_CATEGORIES = [
    {
        id: 'verduleria',
        label: 'Verdulería',
        iconName: 'Leaf',
        colorName: 'green',
        isDefault: true
    },
    {
        id: 'carniceria',
        label: 'Carnicería / Freezer',
        iconName: 'Beef',
        colorName: 'red',
        isDefault: true
    }
];

// ────────────────────────────────────────────────────────────────
// Subcomponente: Una sola "salida de compra" (trip/item)
// ────────────────────────────────────────────────────────────────
function TripCard({ trip, cfg, isGlass, onDelete, onUpdateTotal, onToggleCompleted }) {
    const [editing, setEditing] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const inputRef = useRef(null);

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
            isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'
        } ${trip.completed ? 'opacity-60' : ''}`}>
            
            <button 
                onClick={() => onToggleCompleted(trip.id, !trip.completed)}
                className={`p-1 transition-colors ${trip.completed ? 'text-emerald-500' : (isGlass ? 'text-white/20' : 'text-gray-300')}`}
            >
                {trip.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
            </button>

            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-center ${
                isGlass ? cfg.accentGlass : cfg.accentLight
            }`}>
                <span className="text-[10px] uppercase leading-none">{dateLabel.split(' ')[1]}</span>
                <span className="text-base leading-none">{dateLabel.split(' ')[0]}</span>
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isGlass ? 'text-white' : 'text-gray-800'} ${trip.completed ? 'line-through opacity-50' : ''}`}>
                    {trip.note || 'Sin nota'}
                </p>
                <p className={`text-[10px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                    {trip.completed ? 'Completado' : 'Pendiente'}
                </p>
            </div>

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
// Subcomponente: Sección de una categoría
// ────────────────────────────────────────────────────────────────
function PlannerSection({ catData, trips, currentMonthKey, isGlass, householdId }) {
    const cfg = AVAILABLE_COLORS[catData.colorName] || AVAILABLE_COLORS.blue;
    let Icon = AVAILABLE_ICONS[catData.iconName] || LayoutList;
    if (catData.isDefault) {
        Icon = catData.id === 'verduleria' ? Leaf : Beef;
    }

    const [isOpen, setIsOpen] = useState(catData.isDefault);
    const [addingNote, setAddingNote] = useState('');
    const [addingTotal, setAddingTotal] = useState('');
    const [addingDate, setAddingDate] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    });
    const [isShared, setIsShared] = useState(true);
    const [adding, setAdding] = useState(false);
    const noteRef = useRef(null);

    const monthTrips = useMemo(() => {
        return trips
            .filter(t => t.category === catData.id && t.month === currentMonthKey)
            .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    }, [trips, catData.id, currentMonthKey]);

    const budgetTrips = monthTrips.filter(t => !t.completed);
    const completedTrips = monthTrips.filter(t => t.completed);

    const totalReal = useMemo(() => completedTrips.reduce((acc, t) => acc + (t.total || 0), 0), [completedTrips]);
    const totalBudget = useMemo(() => monthTrips.reduce((acc, t) => acc + (t.total || 0), 0), [monthTrips]);
    
    const tripCount = monthTrips.length;

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        if (!addingNote.trim() && !addingTotal) return;

        setAdding(true);
        try {
            await addFreshItem({
                category: catData.id,
                note: addingNote.trim() || '',
                total: parseInputNumber(addingTotal) || 0,
                date: addingDate,
                month: currentMonthKey,
                completed: false,
                userId: auth.currentUser.uid,
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
        if (window.confirm('¿Borrar este ítem?')) {
            await deleteFreshItem(id);
        }
    };

    const handleDeleteCategory = async () => {
        if (window.confirm(`¿Seguro que querés eliminar la categoría "${catData.label}" y todos sus gastos internos?`)) {
            const itemsToDelete = trips.filter(t => t.category === catData.id);
            await Promise.all(itemsToDelete.map(item => deleteFreshItem(item.id)));
            await deletePlannerCategory(catData.id);
        }
    };

    return (
        <div className={`rounded-3xl border overflow-hidden ${
            isGlass
                ? `bg-gradient-to-b ${cfg.headerGlass} border-white/10`
                : `bg-gradient-to-b ${cfg.headerLight} border-gray-200 shadow-sm`
        }`}>
            <div className="w-full flex items-center justify-between p-4">
                <button onClick={() => setIsOpen(o => !o)} className="flex-1 flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-xl ${isGlass ? cfg.accentGlass : cfg.accentLight}`}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>{catData.label}</p>
                        <p className={`text-[10px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                            {tripCount === 0 ? 'Sin planes este mes' : `${budgetTrips.length} pendientes · ${completedTrips.length} listos`}
                        </p>
                    </div>
                </button>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className={`font-mono font-bold ${isGlass ? 'text-white' : 'text-gray-900'}`}>
                            {formatMoney(totalReal)}
                        </p>
                        <p className={`text-[9px] font-bold ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            Presup: {formatMoney(totalBudget)}
                        </p>
                    </div>
                    {!catData.isDefault && (
                        <button onClick={handleDeleteCategory} className={`p-1.5 rounded-lg ${isGlass ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}>
                            <Trash2 size={14} />
                        </button>
                    )}
                    <button onClick={() => setIsOpen(o => !o)}>
                        {isOpen
                            ? <ChevronUp size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                            : <ChevronDown size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                        }
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="px-4 pb-4 space-y-4">
                    {budgetTrips.length > 0 && (
                        <div className="space-y-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Pendiente / Presupuesto</p>
                            {budgetTrips.map(trip => (
                                <TripCard key={trip.id} trip={trip} cfg={cfg} isGlass={isGlass} onDelete={handleDelete} onUpdateTotal={updateFreshTotal} onToggleCompleted={toggleFreshCompleted} />
                            ))}
                        </div>
                    )}

                    {completedTrips.length > 0 && (
                        <div className="space-y-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Completado / Historial</p>
                            {completedTrips.map(trip => (
                                <TripCard key={trip.id} trip={trip} cfg={cfg} isGlass={isGlass} onDelete={handleDelete} onUpdateTotal={updateFreshTotal} onToggleCompleted={toggleFreshCompleted} />
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAdd} className={`rounded-2xl border p-3 space-y-2 ${
                        isGlass ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                    }`}>
                        <div className="flex justify-between items-center mb-1">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                                + Nuevo Ítem
                            </p>
                            <div className="flex items-center gap-1">
                                <Calendar size={12} className="text-gray-400" />
                                <input 
                                    type="date" 
                                    className={`bg-transparent text-[10px] font-bold outline-none border-none ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}
                                    value={addingDate}
                                    onChange={e => setAddingDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <input
                                ref={noteRef}
                                type="text"
                                className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                                    isGlass
                                        ? 'bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-white/30'
                                        : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-gray-400'
                                }`}
                                placeholder="Qué agregar? (ej: Comprar pintura)"
                                value={addingNote}
                                onChange={e => setAddingNote(e.target.value)}
                            />
                            <div className={`flex items-center rounded-xl px-3 border w-full ${
                                isGlass ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'
                            }`}>
                                <span className={`text-xs mr-2 font-bold ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>Presupuesto: $</span>
                                <input
                                    type="tel"
                                    className={`w-full bg-transparent outline-none text-sm font-bold text-right py-2.5 ${
                                        isGlass ? 'text-white placeholder-white/30' : 'text-gray-800'
                                    }`}
                                    placeholder="0"
                                    value={formatInputNumber(addingTotal)}
                                    onChange={e => setAddingTotal(String(parseInputNumber(e.target.value)))}
                                />
                            </div>
                        </div>

                        {householdId && (
                            <button
                                type="button"
                                onClick={() => setIsShared(s => !s)}
                                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-colors ${
                                    isShared
                                        ? (isGlass ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                                        : (isGlass ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500')
                                }`}
                            >
                                <span className="flex items-center gap-2 text-[10px] font-bold">
                                    {isShared ? <Users size={12} /> : <Lock size={12} />}
                                    {isShared ? 'Compartir' : 'Privado'}
                                </span>
                                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${isShared ? 'bg-indigo-500' : (isGlass ? 'bg-white/20' : 'bg-gray-300')}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${isShared ? 'translate-x-3' : 'translate-x-0'}`} />
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
                            {adding ? 'Agregando...' : 'Agregar al Planificador'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────
// Componente principal: Planificador
// ────────────────────────────────────────────────────────────────
export default function PlannerDashboard({ items = [], plannerCategories = [], currentDate, isGlass, householdId }) {
    const [showNewCatForm, setShowNewCatForm] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('Folder');
    const [newCatColor, setNewCatColor] = useState('blue');
    const [isSavingCat, setIsSavingCat] = useState(false);

    const allCategories = useMemo(() => {
        return [...DEFAULT_CATEGORIES, ...plannerCategories];
    }, [plannerCategories]);

    const activeItems = useMemo(() => {
        const catIds = new Set(allCategories.map(c => c.id));
        return items.filter(t => catIds.has(t.category));
    }, [items, allCategories]);

    // Limpieza automática de ítems huérfanos en la base de datos (de categorías eliminadas previamente)
    useEffect(() => {
        const catIds = new Set(allCategories.map(c => c.id));
        const orphaned = items.filter(t => !catIds.has(t.category));
        if (orphaned.length > 0) {
            orphaned.forEach(item => {
                deleteFreshItem(item.id).catch(err => console.error("Error al limpiar ítem huérfano:", err));
            });
        }
    }, [items, allCategories]);

    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const totals = useMemo(() => {
        const monthItems = activeItems.filter(t => t.month === currentMonthKey);
        const spent = monthItems.filter(t => t.completed).reduce((acc, t) => acc + (t.total || 0), 0);
        const budget = monthItems.reduce((acc, t) => acc + (t.total || 0), 0);
        return { spent, budget };
    }, [activeItems, currentMonthKey]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!auth.currentUser || !newCatLabel.trim()) return;
        setIsSavingCat(true);
        try {
            await addPlannerCategory({
                label: newCatLabel.trim(),
                iconName: newCatIcon,
                colorName: newCatColor,
                userId: auth.currentUser.uid,
                ...(householdId && { householdId })
            });
            setShowNewCatForm(false);
            setNewCatLabel('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingCat(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-4 pb-32">
            <div className={`sticky top-[57px] z-30 pt-2 pb-3 mb-2 transition-all shadow-sm -mx-4 px-6 border-b ${
                isGlass ? 'bg-[#0f0c29]/95 border-white/10 text-white backdrop-blur-md' : 'bg-[#f3f4f6]/95 border-gray-200/50 text-gray-800 backdrop-blur-sm'
            }`}>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2">
                            <LayoutList size={20} className={isGlass ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Planificador</h2>
                        </div>
                        <p className={`text-xs font-bold uppercase mt-1 ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            {currentDate.toLocaleString('es-AR', { month: 'long' })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className={`text-[10px] uppercase font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Real / Presupuesto</p>
                        <p className={`text-2xl font-bold font-mono ${isGlass ? 'text-white' : 'text-gray-900'}`}>
                            {formatMoney(totals.spent)} <span className="text-xs opacity-40">/ {formatMoney(totals.budget)}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Listado de categorías */}
            {allCategories.map(cat => (
                <PlannerSection
                    key={cat.id}
                    catData={cat}
                    trips={activeItems}
                    currentMonthKey={currentMonthKey}
                    isGlass={isGlass}
                    householdId={householdId}
                />
            ))}

            {/* Botón / Formulario de Nueva Categoría */}
            {!showNewCatForm ? (
                <button
                    onClick={() => setShowNewCatForm(true)}
                    className={`w-full py-4 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 font-bold transition-all ${
                        isGlass ? 'border-white/20 text-white/60 hover:text-white hover:bg-white/5' : 'border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                    <Plus size={20} />
                    Crear Nueva Categoría
                </button>
            ) : (
                <form onSubmit={handleCreateCategory} className={`rounded-3xl border p-4 space-y-4 ${
                    isGlass ? 'bg-black/30 border-white/20' : 'bg-white border-gray-200 shadow-md'
                }`}>
                    <div className="flex justify-between items-center">
                        <h3 className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Nueva Categoría</h3>
                        <button type="button" onClick={() => setShowNewCatForm(false)} className={isGlass ? 'text-white/50' : 'text-gray-400'}>✕</button>
                    </div>
                    
                    <input
                        type="text"
                        placeholder="Nombre (ej. Proyecto Pintura)"
                        className={`w-full px-4 py-3 rounded-xl font-bold focus:outline-none ${
                            isGlass ? 'bg-white/10 text-white placeholder-white/30' : 'bg-gray-50 text-gray-800 border'
                        }`}
                        value={newCatLabel}
                        onChange={e => setNewCatLabel(e.target.value)}
                        required
                    />

                    <div>
                        <p className={`text-xs font-bold mb-2 uppercase ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Icono</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(AVAILABLE_ICONS).map(iconKey => {
                                const IconComp = AVAILABLE_ICONS[iconKey];
                                return (
                                    <button
                                        key={iconKey}
                                        type="button"
                                        onClick={() => setNewCatIcon(iconKey)}
                                        className={`p-2.5 rounded-xl transition-all ${
                                            newCatIcon === iconKey 
                                                ? (isGlass ? 'bg-indigo-500 text-white shadow-lg' : 'bg-indigo-600 text-white shadow-md')
                                                : (isGlass ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
                                        }`}
                                    >
                                        <IconComp size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <p className={`text-xs font-bold mb-2 uppercase ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Color</p>
                        <div className="flex flex-wrap gap-3">
                            {Object.keys(AVAILABLE_COLORS).map(colorKey => {
                                const selected = newCatColor === colorKey;
                                return (
                                    <button
                                        key={colorKey}
                                        type="button"
                                        onClick={() => setNewCatColor(colorKey)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                                            selected ? 'scale-110 border-white shadow-lg' : 'border-transparent scale-90 opacity-70'
                                        }`}
                                        style={{ backgroundColor: colorKey }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingCat}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 ${
                            isGlass ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        {isSavingCat ? 'Guardando...' : 'Crear Categoría'}
                    </button>
                </form>
            )}
        </div>
    );
}
