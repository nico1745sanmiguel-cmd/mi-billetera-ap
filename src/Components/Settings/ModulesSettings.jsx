import React, { useState } from 'react';
import { ArrowLeft, Briefcase, Car, Puzzle, ShoppingCart, CreditCard, TrendingUp, Users, CalendarDays, ListTodo, PieChart, Sparkles, StickyNote } from 'lucide-react';
import { CACHE_KEYS } from '../../config/constants';
import { setCache } from '../../utils/cache';
import { useUI } from '../../context/UIContext';

// ─── Definición de módulos disponibles ────────────────────────────────────────
// Para agregar un módulo nuevo, solo hay que añadir un objeto acá.
const AVAILABLE_MODULES = [
    {
        id: 'mobility',
        label: 'Movilidad',
        description: 'Registrá tus ingresos por Uber, Didi, Cabify y otros. Calculá cuánto ganás por hora y por kilómetro.',
        icon: Car,
        color: 'from-violet-600 to-indigo-600',
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
        badge: 'Nuevo',
    },
    {
        id: 'supermarket',
        label: 'Supermercado',
        description: 'Gestioná tu lista de compras, registrá gastos del super y escaneá tickets para llevar el historial mensual.',
        icon: ShoppingCart,
        color: 'from-emerald-500 to-teal-600',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badge: null,
    },
    {
        id: 'cards',
        label: 'Tarjetas de Crédito',
        description: 'Administrá tus tarjetas, cargá resúmenes del mes (con IA), marcá pagos y visualizá tus cuotas pendientes.',
        icon: CreditCard,
        color: 'from-blue-600 to-indigo-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badge: null,
    },
    {
        id: 'savings',
        label: 'Ahorros e Inversiones',
        description: 'Gestioná tus metas de ahorro, registrá tus saldos y seguí el rendimiento de tus inversiones.',
        icon: TrendingUp,
        color: 'from-amber-500 to-orange-600',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badge: null,
    },
    {
        id: 'salary',
        label: 'Sueldo Mensual',
        description: 'Planificá cómo distribuir tu sueldo mes a mes. Configurá fuentes de ingreso, creá sobres por categoría y conectá tus gastos familiares.',
        icon: Briefcase,
        color: 'from-violet-600 to-indigo-600',
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
        badge: 'Nuevo',
    },
    {
        id: 'household',
        label: 'Grupo Familiar y Reparto',
        description: 'Gestioná los miembros de tu hogar, sus sueldos y calculá el reparto proporcional de los gastos compartidos.',
        icon: Users,
        color: 'from-pink-500 to-rose-600',
        iconBg: 'bg-pink-100',
        iconColor: 'text-pink-600',
        badge: null,
    },
    {
        id: 'agenda',
        label: 'Agenda de Vencimientos',
        description: 'Calendario de servicios fijos, tarjetas de crédito y recordatorios de pagos.',
        icon: CalendarDays,
        color: 'from-cyan-500 to-blue-600',
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        badge: null,
    },
    {
        id: 'planner',
        label: 'Planificador Financiero',
        description: 'Organizá tu presupuesto mensual, definí objetivos y planificá tus compras (ferias, etc.).',
        icon: ListTodo,
        color: 'from-fuchsia-500 to-purple-600',
        iconBg: 'bg-fuchsia-100',
        iconColor: 'text-fuchsia-600',
        badge: null,
    },
    {
        id: 'stats',
        label: 'Estadísticas y Análisis',
        description: 'Visualizá gráficos detallados de tus finanzas y proyecciones a futuro.',
        icon: PieChart,
        color: 'from-indigo-500 to-blue-600',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: null,
    },
    {
        id: 'notes',
        label: 'Notas Rápidas',
        description: 'Post-it flotante para llevar una lista rápida de tareas pendientes (estilo Google Keep).',
        icon: StickyNote,
        color: 'from-yellow-400 to-amber-500',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        badge: 'Nuevo',
    },
];

import { loadModules } from '../../utils/modulesUtils';

const saveModules = (state) => {
    setCache(CACHE_KEYS.ENABLED_MODULES, state);
    // Notificar a App.jsx que los módulos cambiaron para forzar re-render
    window.dispatchEvent(new CustomEvent('modulesChanged'));
};

