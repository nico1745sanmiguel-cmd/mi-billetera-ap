import React from 'react';
import { CalendarDays, PartyPopper } from 'lucide-react';
import { formatMoney } from '../../../utils';

export default function AgendaWidget({ agenda, currentDate, privacyMode, setView }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    return (
        <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mx-1 dark:backdrop-blur-md">
            <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-transparent cursor-pointer" onClick={() => setView('services_manager')}>
                <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><CalendarDays size={18} /> Agenda {currentDate.toLocaleString('es-AR', { month: 'long' })}</h3>
                <span className="text-xs font-bold text-gray-400 dark:text-white/40">Ver todo →</span>
            </div>
            <div>
                {agenda.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold ${item.day <= 5 ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/70'}`}><span className="text-sm">{item.day}</span><span className="text-[8px] uppercase">Día</span></div>
                            <div><p className="font-bold text-gray-800 dark:text-white/90 text-sm">{item.name}</p><p className="text-xs text-gray-400 dark:text-white/40">{item.type === 'card_item' ? 'Tarjeta Crédito' : 'Servicio'}</p></div>
                        </div>
                        <p className="font-mono font-bold text-gray-800 dark:text-white">{showMoney(item.amount)}</p>
                    </div>
                ))}
                {agenda.length === 0 && <div className="p-6 text-center text-gray-400 dark:text-white/40"><p className="text-xs flex items-center justify-center gap-1"><PartyPopper size={16} /> Nada pendiente este mes</p></div>}
            </div>
        </div>
    );
}
