import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatMoney } from '../../../utils';

export default function SuperActionsWidget({ superData, privacyMode, setView }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    return (
        <div
            onClick={() => setView('super')}
            className="bg-white dark:bg-[#0f0c29]/50 p-4 rounded-[24px] border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-500/50 transition-colors group flex flex-col justify-between h-full dark:backdrop-blur-md mx-1"
        >
            <div className="flex justify-between items-start">
                <div className="bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 p-2.5 rounded-xl">
                    <ShoppingCart size={24} />
                </div>
                {superData.percent > 0 && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                        {Math.round(superData.percent)}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-xs text-gray-400 dark:text-white/40 font-bold uppercase mb-0.5">{superData.label}</p>
                <p className={`text-xl font-bold ${superData.statusColor === 'text-gray-900' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'}`}>
                    {showMoney(superData.showAmount)}
                </p>
            </div>
        </div>
    );
}