export default function ModulesSettings({ onBack }) {
    const { isGlass, motionPreference, setMotionPreference } = useUI();
    const [enabled, setEnabled] = useState(loadModules);

    const toggle = (id) => {
        setEnabled(prev => {
            const next = { ...prev, [id]: !prev[id] };
            saveModules(next);
            return next;
        });
    };

    const card = `rounded-2xl p-4 transition-all ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg'}`}>
                <div className="flex items-center gap-3">
                    <button aria-label="Acción" type="button"
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Puzzle size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Módulos</h2>
                            <p className="text-white/70 text-xs">Complementos opcionales</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN: ANIMACIONES */}
            <div className={`${card} mt-4`}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${text}`}>Animaciones</h3>
                        <p className={`text-xs ${sub}`}>Controlá el movimiento en la app</p>
                    </div>
                </div>
                
                <div className={`flex items-center w-full rounded-xl p-1 ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {[
                        { id: 'on', label: 'Prendido' },
                        { id: 'system', label: 'Sistema' },
                        { id: 'off', label: 'Apagado' }
                    ].map(option => (
                        <button aria-label="Acción" type="button"
                            key={option.id}
                            onClick={() => setMotionPreference(option.id)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                motionPreference === option.id
                                    ? isGlass 
                                        ? 'bg-blue-500 text-white shadow-md' 
                                        : 'bg-white text-blue-600 shadow-sm'
                                    : isGlass 
                                        ? 'text-white/50 hover:text-white/80' 
                                        : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <p className={`text-xs px-1 ${sub} mt-4`}>
                Activá solo los módulos que usás. Los módulos desactivados no aparecen en el menú de navegación.
            </p>

            {/* LISTA DE MÓDULOS */}
            <div className="space-y-3">
                {AVAILABLE_MODULES.map(({ id, label, description, icon: Icon, color, iconBg, iconColor, badge }) => {
                    const active = !!enabled[id];
                    // Cada módulo tiene su propio color de highlight cuando está activo
                    const glassActive = id === 'supermarket' ? 'border-emerald-400/40 bg-emerald-500/10'
                        : id === 'cards' ? 'border-blue-400/40 bg-blue-500/10'
                        : id === 'savings' ? 'border-amber-400/40 bg-amber-500/10'
                        : id === 'household' ? 'border-pink-400/40 bg-pink-500/10'
                        : id === 'agenda' ? 'border-cyan-400/40 bg-cyan-500/10'
                        : id === 'planner' ? 'border-fuchsia-400/40 bg-fuchsia-500/10'
                        : id === 'stats' ? 'border-indigo-400/40 bg-indigo-500/10'
                        : 'border-violet-400/40 bg-violet-500/10';
                    const lightActive = id === 'supermarket' ? 'border-emerald-200 bg-emerald-50/50'
                        : id === 'cards' ? 'border-blue-200 bg-blue-50/50'
                        : id === 'savings' ? 'border-amber-200 bg-amber-50/50'
                        : id === 'household' ? 'border-pink-200 bg-pink-50/50'
                        : id === 'agenda' ? 'border-cyan-200 bg-cyan-50/50'
                        : id === 'planner' ? 'border-fuchsia-200 bg-fuchsia-50/50'
                        : id === 'stats' ? 'border-indigo-200 bg-indigo-50/50'
                        : 'border-violet-200 bg-violet-50/50';
                    return (
                        <div
                            key={id}
                            className={`${card} ${active
                                ? isGlass
                                    ? glassActive
                                    : lightActive
                                : ''
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* ÍCONO */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    active
                                        ? `bg-gradient-to-br ${color}`
                                        : isGlass ? 'bg-white/10' : iconBg
                                }`}>
                                    <Icon size={22} className={active ? 'text-white' : iconColor} />
                                </div>

                                {/* INFO */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className={`font-bold text-sm ${text}`}>{label}</p>
                                        {badge && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                isGlass ? 'bg-violet-400/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                                            }`}>{badge}</span>
                                        )}
                                    </div>
                                    <p className={`text-xs leading-relaxed ${sub}`}>{description}</p>
                                </div>

                                {/* TOGGLE */}
                                <button aria-label="Acción" type="button"
                                    onClick={() => toggle(id)}
                                    className={`shrink-0 w-12 h-6 rounded-full transition-all duration-300 relative ${
                                        active
                                            ? `bg-gradient-to-r ${color}`
                                            : isGlass ? 'bg-white/20' : 'bg-gray-200'
                                    }`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                                        active ? 'left-7' : 'left-1'
                                    }`} />
                                </button>
                            </div>

                            {active && (
                                <div className={`mt-3 pt-3 border-t flex items-center gap-2 ${isGlass ? 'border-white/10' : 'border-violet-100'}`}>
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className={`text-xs ${isGlass ? 'text-green-300' : 'text-green-600'}`}>
                                        Módulo activo · aparece en el menú
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={`${card} flex items-center gap-3`}>
                <span className="text-2xl">🔜</span>
                <div>
                    <p className={`font-semibold text-sm ${text}`}>Más módulos próximamente</p>
                    <p className={`text-xs ${sub}`}>Se irán sumando nuevos complementos en futuras versiones.</p>
                </div>
            </div>
        </div>
    );
}
