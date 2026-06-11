import React from 'react';
import { Star } from 'lucide-react';

export default function MareaSemanal({ weeklyData, isGlass, showMoney }) {
    return (
        <div className={`p-6 rounded-[30px] text-white shadow-lg border relative overflow-hidden ${isGlass ? 'bg-white/5 border-white/10' : 'bg-[#0f172a] border-gray-800'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-10 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Marea Semanal</p>
                <div className="flex gap-3 text-[10px]">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-700 rounded-full"></div> Pendiente</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div> Pagado</span>
                </div>
            </div>
            <div className="flex items-end justify-between h-40 gap-4 px-2 relative z-10">
                {weeklyData.map((week, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                        <div className={`absolute -top-10 transition-all duration-300 transform ${week.total > 0 ? 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0' : 'hidden'}`}>
                            <div className="bg-white text-gray-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                {showMoney(week.paid)} / {showMoney(week.total)}
                            </div>
                            <div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1"></div>
                        </div>
                        {week.percentFilled >= 100 && week.total > 0 && <div className="absolute -top-8 animate-bounce z-20 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]"><Star size={20} className="text-yellow-400 fill-current" /></div>}
                        <div className="w-full bg-gray-800/50 rounded-t-lg relative flex items-end overflow-hidden transition-all duration-500" style={{ height: `${week.heightTotal}%` }}>
                            <div className={`w-full transition-all duration-1000 ease-out relative ${week.percentFilled >= 100 ? 'bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]' : 'bg-green-500/80'}`} style={{ height: `${week.percentFilled}%` }}>
                                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/50"></div>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${week.percentFilled >= 100 && week.total > 0 ? 'text-green-400' : 'text-gray-500'}`}>{week.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
