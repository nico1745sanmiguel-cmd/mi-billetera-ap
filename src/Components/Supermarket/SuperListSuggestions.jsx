import React from 'react';
import { Sparkles, Check, Plus } from 'lucide-react';
import { formatMoney } from '../../utils';
import Button from '../UI/Button';

const SuperListSuggestions = ({ 
    prediction, selectedSuggestions, setSelectedSuggestions, 
    setShowSuggestions, handleConfirmSuggestions, isAddingSuggestions, isGlass 
}) => {
    const selectedCount = Object.values(selectedSuggestions).filter(Boolean).length;

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
                        <button
                            aria-label={isSelected ? `Deseleccionar sugerencia ${s.name}` : `Seleccionar sugerencia ${s.name}`}
                            key={key}
                            type="button"
                            onClick={() => setSelectedSuggestions(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`w-full min-h-[44px] flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
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
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowSuggestions(false)}
                    aria-label="Ignorar sugerencias de compras"
                    className="flex-1"
                >
                    Ignorar
                </Button>
                <Button
                    variant="primary"
                    size="md"
                    onClick={handleConfirmSuggestions}
                    isLoading={isAddingSuggestions}
                    leftIcon={<Plus size={16} />}
                    aria-label={`Agregar ${selectedCount} sugerencias a la lista`}
                    className="flex-[2] !bg-purple-600 hover:!bg-purple-700 !shadow-purple-500/20"
                >
                    {`Agregar ${selectedCount} seleccionados`}
                </Button>
            </div>
        </div>
    );
};

export default SuperListSuggestions;
