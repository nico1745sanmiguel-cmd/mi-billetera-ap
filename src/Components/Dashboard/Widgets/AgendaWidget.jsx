import React, { useMemo, useState } from 'react';
import { CalendarDays, PartyPopper, LayoutList, CalendarRange } from 'lucide-react';
import { formatMoney } from '../../../utils';

// Mapa de colores de categoría del planificador (mismo que ServicesManager)
const PLANNER_COLOR_MAP = {
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   glBg: 'bg-blue-500/20',   glText: 'text-blue-200',   glBorder: 'border-blue-500/30' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', glBg: 'bg-purple-500/20', glText: 'text-purple-200', glBorder: 'border-purple-500/30' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', glBg: 'bg-orange-500/20', glText: 'text-orange-200', glBorder: 'border-orange-500/30' },
    pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   glBg: 'bg-pink-500/20',   glText: 'text-pink-200',   glBorder: 'border-pink-500/30' },
    green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  glBg: 'bg-green-500/20',  glText: 'text-green-200',  glBorder: 'border-green-500/30' },
    red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    glBg: 'bg-red-500/20',    glText: 'text-red-200',    glBorder: 'border-red-500/30' },
};
const DEFAULT_PLANNER_COLORS = { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', glBg: 'bg-teal-500/20', glText: 'text-teal-200', glBorder: 'border-teal-500/30' };

const DAYS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AgendaWidget({ agenda, currentDate, privacyMode, setView, freshItems = [], plannerCategories = [] }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('agenda_widget_mode') || 'list'; } catch { return 'list'; }
    });

    const switchMode = (mode) => {
        setViewMode(mode);
        try { localStorage.setItem('agenda_widget_mode', mode); } catch {}
    };

    // Mapa id categoría → colorName
    const catColorMap = useMemo(() => {
        const defaults = [{ id: 'verduleria', colorName: 'green' }, { id: 'carniceria', colorName: 'red' }];
        const all = [...defaults, ...plannerCategories];
        const map = {};
        all.forEach(c => { map[c.id] = c.colorName; });
        return map;
    }, [plannerCategories]);

    // ─── SEMANA EN CURSO ────────────────────────────────────────────
    // Calculamos los 7 días de la semana actual (lun-dom) usando fecha REAL de hoy
    const weekDays = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // JS: 0=dom, 1=lun ... 6=sab → convertir a lun=0 ... dom=6
        const dayOfWeek = (today.getDay() + 6) % 7; // 0=lun
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    }, []); // solo se calcula una vez por montaje

    // Items del planificador para la semana
    const plannerItemsByDay = useMemo(() => {
        const map = {};
        freshItems.forEach(fi => {
            if (!fi.date) return;
            const fiDate = new Date(fi.date + 'T12:00:00');
            const dayKey = fiDate.toISOString().split('T')[0];
            if (!map[dayKey]) map[dayKey] = [];
            const colorName = catColorMap[fi.category] || 'green';
            map[dayKey].push({ ...fi, itemKind: 'planner', colorName });
        });
        return map;
    }, [freshItems, catColorMap]);

    // Items de pagos (servicios/tarjetas) para la semana — los posicionamos por día del mes
    const paymentItemsByDay = useMemo(() => {
        const map = {};
        agenda.forEach(item => {
            const matchingDay = weekDays.find(d => d.getDate() === item.day);
            if (matchingDay) {
                const key = matchingDay.toISOString().split('T')[0];
                if (!map[key]) map[key] = [];
                map[key].push({ ...item, itemKind: 'payment' });
            }
        });
        return map;
    }, [agenda, weekDays]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mx-1 dark:backdrop-blur-md">
            {/* HEADER */}
            <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-transparent">
                <h3
                    className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2 cursor-pointer"
                    onClick={() => setView('services_manager')}
                >
                    <CalendarDays size={18} /> Agenda {currentDate.toLocaleString('es-AR', { month: 'long' })}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Switch lista / semana */}
                    <div className="flex bg-gray-100 dark:bg-white/10 rounded-xl p-0.5">
                        <button
                            onClick={() => switchMode('list')}
                            title="Vista Lista"
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/20 shadow text-indigo-600 dark:text-white' : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60'}`}
                        >
                            <LayoutList size={14} />
                        </button>
                        <button
                            onClick={() => switchMode('week')}
                            title="Vista Semana"
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white dark:bg-white/20 shadow text-indigo-600 dark:text-white' : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60'}`}
                        >
                            <CalendarRange size={14} />
                        </button>
                    </div>
                    <span
                        className="text-xs font-bold text-gray-400 dark:text-white/40 cursor-pointer"
                        onClick={() => setView('services_manager')}
                    >
                        Ver todo →
                    </span>
                </div>
            </div>

            {/* ── MODO LISTA ── */}
            {viewMode === 'list' && (
                <div>
                    {agenda.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold ${item.day <= 5 ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/70'}`}>
                                    <span className="text-sm">{item.day}</span>
                                    <span className="text-[8px] uppercase">Día</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white/90 text-sm">{item.name}</p>
                                    <p className="text-xs text-gray-400 dark:text-white/40">{item.type === 'card_item' ? 'Tarjeta Crédito' : 'Servicio'}</p>
                                </div>
                            </div>
                            <p className="font-mono font-bold text-gray-800 dark:text-white">{showMoney(item.amount)}</p>
                        </div>
                    ))}
                    {agenda.length === 0 && (
                        <div className="p-6 text-center text-gray-400 dark:text-white/40">
                            <p className="text-xs flex items-center justify-center gap-1"><PartyPopper size={16} /> Nada pendiente este mes</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── MODO SEMANA ── */}
            {viewMode === 'week' && (
                <div className="p-3">
                    <div className="grid grid-cols-7 gap-1">
                        {/* Cabecera días */}
                        {DAYS_LABELS.map((label, i) => (
                            <div key={i} className="text-center text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/30 pb-1">
                                {label}
                            </div>
                        ))}

                        {/* Celdas de cada día */}
                        {weekDays.map((day, i) => {
                            const dayKey = day.toISOString().split('T')[0];
                            const isToday = day.getTime() === today.getTime();
                            const plannerEvents = plannerItemsByDay[dayKey] || [];
                            const paymentEvents = paymentItemsByDay[dayKey] || [];
                            const allEvents = [...paymentEvents, ...plannerEvents];
                            const hasEvents = allEvents.length > 0;

                            return (
                                <div
                                    key={dayKey}
                                    className={`min-h-[80px] rounded-2xl border p-1.5 flex flex-col gap-1 transition-all ${
                                        isToday
                                            ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400/50'
                                            : (hasEvents
                                                ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
                                                : 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5')
                                    }`}
                                >
                                    {/* Número del día */}
                                    <div className={`text-[10px] font-bold flex justify-center items-center w-5 h-5 rounded-full mx-auto ${
                                        isToday
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-500 dark:text-white/50'
                                    }`}>
                                        {day.getDate()}
                                    </div>

                                    {/* Eventos */}
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        {paymentEvents.map(item => (
                                            <div
                                                key={item.id}
                                                className="text-[8px] px-1 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/30 text-indigo-800 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-500/40 font-bold truncate leading-tight"
                                                title={`${item.name} — ${showMoney(item.amount)}`}
                                            >
                                                {item.name}
                                            </div>
                                        ))}
                                        {plannerEvents.map(item => {
                                            const pColors = PLANNER_COLOR_MAP[item.colorName] || DEFAULT_PLANNER_COLORS;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`text-[8px] px-1 py-0.5 rounded-md font-bold truncate leading-tight border ${
                                                        item.completed
                                                            ? 'bg-gray-50 dark:bg-white/5 text-gray-300 dark:text-white/20 border-gray-100 dark:border-white/5 line-through'
                                                            : `${pColors.bg} ${pColors.text} ${pColors.border} dark:${pColors.glBg} dark:${pColors.glText} dark:${pColors.glBorder}`
                                                    }`}
                                                    title={`📋 ${item.note || 'Sin nota'}${item.total > 0 ? ' — ' + showMoney(item.total) : ''}`}
                                                >
                                                    📋 {item.note || '—'}
                                                </div>
                                            );
                                        })}
                                        {allEvents.length === 0 && (
                                            <div className="text-[8px] text-gray-300 dark:text-white/10 text-center mt-1">·</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Leyenda */}
                    <div className="flex items-center gap-3 mt-2 px-1">
                        <span className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-white/30 font-bold">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100 dark:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/40 inline-block"></span>
                            Pagos
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-white/30 font-bold">
                            <span className="w-2.5 h-2.5 rounded-sm bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 inline-block"></span>
                            Planificador
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
