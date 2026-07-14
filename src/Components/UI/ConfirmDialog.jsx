import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-10 sm:pt-16 animate-fade-in" onClick={onCancel}>
            <div 
                className="bg-white dark:bg-[#1a1b4b] w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-3 rounded-2xl ${isDanger ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 leading-tight">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button aria-label="Cancelar" type="button" 
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button aria-label="Confirmar" type="button" 
                        onClick={() => { onConfirm(); onCancel(); }}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors shadow-lg ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
