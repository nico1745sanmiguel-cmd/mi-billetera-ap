import React, { useState, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Users, Lock, Calendar, Plus, Trash2, LayoutList, Leaf, Beef } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { addFreshItem, deleteFreshItem, updateFreshTotal, toggleFreshCompleted } from '../../repositories/freshRepository';
import { deletePlannerCategory } from '../../repositories/plannerCategoriesRepository';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from './constants';
import TripCard from './TripCard';

const handleDelete = async (id) => {
    if (window.confirm('¿Borrar este ítem?')) {
        await deleteFreshItem(id);
    }
};

export default function PlannerSection({ catData, trips, currentMonthKey, isGlass, householdId }) {
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
        const { currentUser } = require('../../firebase').auth;
        if (!currentUser) return;
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
                userId: currentUser.uid,
                ...(householdId && {
                    householdId,
                    ownerId: currentUser.uid,
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
                <button type="button" onClick={() => setIsOpen(o => !o)} className="flex-1 flex items-center gap-3 text-left">
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
                        <button type="button" onClick={handleDeleteCategory} className={`p-1.5 rounded-lg ${isGlass ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}>
                            <Trash2 size={14} />
                        </button>
                    )}
                    <button type="button" onClick={() => setIsOpen(o => !o)}>
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
