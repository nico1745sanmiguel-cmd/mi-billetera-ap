import React from 'react';

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
    return (
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
                        <div key={day} className={`min-h-[80px] md:min-h-[100px] rounded-2xl border p-1.5 md:p-2 flex flex-col transition-all overflow-hidden ${isToday ? (isGlass ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 border-indigo-300 shadow-sm') : (isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 hover:border-gray-300')}`}>
                            <div className={`text-[10px] md:text-xs font-bold mb-1.5 flex justify-center items-center w-5 h-5 md:w-6 md:h-6 rounded-full ${isToday ? (isGlass ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white') : (isGlass ? 'text-white/70' : 'text-gray-600')}`}>
                                {day}
                            </div>
                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar pb-1">
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
                                    // Item de pago (servicio / tarjeta)
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => openModal(item)}
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
    );
}
