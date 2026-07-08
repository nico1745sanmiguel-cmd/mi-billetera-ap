import React from 'react';
import { ShoppingCart, Plus, LayoutList } from 'lucide-react';
import { formatMoney } from '../../../utils';

export default function SuperActionsWidget({ superData, privacyMode, setView }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    return (
        <div className="space-y-3 mx-1">
            <div className="grid grid-cols-1 gap-3">
                <div onClick={() => setView('super')} className="bg-white dark:bg-[#0f0c29]/50 p-4 rounded-[24px] border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-500/50 transition-colors group flex flex-col justify-between h-32 dark:backdrop-blur-md">
                    <div className="flex justify-between items-start">
                        <div className="bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 p-2.5 rounded-xl">
                            <ShoppingCart size={24} />
                        </div>
                        {superData.percent > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">{Math.round(superData.percent)}%</span>}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 dark:text-white/40 font-bold uppercase mb-0.5">{superData.label}</p>
                        <p className={`text-xl font-bold ${superData.statusColor === 'text-gray-900' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'}`}>{showMoney(superData.showAmount)}</p>
                    </div>
                </div>
            </div>

            <div onClick={() => setView('fresh')} className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-500/20 p-4 rounded-[24px] cursor-pointer hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 active:scale-95 transition-all flex items-center justify-between group shadow-sm dark:backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                        <LayoutList size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">Planificador</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Proyectos · Verdulería · Categorías</p>
                    </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-white/20 group-hover:text-green-500 dark:group-hover:text-green-400 group-hover:translate-x-1 transition-all"><path d="M9 18l6-6-6-6"/></svg>
            </div>
        </div>
    );
}
