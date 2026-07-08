import React, { useState } from 'react';
import { ShoppingCart, Plus, Check } from 'lucide-react';
import { formatMoney } from '../../../utils';
import { addSuperItem } from '../../../repositories/supermarketRepository';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function SuperActionsWidget({ superData, privacyMode, setView, size = '1x1', targetMonthKey }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    const { user, userData } = useAuth();
    
    const [inputValue, setInputValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleQuickAdd = async (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        
        if (!inputValue.trim()) return;
        
        try {
            await addSuperItem({
                name: inputValue.trim(),
                price: 0,
                quantity: 1,
                checked: false,
                category: 'Otros',
                month: targetMonthKey,
                userId: user.uid,
                householdId: userData?.householdId || null,
                isShared: !!userData?.householdId
            });
            setInputValue('');
            toast.success('Agregado al changuito');
            if (isAdding) setIsAdding(false);
        } catch (error) {
            console.error('Error adding item:', error);
            toast.error('Error al agregar');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleQuickAdd(e);
        }
    };

    // Calculate ring progress for compact mode
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const percent = Math.min(Math.max(superData.percent || 0, 0), 100);
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    if (size === '1x1' || size === 'compact') {
        return (
            <div
                onClick={() => setView('super')}
                className="bg-white dark:bg-[#0f0c29]/50 p-4 rounded-[24px] border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-500/50 transition-colors group flex flex-col justify-between h-full dark:backdrop-blur-md mx-1 relative overflow-hidden"
            >
                {superData.percent > 90 && (
                     <div className="absolute top-0 left-0 w-full h-1 bg-red-500 opacity-80" />
                )}
                {superData.percent >= 75 && superData.percent <= 90 && (
                     <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 opacity-80" />
                )}

                <div className="flex justify-between items-start relative z-10">
                    <div className="relative flex items-center justify-center w-12 h-12">
                        <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
                            <circle cx="24" cy="24" r={radius} className="stroke-gray-100 dark:stroke-white/5" strokeWidth="3" fill="transparent" />
                            <circle
                                cx="24" cy="24" r={radius}
                                className={`${percent > 90 ? 'stroke-red-500' : percent > 75 ? 'stroke-orange-500' : 'stroke-purple-500'}`}
                                strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                            />
                        </svg>
                        <div className="text-purple-600 dark:text-purple-300 relative z-10 bg-white/50 dark:bg-[#0f0c29]/50 rounded-full p-1.5 backdrop-blur-sm">
                            <ShoppingCart size={18} />
                        </div>
                    </div>

                    {!isAdding && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                            className="bg-gray-50 text-gray-400 hover:text-purple-600 dark:bg-white/5 dark:text-white/40 dark:hover:text-purple-300 p-2 rounded-full transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                {isAdding ? (
                    <div className="relative z-10 mt-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            placeholder="Producto..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            onBlur={() => setTimeout(() => setIsAdding(false), 200)}
                            className="w-full bg-gray-50 dark:bg-black/20 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white focus:outline-none focus:border-purple-400 pr-8"
                        />
                        <button onClick={handleQuickAdd} className="absolute right-1 text-purple-500 p-1">
                            <Check size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="relative z-10 mt-2">
                        <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase mb-0.5 line-clamp-1">{superData.label}</p>
                        <p className={`text-lg font-bold leading-none ${superData.statusColor === 'text-gray-900' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'}`}>
                            {showMoney(superData.showAmount)}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            onClick={() => setView('super')}
            className="bg-white dark:bg-[#0f0c29]/50 p-4 rounded-[24px] border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-500/50 transition-colors group flex flex-col justify-between h-full dark:backdrop-blur-md mx-1 relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 p-2.5 rounded-xl">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 dark:text-white/40 font-bold uppercase">{superData.label}</p>
                        <p className={`text-xl font-bold ${superData.statusColor === 'text-gray-900' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'}`}>
                            {showMoney(superData.showAmount)}
                        </p>
                    </div>
                </div>
                {superData.percent > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${percent > 90 ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : percent > 75 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}`}>
                        {Math.round(percent)}%
                    </span>
                )}
            </div>
            
            <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Agregar rápido al súper..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-gray-50 dark:bg-black/20 text-sm px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white focus:outline-none focus:border-purple-400 pr-10"
                    />
                    <button 
                        onClick={handleQuickAdd}
                        disabled={!inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-purple-500 hover:bg-purple-600 p-1.5 rounded-lg disabled:opacity-50 disabled:bg-gray-300 transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                
                {superData.rawBudget > 0 && (
                    <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-medium">
                            <span>Gastado</span>
                            <span>Presupuesto</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
