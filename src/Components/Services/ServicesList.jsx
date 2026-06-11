import React from 'react';
import { CalendarDays, User, Pencil } from 'lucide-react';

export default function ServicesList({ allItems, isGlass, householdId, showMoney, getStatusLabel, openModal, togglePaid, currentDate }) {
    if (allItems.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center p-10 text-center border-2 border-dashed rounded-[30px] ${isGlass ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                <CalendarDays size={40} className="mb-2 opacity-50 mx-auto" />
                <p className={`text-sm font-medium ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Nada pendiente para {currentDate.toLocaleString('es-AR', { month: 'long' })}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 animate-fade-in">
            {allItems.map((item) => {
                const status = getStatusLabel(item.day, item.isPaid);

                return (
                    <div key={item.id} className={`p-4 rounded-3xl border transition-all duration-300 group ${isGlass
                        ? (item.isPaid ? 'bg-green-900/10 border-green-500/20 opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10')
                        : (item.isPaid ? 'border-green-200 bg-green-50/30 opacity-75' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md')
                        }`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-colors border ${item.isPaid
                                    ? (isGlass ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200')
                                    : (isGlass ? 'bg-white/10 text-white border-white/5' : 'bg-gray-50 text-gray-600 border-gray-100')
                                    }`}>
                                    <span className="text-lg leading-none">{item.day}</span>
                                    <span className="text-[8px] uppercase opacity-70">Vence</span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`font-bold text-sm transition-all ${item.isPaid
                                            ? (isGlass ? 'text-green-300 line-through decoration-green-500' : 'text-green-800 line-through decoration-green-500')
                                            : (isGlass ? 'text-white' : 'text-gray-800')
                                            }`}>
                                            {item.name}
                                        </p>

                                        {householdId && item.isShared === false && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 ${isGlass ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-gray-100 text-gray-700 border-gray-300'}`}><User size={10} /> Privado</span>}
                                        {item.type === 'card' && item.isManual && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">Ajustado <Pencil size={10} /></span>}

                                        {!item.isPaid && (
                                            <button onClick={(e) => { e.stopPropagation(); openModal(item); }} className={`p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${isGlass ? 'text-white/30 hover:text-blue-300 hover:bg-white/10' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                                            {status.text}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex items-center gap-4">
                                <p className={`font-mono font-bold transition-colors ${item.isPaid ? 'text-green-500' : (isGlass ? 'text-white' : 'text-gray-900')}`}>{showMoney(item.amount)}</p>
                                <button onClick={() => togglePaid(item)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-90 ${item.isPaid ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] rotate-0' : (isGlass ? 'border-white/20 bg-transparent hover:border-blue-400 rotate-180' : 'border-gray-200 hover:border-blue-400 rotate-180 bg-white')}`}>
                                    {item.isPaid && <svg className="w-5 h-5 text-white animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
