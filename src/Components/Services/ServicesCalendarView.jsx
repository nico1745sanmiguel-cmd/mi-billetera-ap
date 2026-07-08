import React, { useState } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';

export default function ServicesCalendarView({
    daysOfWeek,
    calendarDays,
    calendarItemsByDay,
    currentDate,
    isGlass,
    PLANNER_COLOR_MAP,
    DEFAULT_PLANNER_COLORS,
    showMoney,
    openModal
}) {
    const [selectedDay, setSelectedDay] = useState(null);

    const selectedItems = selectedDay !== null ? (calendarItemsByDay[selectedDay] || []) : [];

    const monthName = currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    return (
        <>
            <div className={`p-4 rounded-[30px] border animate-fade-in ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                    {daysOfWeek.map(d => (
                        <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wider ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {calendarDays.map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} className={`rounded-2xl border min-h-[70px] md:min-h-[90px] ${isGlass ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} opacity-30`} />;

                        const dayItems = calendarItemsByDay[day] || [];

                        const todayDate = new Date();
                        const isToday = todayDate.getDate() === day && todayDate.getMonth() === currentDate.getMonth() && todayDate.getFullYear() === currentDate.getFullYear();


                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`min-h-[60px] md:min-h-[100px] rounded-2xl border p-1.5 md:p-2 flex flex-col transition-all overflow-hidden cursor-pointer active:scale-95 ${
                                    isToday
                                        ? (isGlass ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 border-indigo-300 shadow-sm')
                                        : (isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 hover:border-gray-300')
                                }`}
                            >
                                <div className={`text-[10px] md:text-xs font-bold mb-1.5 flex justify-center items-center w-5 h-5 md:w-6 md:h-6 rounded-full flex-shrink-0 ${isToday ? (isGlass ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white') : (isGlass ? 'text-white/70' : 'text-gray-600')}`}>
                                    {day}
                                </div>
                                {/* Mobile: solo puntos indicadores */}
                                <div className="flex flex-wrap gap-0.5 md:hidden">
                                    {dayItems.slice(0, 3).map(item => (
                                        <span
                                            key={item.id}
                                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                item.itemKind === 'planner'
                                                    ? (item.completed ? 'bg-gray-300' : 'bg-teal-400')
                                                    : (item.isPaid ? 'bg-green-400' : 'bg-indigo-500')
                                            }`}
                                        />
                                    ))}
                                    {dayItems.length > 3 && (
                                        <span className={`text-[7px] font-bold ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>+{dayItems.length - 3}</span>
                                    )}
                                </div>
                                {/* Desktop: items completos */}
                                <div className="hidden md:flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar pb-1">
                                    {dayItems.map(item => {
                                        if (item.itemKind === 'planner') {
                                            const pColors = PLANNER_COLOR_MAP[item.colorName] || DEFAULT_PLANNER_COLORS;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`text-[9px] md:text-[10px] px-1.5 py-1 rounded-lg flex flex-col border ${
                                                        item.completed
                                                            ? (isGlass ? 'bg-white/5 border-white/10 text-white/30 line-through' : 'bg-gray-50 border-gray-200 text-gray-400 line-through')
                                                            : (isGlass ? `${pColors.glBg} ${pColors.glText} ${pColors.glBorder}` : `${pColors.bg} ${pColors.text} ${pColors.border}`)
                                                    }`}
                                                    title={`📋 ${item.note || 'Sin nota'}${item.total > 0 ? ' — ' + showMoney(item.total) : ''}`}
                                                >
                                                    <span className="truncate font-bold leading-tight">📋 {item.note || 'Sin nota'}</span>
                                                    {item.total > 0 && <span className="font-mono text-[8px] opacity-80 mt-0.5">{showMoney(item.total)}</span>}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={e => { e.stopPropagation(); openModal(item); }}
                                                className={`text-[9px] md:text-[10px] px-1.5 py-1 rounded-lg cursor-pointer transition-transform active:scale-95 flex flex-col ${
                                                    item.isPaid
                                                        ? (isGlass ? 'bg-green-500/10 text-green-400/50 line-through border border-green-500/20' : 'bg-green-50 text-green-600/60 line-through border border-green-100')
                                                        : (isGlass ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-500/50 hover:bg-indigo-500/40' : 'bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200')
                                                }`}
                                                title={`${item.name} - ${showMoney(item.amount)}`}
                                            >
                                                <span className="truncate font-bold leading-tight">{item.name}</span>
                                                <span className="font-mono text-[8px] opacity-80 mt-0.5">{showMoney(item.amount)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── MODAL ZOOM DE DÍA ── */}
            {selectedDay !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedDay(null)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal centrado */}
                    <div
                        className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-fade-in ${isGlass ? 'bg-[#1a1b4b]/95 border border-white/20' : 'bg-white border border-gray-100'}`}
                        onClick={e => e.stopPropagation()}
                        style={{ maxHeight: '80vh' }}
                    >
                        {/* Header */}
                        <div className={`px-5 py-4 flex items-center justify-between border-b ${isGlass ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-widest ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>{monthName}</p>
                                <h2 className={`text-2xl font-black ${isGlass ? 'text-white' : 'text-gray-900'}`}>
                                    Día {selectedDay}
                                </h2>
                            </div>
                            <button type="button"
                                onClick={() => setSelectedDay(null)}
                                className={`p-2 rounded-full transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                            {selectedItems.length === 0 ? (
                                <div className={`p-8 text-center ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                    <p className="text-sm">Sin eventos este día</p>
                                </div>
                            ) : (
                                <div className="p-3 flex flex-col gap-2">
                                    {selectedItems.map(item => {
                                        if (item.itemKind === 'planner') {
                                            const pColors = PLANNER_COLOR_MAP[item.colorName] || DEFAULT_PLANNER_COLORS;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                                                        item.completed
                                                            ? (isGlass ? 'bg-white/5 border-white/10 opacity-50' : 'bg-gray-50 border-gray-100 opacity-60')
                                                            : (isGlass ? `${pColors.glBg} ${pColors.glBorder}` : `${pColors.bg} ${pColors.border}`)
                                                    }`}
                                                >
                                                    <span className="text-xl">📋</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-sm ${item.completed ? 'line-through' : ''} ${isGlass ? pColors.glText : pColors.text}`}>
                                                            {item.note || 'Sin nota'}
                                                        </p>
                                                        {item.total > 0 && (
                                                            <p className={`text-xs font-mono mt-0.5 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                                                                {showMoney(item.total)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {item.completed && (
                                                        <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                                                    )}
                                                </div>
                                            );
                                        }
                                        // Item de pago
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => { openModal(item); setSelectedDay(null); }}
                                                className={`p-3.5 rounded-2xl border cursor-pointer active:scale-95 transition-all flex items-center gap-3 ${
                                                    item.isPaid
                                                        ? (isGlass ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100')
                                                        : (isGlass ? 'bg-indigo-500/20 border-indigo-500/40 hover:bg-indigo-500/30' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100')
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    item.isPaid
                                                        ? (isGlass ? 'bg-green-500/20' : 'bg-green-100')
                                                        : (isGlass ? 'bg-indigo-500/30' : 'bg-indigo-100')
                                                }`}>
                                                    {item.isPaid
                                                        ? <CheckCircle2 size={20} className={isGlass ? 'text-green-400' : 'text-green-600'} />
                                                        : <Circle size={20} className={isGlass ? 'text-indigo-300' : 'text-indigo-500'} />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-bold text-sm ${item.isPaid ? 'line-through opacity-60' : ''} ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                                                        {item.name}
                                                    </p>
                                                    <p className={`text-xs ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                                        {item.type === 'card_item' ? '💳 Tarjeta' : '📌 Servicio'}
                                                    </p>
                                                </div>
                                                <p className={`font-mono font-bold text-sm flex-shrink-0 ${
                                                    item.isPaid
                                                        ? (isGlass ? 'text-green-400/60' : 'text-green-600/60')
                                                        : (isGlass ? 'text-white' : 'text-gray-800')
                                                }`}>
                                                    {showMoney(item.amount)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
