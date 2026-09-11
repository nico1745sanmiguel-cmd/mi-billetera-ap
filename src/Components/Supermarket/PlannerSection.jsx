import React, { useState, useMemo, useRef, useEffect, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronUp, Users, Lock, Calendar, Plus, Trash2, LayoutList, Leaf, Beef } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { addFreshItem, deleteFreshItem, updateFreshTotal, toggleFreshCompleted, batchDeleteFreshItems } from '../../repositories/freshRepository';
import { deletePlannerCategory } from '../../repositories/plannerCategoriesRepository';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from './constants';
import { auth } from '../../firebase';
import ConfirmDialog from '../UI/ConfirmDialog';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TripCard from './TripCard';
import { useUIDispatch } from '../../context/UIContext';
import { getPlannerSettings, subscribeToPlannerSettings } from '../../utils/plannerUtils';
export default function PlannerSection({ catData, trips, currentMonthKey, isGlass, householdId }) {
    const cfg = AVAILABLE_COLORS[catData.colorName] || AVAILABLE_COLORS.blue;
    let Icon = AVAILABLE_ICONS[catData.iconName] || LayoutList;
    if (catData.isDefault) {
        Icon = catData.id === 'verduleria' ? Leaf : Beef;
    }

    const { showToast } = useUIDispatch();
    const settings = useSyncExternalStore(subscribeToPlannerSettings, getPlannerSettings);

    const getInitialOpenState = () => {
        if (settings.initialState === 'expanded') return true;
        if (settings.initialState === 'collapsed') return false;
        return catData.isDefault;
    };

    const [isOpen, setIsOpen] = useState(getInitialOpenState);
    const [prevCatId, setPrevCatId] = useState(catData.id);
    if (catData.id !== prevCatId) {
        setPrevCatId(catData.id);
        setIsOpen(getInitialOpenState());
    }
    const [addingNote, setAddingNote] = useState('');
    const [addingTotal, setAddingTotal] = useState('');
    const [addingDate, setAddingDate] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    });
    const [isShared, setIsShared] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (!currentMonthKey) return;
        const [y, m] = currentMonthKey.split('-');
        const today = new Date();
        const thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        if (currentMonthKey === thisMonthKey) {
            setAddingDate(`${thisMonthKey}-${String(today.getDate()).padStart(2, '0')}`);
        } else {
            setAddingDate(`${y}-${m}-01`);
        }
    }, [currentMonthKey]);
    
    // States for ConfirmDialog
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteCatOpen, setIsDeleteCatOpen] = useState(false);

    const noteRef = useRef(null);

    const monthTrips = useMemo(() => {
        return trips
            .filter(t => t.category === catData.id && t.month === currentMonthKey)
            .sort((a, b) => {
                if (settings.sortBy === 'price_desc') {
                    return (b.total || 0) - (a.total || 0);
                }
                if (settings.sortBy === 'alpha') {
                    return (a.note || '').localeCompare(b.note || '');
                }
                return new Date(a.date || 0) - new Date(b.date || 0);
            });
    }, [trips, catData.id, currentMonthKey, settings.sortBy]);

    const budgetTrips = monthTrips.filter(t => !t.completed);
    const completedTrips = monthTrips.filter(t => t.completed);

    const totalReal = useMemo(() => completedTrips.reduce((acc, t) => acc + (Number(t.total) || 0), 0), [completedTrips]);
    const totalBudget = useMemo(() => monthTrips.reduce((acc, t) => acc + (Number(t.total) || 0), 0), [monthTrips]);
    const isOverBudget = settings.budgetAlert > 0 && totalBudget > settings.budgetAlert;
    
    const tripCount = monthTrips.length;

    const handleAdd = async (e) => {
        e.preventDefault();
        const { currentUser } = auth;
        if (!currentUser) return;

        const cleanNote = addingNote.trim();
        const cleanTotal = parseInputNumber(addingTotal);

        if (!cleanNote) {
            showToast('Por favor, ingresá una descripción para el gasto', 'warning');
            noteRef.current?.focus();
            return;
        }

        if (cleanTotal <= 0) {
            showToast('El monto presupuestado debe ser mayor a 0', 'warning');
            return;
        }

        if (!addingDate || isNaN(new Date(addingDate + 'T12:00:00').getTime())) {
            showToast('Por favor, seleccioná una fecha válida', 'warning');
            return;
        }

        setAdding(true);
        try {
            const finalMonth = addingDate.slice(0, 7) || currentMonthKey;
            await addFreshItem({
                category: catData.id,
                note: cleanNote,
                total: cleanTotal,
                date: addingDate,
                month: finalMonth,
                completed: false,
                userId: currentUser.uid,
                ...(householdId && {
                    householdId,
                    ownerId: currentUser.uid,
                    isShared,
                })
            });
            showToast('Gasto registrado exitosamente', 'success');
            setAddingNote('');
            setAddingTotal('');
            setTimeout(() => noteRef.current?.focus(), 100);
        } catch (err) {
            console.error(err);
            showToast('Error al agregar el gasto', 'error');
        } finally {
            setAdding(false);
        }
    };


    const handleDeleteCategoryRequest = () => {
        setIsDeleteCatOpen(true);
    };

    const confirmDeleteCategory = async () => {
        try {
            const itemsToDelete = trips.filter(t => t.category === catData.id);
            if (itemsToDelete.length > 0) {
                await batchDeleteFreshItems(itemsToDelete.map(item => item.id));
            }
            await deletePlannerCategory(catData.id);
            showToast('Categoría eliminada', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error al eliminar categoría', 'error');
        } finally {
            setIsDeleteCatOpen(false);
        }
    };

    const confirmDeleteItem = async () => {
        if (itemToDelete) {
            try {
                await deleteFreshItem(itemToDelete);
                showToast('Gasto eliminado', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error al eliminar gasto', 'error');
            } finally {
                setItemToDelete(null);
            }
        }
    };

    return (
        <div className={`rounded-3xl border overflow-hidden ${
            isOverBudget
                ? (isGlass ? 'bg-red-500/10 border-red-500/50' : 'bg-red-50 border-red-200 shadow-sm')
                : (isGlass
                    ? `bg-gradient-to-b ${cfg.headerGlass} border-white/10`
                    : `bg-gradient-to-b ${cfg.headerLight} border-gray-200 shadow-sm`)
        }`}>
            <div className="w-full flex items-center justify-between p-4">
                <button
                    aria-label={`Categoría ${catData.label}: ${tripCount === 0 ? 'Sin planes este mes' : `${budgetTrips.length} pendientes, ${completedTrips.length} listos`}. Tocar para ${isOpen ? 'colapsar' : 'expandir'}`}
                    type="button"
                    onClick={() => setIsOpen(o => !o)}
                    className="flex-1 flex items-center gap-3 text-left min-h-[44px]"
                >
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
                <div className="flex items-center gap-1">
                    <div className="text-right mr-2">
                        <p className={`font-mono font-bold ${isGlass ? 'text-white' : 'text-gray-900'}`}>
                            {formatMoney(totalReal)}
                        </p>
                        <p className={`text-[9px] font-bold ${isOverBudget ? (isGlass ? 'text-red-400' : 'text-red-500') : (isGlass ? 'text-white/40' : 'text-gray-400')}`}>
                            Presup: {formatMoney(totalBudget)}
                        </p>
                    </div>
                    {!catData.isDefault && (
                        <button
                            aria-label={`Eliminar categoría ${catData.label}`}
                            type="button"
                            onClick={handleDeleteCategoryRequest}
                            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                                isGlass ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                            }`}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button
                        aria-label={isOpen ? `Colapsar categoría ${catData.label}` : `Expandir categoría ${catData.label}`}
                        type="button"
                        onClick={() => setIsOpen(o => !o)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
                    >
                        {isOpen
                            ? <ChevronUp size={18} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                            : <ChevronDown size={18} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
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
                                <TripCard key={trip.id} trip={trip} cfg={cfg} isGlass={isGlass} onDelete={setItemToDelete} onUpdateTotal={updateFreshTotal} onToggleCompleted={toggleFreshCompleted} compactView={settings.compactView} />
                            ))}
                        </div>
                    )}

                    {!settings.hideCompleted && completedTrips.length > 0 && (
                        <div className="space-y-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>Completado / Historial</p>
                            {completedTrips.map(trip => (
                                <TripCard key={trip.id} trip={trip} cfg={cfg} isGlass={isGlass} onDelete={setItemToDelete} onUpdateTotal={updateFreshTotal} onToggleCompleted={toggleFreshCompleted} compactView={settings.compactView} />
                            ))}
                        </div>
                    )}

                    {/* Empty State amigable si no hay movimientos pendientes ni completados visibles */}
                    {budgetTrips.length === 0 && (settings.hideCompleted || completedTrips.length === 0) && (
                        <div className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl border text-center transition-all ${
                            isGlass ? 'bg-white/[0.02] border-white/5 text-white/50' : 'bg-gray-50/70 border-gray-100 text-gray-400'
                        }`}>
                            <Calendar size={22} className="mb-1.5 opacity-40 text-current" />
                            <p className="text-xs font-semibold">Sin movimientos aún este mes.</p>
                            <p className="text-[11px] opacity-70 mt-0.5">Agregá un gasto estimado abajo para comenzar.</p>
                        </div>
                    )}

                    <form onSubmit={handleAdd} className={`rounded-2xl border p-3 space-y-3 ${
                        isGlass ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                    }`}>
                        <div className="flex justify-between items-center mb-1">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                                + Nuevo Ítem
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                                <input
                                    autoComplete="off"
                                    id={`plan-date-${catData.id}`}
                                    aria-label="Fecha del plan"
                                    type="date" 
                                    className={`min-h-[36px] bg-transparent text-[11px] font-bold outline-none border rounded-lg px-2 py-1 transition-colors ${
                                        isGlass ? 'border-white/10 text-indigo-300 focus:border-indigo-400/50' : 'border-gray-200 text-indigo-600 focus:border-indigo-400'
                                    }`}
                                    value={addingDate}
                                    onChange={e => setAddingDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Input
                                ref={noteRef}
                                id={`plan-note-${catData.id}`}
                                aria-label="Descripción del gasto"
                                type="text"
                                placeholder="¿Qué agregar? (ej: Comprar pintura)"
                                value={addingNote}
                                onChange={e => setAddingNote(e.target.value)}
                                className={isGlass ? '!bg-black/30 !border-white/10 !text-white placeholder:!text-white/30' : ''}
                            />
                            <Input
                                id={`plan-total-${catData.id}`}
                                aria-label="Monto del presupuesto"
                                type="tel"
                                placeholder="Presupuesto ($ 0)"
                                value={addingTotal ? formatInputNumber(addingTotal) : ''}
                                onChange={e => setAddingTotal(String(parseInputNumber(e.target.value)))}
                                className={isGlass ? '!bg-black/30 !border-white/10 !text-white placeholder:!text-white/30' : ''}
                            />
                        </div>

                        {householdId && (
                            <button
                                aria-label={isShared ? "Gasto compartido. Tocar para hacer privado" : "Gasto privado. Tocar para compartir"}
                                type="button"
                                onClick={() => setIsShared(s => !s)}
                                className={`w-full min-h-[44px] flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                    isShared
                                        ? (isGlass ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                                        : (isGlass ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500')
                                }`}
                            >
                                <span className="flex items-center gap-2 text-xs font-bold">
                                    {isShared ? <Users size={14} /> : <Lock size={14} />}
                                    {isShared ? 'Compartir en el hogar' : 'Gasto privado'}
                                </span>
                                <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${isShared ? 'bg-indigo-500' : (isGlass ? 'bg-white/20' : 'bg-gray-300')}`}>
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${isShared ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={adding}
                            className="w-full"
                        >
                            Agregar al Planificador
                        </Button>
                    </form>
                </div>
            )}
            
            <ConfirmDialog
                isOpen={isDeleteCatOpen}
                title="¿Eliminar categoría?"
                message={`¿Seguro que querés eliminar la categoría "${catData.label}" y todos sus gastos internos?`}
                confirmText="Eliminar"
                isDanger={true}
                onConfirm={confirmDeleteCategory}
                onCancel={() => setIsDeleteCatOpen(false)}
            />

            <ConfirmDialog
                isOpen={!!itemToDelete}
                title="¿Borrar ítem?"
                message="Esta acción no se puede deshacer."
                confirmText="Borrar"
                isDanger={true}
                onConfirm={confirmDeleteItem}
                onCancel={() => setItemToDelete(null)}
            />
        </div>
    );
}
