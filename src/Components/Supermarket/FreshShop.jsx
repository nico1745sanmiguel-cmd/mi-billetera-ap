import React, { useState, useMemo, useEffect } from 'react';
import { auth } from '../../firebase';
import { Plus, LayoutList } from 'lucide-react';
import { formatMoney } from '../../utils';
import { deleteFreshItem } from '../../repositories/freshRepository';
import { addPlannerCategory } from '../../repositories/plannerCategoriesRepository';
import { useSupermarket } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { AVAILABLE_ICONS, AVAILABLE_COLORS, DEFAULT_CATEGORIES } from './constants';
import PlannerSection from './PlannerSection';

export default function FreshShop() {
    const { isGlass, currentDate } = useUI();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { freshItems: items, plannerCategories } = useSupermarket();
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
        <>
            <div className={`fixed top-[64px] left-0 right-0 z-40 pt-4 pb-4 transition-all shadow-sm px-6 border-b ${
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

            <div className="animate-fade-in space-y-4 pb-32">
                {/* ESPACIADOR */}
                <div className="h-[95px]"></div>

            {allCategories.map(cat => (
                <PlannerSection key={cat.id} catData={cat} trips={activeItems} currentMonthKey={currentMonthKey} isGlass={isGlass} householdId={householdId} />
            ))}

            {!showNewCatForm ? (
                <button
                    onClick={() => setShowNewCatForm(true)}
                    className={`w-full py-4 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 font-bold transition-all ${
                        isGlass ? 'border-white/20 text-white/60 hover:text-white hover:bg-white/5' : 'border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                    <Plus size={20} /> Crear Nueva Categoría
                </button>
            ) : (
                <form onSubmit={handleCreateCategory} className={`rounded-3xl border p-4 space-y-4 ${isGlass ? 'bg-black/30 border-white/20' : 'bg-white border-gray-200 shadow-md'}`}>
                    <div className="flex justify-between items-center">
                        <h3 className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Nueva Categoría</h3>
                        <button type="button" onClick={() => setShowNewCatForm(false)} className={isGlass ? 'text-white/50' : 'text-gray-400'}>✕</button>
                    </div>
                    
                    <input
                        type="text"
                        placeholder="Nombre (ej. Proyecto Pintura)"
                        className={`w-full px-4 py-3 rounded-xl font-bold focus:outline-none ${isGlass ? 'bg-white/10 text-white placeholder-white/30' : 'bg-gray-50 text-gray-800 border'}`}
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
                            {Object.keys(AVAILABLE_COLORS).map(colorKey => (
                                <button
                                    key={colorKey}
                                    type="button"
                                    onClick={() => setNewCatColor(colorKey)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${newCatColor === colorKey ? 'scale-110 border-white shadow-lg' : 'border-transparent scale-90 opacity-70'}`}
                                    style={{ backgroundColor: colorKey }}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingCat}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 ${isGlass ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {isSavingCat ? 'Guardando...' : 'Crear Categoría'}
                    </button>
                </form>
            )}
            </div>
        </>
    );
}
