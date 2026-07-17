import React from 'react';
import { Sparkles, Check, Loader2, Plus } from 'lucide-react';
import { formatMoney } from '../../utils';

const SuperListSuggestions = ({ 
    prediction, selectedSuggestions, setSelectedSuggestions, 
    setShowSuggestions, handleConfirmSuggestions, isAddingSuggestions, isGlass 
}) => {
    return (
        <div className={`rounded-3xl border p-4 animate-fade-in ${
            isGlass ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
        }`}>
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className={isGlass ? 'text-purple-400' : 'text-purple-600'} />
                <p className={`font-bold text-sm ${isGlass ? 'text-purple-300' : 'text-purple-700'}`}>Sugerencias inteligentes</p>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isGlass ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'
                }`}>Comprás cada tanto</span>
            </div>
            <div className="space-y-2 mb-4">
                {prediction.suggestions.map(s => {
                    const key = s.name.toLowerCase();
                    const isSelected = selectedSuggestions[key] ?? true;
                    return (
                        <button aria-label="Acción"
                            key={key}
                            type="button"
                            onClick={() => setSelectedSuggestions(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
                                isSelected
                                    ? (isGlass ? 'bg-purple-500/20 border-purple-500/40' : 'bg-white border-purple-300 shadow-sm')
                                    : (isGlass ? 'bg-white/5 border-white/10 opacity-50' : 'bg-gray-50 border-gray-200 opacity-50')
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-purple-500 border-purple-500' : (isGlass ? 'border-white/30' : 'border-gray-300')
                            }`}>
                                {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className={`flex-1 text-sm font-bold text-left ${isGlass ? 'text-white' : 'text-gray-800'}`}>{s.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isGlass ? 'bg-white/10 text-white/50' : 'bg-gray-100 text-gray-500'
                            }`}>c/{s.avgFrequency} meses</span>
                            {s.price > 0 && <span className={`text-xs font-mono font-bold ${isGlass ? 'text-purple-300' : 'text-purple-600'}`}>{formatMoney(s.price)}</span>}
                        </button>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <button aria-label="Acción" type="button"
                    onClick={() => setShowSuggestions(false)}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
                        isGlass ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                >Ignorar</button>
                <button aria-label="Acción" type="button"
                    onClick={handleConfirmSuggestions}
                    disabled={isAddingSuggestions}
                    className={`flex-2 px-6 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${
                        isGlass ? 'bg-purple-500 hover:bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                >
                    {isAddingSuggestions ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {isAddingSuggestions ? 'Agregando...' : `Agregar ${Object.values(selectedSuggestions).filter(Boolean).length} seleccionados`}
                </button>
            </div>
        </div>
    );
};

export default SuperListSuggestions;
