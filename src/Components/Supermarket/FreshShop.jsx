import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { Plus, LayoutList, Settings } from 'lucide-react';
import { formatMoney } from '../../utils';
import { deleteFreshItem, copyItemsToMonth } from '../../repositories/freshRepository';
import { addPlannerCategory } from '../../repositories/plannerCategoriesRepository';
import { useSupermarket } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import { useUI, useUIDispatch } from '../../context/UIContext';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Skeleton from '../UI/Skeleton';
import { AVAILABLE_ICONS, AVAILABLE_COLORS, DEFAULT_CATEGORIES } from './constants';
import PlannerSection from './PlannerSection';

export default function FreshShop() {
    const navigate = useNavigate();
    const { isGlass, currentDate } = useUI();
    const { showToast } = useUIDispatch();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { freshItems: items, plannerCategories, loading } = useSupermarket();
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

    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // Ref para evitar que la herencia de presupuesto se dispare múltiples veces
    // mientras Firestore está sincronizando los ítems recién copiados.
    const inheritanceRunRef = useRef(new Set());

    // Si cambia de usuario, reiniciamos el registro de herencia
    useEffect(() => {
        inheritanceRunRef.current.clear();
    }, [auth.currentUser?.uid]);

    useEffect(() => {
        // Esperamos a tener los datos cargados de Firestore, mes válido y usuario autenticado
        if (loading || !currentMonthKey || !auth.currentUser) return;

        allCategories.forEach(cat => {
            const key = `${currentMonthKey}::${cat.id}`;

            // Si ya procesamos esta combinación mes+categoría en esta sesión, saltar
            if (inheritanceRunRef.current.has(key)) return;

            // Ítems del mes actual para esta categoría
            const currentItems = activeItems.filter(
                t => t.month === currentMonthKey && t.category === cat.id
            );

            // Si ya hay ítems este mes, marcar como procesado y saltar
            if (currentItems.length > 0) {
                inheritanceRunRef.current.add(key);
                return;
            }

            // Buscar todos los meses pasados que tienen ítems de esta categoría
            const pastMonths = [...new Set(
                activeItems.flatMap(t => t.category === cat.id && t.month < currentMonthKey ? [t.month] : [])
            )].sort().reverse(); // más reciente primero

            if (pastMonths.length === 0) {
                // Sin historial: marcar igualmente para no reintentar en cada render
                inheritanceRunRef.current.add(key);
                return;
            }

            // Tomar ítems del mes más reciente
            const sourceMonth = pastMonths[0];
            const sourceItems = activeItems.filter(
                t => t.month === sourceMonth && t.category === cat.id
            );

            // Marcar ANTES de copiar para evitar doble ejecución
            inheritanceRunRef.current.add(key);

            copyItemsToMonth(sourceItems, currentMonthKey)
                .catch(err => console.error('Error al heredar presupuesto:', err));
        });
    }, [currentMonthKey, activeItems, allCategories, loading]);

    const totals = useMemo(() => {
        const monthItems = activeItems.filter(t => t.month === currentMonthKey);
        const spent = monthItems.reduce((acc, t) => t.completed ? acc + (Number(t.total) || 0) : acc, 0);
        const budget = monthItems.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
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
            showToast('Categoría creada exitosamente', 'success');
            setShowNewCatForm(false);
            setNewCatLabel('');
        } catch (err) {
            console.error(err);
            showToast('Error al crear la categoría', 'error');
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
                        <p className={`text-xs font-bold uppercase mt-1 capitalize ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            {(currentDate || new Date()).toLocaleString('es-AR', { month: 'long' })}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <p className={`text-[10px] uppercase font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Real / Presupuesto</p>
                            <button
                                aria-label="Configuración del planificador"
                                type="button"
                                onClick={() => navigate('/settings_modules/planner')}
                                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                                    isGlass ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                        <p className={`text-2xl font-bold font-mono ${isGlass ? 'text-white' : 'text-gray-900'}`}>
                            {formatMoney(totals.spent)} <span className="text-xs opacity-40">/ {formatMoney(totals.budget)}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="animate-fade-in space-y-4 pb-32">
                {/* ESPACIADOR */}
                <div className="h-[95px]"></div>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton type="rectangular" height={96} className="w-full rounded-3xl" />
                    <Skeleton type="rectangular" height={96} className="w-full rounded-3xl" />
                    <Skeleton type="rectangular" height={96} className="w-full rounded-3xl" />
                </div>
            ) : (
                allCategories.map(cat => (
                    <PlannerSection key={cat.id} catData={cat} trips={activeItems} currentMonthKey={currentMonthKey} isGlass={isGlass} householdId={householdId} />
                ))
            )}

            {!showNewCatForm ? (
                <button
                    aria-label="Crear nueva categoría"
                    type="button"
                    onClick={() => setShowNewCatForm(true)}
                    className={`w-full min-h-[48px] py-4 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 font-bold transition-all ${
                        isGlass ? 'border-white/20 text-white/60 hover:text-white hover:bg-white/5' : 'border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                    <Plus size={20} /> Crear Nueva Categoría
                </button>
            ) : (
                <form onSubmit={handleCreateCategory} className={`rounded-3xl border p-4 space-y-4 ${isGlass ? 'bg-black/30 border-white/20' : 'bg-white border-gray-200 shadow-md'}`}>
                    <div className="flex justify-between items-center">
                        <h3 className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Nueva Categoría</h3>
                        <button
                            aria-label="Cerrar formulario de categoría"
                            type="button"
                            onClick={() => setShowNewCatForm(false)}
                            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                                isGlass ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            ✕
                        </button>
                    </div>
                    
                    <Input
                        label="Nombre de la categoría"
                        placeholder="Ej. Farmacia, Ferretería"
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
                                        aria-label={`Seleccionar icono ${iconKey}`}
                                        key={iconKey}
                                        type="button"
                                        onClick={() => setNewCatIcon(iconKey)}
                                        className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl flex items-center justify-center transition-all ${
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
                                    aria-label={`Seleccionar color ${colorKey}`}
                                    key={colorKey}
                                    type="button"
                                    onClick={() => setNewCatColor(colorKey)}
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-transform active:scale-95"
                                >
                                    <span
                                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                                            newCatColor === colorKey ? 'scale-110 border-white shadow-lg ring-2 ring-indigo-500' : 'border-transparent opacity-70'
                                        }`}
                                        style={{ backgroundColor: colorKey }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={isSavingCat}
                        className="w-full"
                    >
                        Crear Categoría
                    </Button>
                </form>
            )}
            </div>
        </>
    );
}
