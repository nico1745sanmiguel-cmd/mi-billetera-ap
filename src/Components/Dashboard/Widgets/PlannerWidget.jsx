import React from 'react';
import { LayoutList } from 'lucide-react';

export default function PlannerWidget({ setView }) {
    return (
        <div
            onClick={() => setView('fresh')}
            className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-500/20 p-4 rounded-[24px] cursor-pointer hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 active:scale-95 transition-all flex items-center justify-between group shadow-sm dark:backdrop-blur-md mx-1"
        >
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                    <LayoutList size={20} />
                </div>
                <div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">Planificador</p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Proyectos · Verdulería · Categorías</p>
                </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-white/20 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        </div>
    );
}
