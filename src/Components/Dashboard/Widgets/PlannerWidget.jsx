import React, { useMemo } from 'react';
import { LayoutList, Circle } from 'lucide-react';
import { useSupermarket } from '../../../context/SupermarketContext';
import { useUI } from '../../../context/UIContext';
import { formatMoney } from '../../../utils';
import { DEFAULT_CATEGORIES, AVAILABLE_ICONS } from '../../Supermarket/constants';

export default function PlannerWidget({ setView, size }) {
    const { freshItems, plannerCategories } = useSupermarket();
    const { currentDate } = useUI();

    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const allCategories = useMemo(() => {
        return [...DEFAULT_CATEGORIES, ...plannerCategories];
    }, [plannerCategories]);

    const activeItems = useMemo(() => {
        const catIds = new Set(allCategories.map(c => c.id));
        return freshItems.filter(t => catIds.has(t.category) && t.month === currentMonthKey);
    }, [freshItems, allCategories, currentMonthKey]);

    const pendingItems = useMemo(() => {
        return activeItems.filter(item => !item.completed);
    }, [activeItems]);

    const faltante = useMemo(() => {
        // En PlannerSection, total = budget (si está pendiente) o real (si está completo)
        // Lo que falta gastar es la suma de los "totales" (presupuestos) de los pendientes
        return pendingItems.reduce((acc, t) => acc + (t.total || 0), 0);
    }, [pendingItems]);

    // ---- MODO COMPACTO: mismo diseño pero sin lista de tareas ----
    // Calcular categorías aquí también para el modo half
    const categoryCountsHalf = pendingItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});
    const sortedActiveCatsHalf = allCategories
        .filter(c => categoryCountsHalf[c.id] > 0)
        .sort((a, b) => categoryCountsHalf[b.id] - categoryCountsHalf[a.id])
        .slice(0, 3);
    const displayCategoriesHalf = sortedActiveCatsHalf.length > 0 ? sortedActiveCatsHalf : allCategories.slice(0, 3);

    if (size === 'half') {
        return (
            <div
                onClick={() => setView('fresh')}
                className="h-full bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border border-indigo-200 dark:border-indigo-500/20 p-3 rounded-[24px] cursor-pointer active:scale-95 transition-all flex flex-col justify-between group shadow-sm dark:backdrop-blur-md"
            >
                {/* Header compacto */}
                <div className="flex items-center gap-2">
                    <div className="relative bg-indigo-100 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-300 p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105">
                        <LayoutList size={16} />
                        {pendingItems.length > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-[#1a1b4b]">
                                {pendingItems.length}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-white text-xs leading-none mb-0.5 truncate">Planificador</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            Faltan: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatMoney(faltante)}</span>
                        </p>
                    </div>
                </div>

                {/* Shortcuts de categorías */}
                <div className="flex gap-1.5 pt-2 border-t border-indigo-200/50 dark:border-indigo-500/20">
                    {displayCategoriesHalf.map(cat => {
                        const hasPending = categoryCountsHalf[cat.id] > 0;
                        const IconComponent = AVAILABLE_ICONS[cat.iconName] || LayoutList;
                        return (
                            <div
                                key={cat.id}
                                className="flex-1 flex flex-col items-center gap-0.5 bg-white/70 dark:bg-white/5 py-1.5 rounded-xl border border-white/50 dark:border-white/5 relative"
                                onClick={(e) => { e.stopPropagation(); setView('fresh'); }}
                            >
                                {hasPending && (
                                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full" />
                                )}
                                <IconComponent size={12} className={hasPending ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-400 dark:text-gray-500'} />
                                <span className="text-[8px] font-semibold text-gray-600 dark:text-gray-400 truncate w-full text-center px-0.5">
                                    {cat.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ---- MODO COMPLETO (Mix Opción 2 y 3) ----
    const topPending = pendingItems.slice(0, 2);
    
    // Contar cuántos ítems pendientes hay por categoría
    const categoryCounts = pendingItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});
    
    // Tomar las categorías con tareas pendientes, o si no hay, tomar las primeras 3
    const sortedActiveCats = allCategories
        .filter(c => categoryCounts[c.id] > 0)
        .sort((a, b) => categoryCounts[b.id] - categoryCounts[a.id])
        .slice(0, 3);
        
    const displayCategories = sortedActiveCats.length > 0 ? sortedActiveCats : allCategories.slice(0, 3);

    return (
        <div
            className="h-full bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border border-indigo-200 dark:border-indigo-500/20 p-4 rounded-[24px] cursor-pointer hover:shadow-md transition-all flex flex-col justify-between group shadow-sm dark:backdrop-blur-md"
            onClick={() => setView('fresh')}
        >
            {/* Header: Titulo y Faltante */}
            <div className="flex justify-between items-start mb-3 gap-2">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-300 p-2.5 rounded-xl transition-transform group-hover:scale-105 shrink-0">
                        <LayoutList size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-white text-sm leading-none mb-1 truncate">Planificador</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            Faltan: <span className="font-semibold text-gray-700 dark:text-gray-200 truncate">{formatMoney(faltante)}</span>
                        </p>
                    </div>
                </div>

            </div>

            {/* Próximas Tareas */}
            <div className="mb-3 space-y-1.5 flex-1">
                {topPending.length > 0 ? (
                    topPending.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 p-2 rounded-xl border border-white/40 dark:border-white/5">
                            <Circle size={12} className="text-gray-400 dark:text-gray-500 min-w-[12px] shrink-0" />
                            <span className="truncate">{item.note || 'Sin descripción'}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2 bg-white/40 dark:bg-black/10 rounded-xl border border-white/20 dark:border-white/5 h-full flex items-center justify-center">
                        No hay tareas pendientes este mes.
                    </div>
                )}
            </div>

            {/* Accesos Rápidos por Categoría */}
            <div className="flex gap-2 mt-auto pt-2 border-t border-indigo-200/50 dark:border-indigo-500/20">
                {displayCategories.map(cat => {
                    const hasPending = categoryCounts[cat.id] > 0;
                    const IconComponent = AVAILABLE_ICONS[cat.iconName] || LayoutList;
                    return (
                        <div 
                            key={cat.id} 
                            className="flex-1 flex flex-col items-center gap-1 bg-white/70 dark:bg-white/5 py-1.5 rounded-[14px] border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors relative"
                            onClick={(e) => {
                                e.stopPropagation(); // Evita que se dispare el click general
                                setView('fresh');
                            }}
                        >
                            {hasPending && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full shadow-sm" />
                            )}
                            <IconComponent size={14} className={hasPending ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-400 dark:text-gray-500'} />
                            <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 truncate w-full text-center px-1">
                                {cat.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
