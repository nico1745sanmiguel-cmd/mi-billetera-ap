import React, { useState, useMemo } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';

export default function AssetPricesPanel({ isGlass }) {
    const { assetPrices, saveManualPrice, savingsTransactions } = useSavings();
    const { dolarBlue } = useFinancial();
    const [editing, setEditing] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [loading, setLoading] = useState(false);

    // Identificar especies actuales en cartera (excluyendo fiat nativo si queremos)
    const especiesUnicas = useMemo(() => {
        const set = new Set();
        (savingsTransactions || []).forEach(tx => {
            if (tx.especie && tx.especie !== 'USD' && tx.especie !== 'ARS') {
                set.add(tx.especie);
            }
        });
        return Array.from(set);
    }, [savingsTransactions]);

    const handleSave = async (especie) => {
        if (!editValue || isNaN(parseFloat(editValue))) return;
        setLoading(true);
        try {
            await saveManualPrice(especie, editValue);
            setEditing(null);
            setEditValue('');
        } catch (e) {
            alert('Error al guardar precio');
        }
        setLoading(false);
    };

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';

    if (especiesUnicas.length === 0) {
        return null;
    }

    return (
        <div className={`rounded-3xl p-6 ${cardBg}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isGlass ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <RefreshCw size={20} />
                </div>
                <div>
                    <h3 className={`font-bold ${textColor}`}>Precios de Activos</h3>
                    <p className={`text-xs ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        Actualizá los precios manualmente si la cotización automática falla.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {especiesUnicas.map(esp => {
                    const price = assetPrices[esp] || 0;
                    const isEditing = editing === esp;

                    return (
                        <div key={esp} className={`flex items-center justify-between p-3 rounded-xl ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                            <span className={`font-bold ${textColor}`}>{esp}</span>
                            
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <div className="relative">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>$</span>
                                            <input 
                                                type="number"
                                                step="any"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className={`w-28 pl-6 p-1.5 rounded-lg text-sm font-bold outline-none border transition-all ${
                                                    isGlass ? 'bg-black/20 text-white border-white/20 focus:border-blue-400' : 'bg-white text-gray-800 border-gray-200 focus:border-blue-500'
                                                }`}
                                                autoFocus
                                            />
                                        </div>
                                        <button aria-label="Acción" type="button" onClick={() => handleSave(esp)} disabled={loading} className={`p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all ${loading ? 'opacity-50' : ''}`}>
                                            <Save size={16} />
                                        </button>
                                        <button aria-label="Acción" type="button" onClick={() => { setEditing(null); setEditValue(''); }} className="text-xs opacity-60 hover:opacity-100">
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <div 
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-100 text-gray-800 shadow-sm border border-gray-100'}`}
                                        onClick={() => { setEditing(esp); setEditValue(price); }}
                                        title="Tocar para editar"
                                    >
                                        U$D {price.toLocaleString('es-AR', { maximumFractionDigits: 4 })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {dolarBlue && (
                <p className={`text-xs mt-4 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                    Para CEDEARs o acciones locales, se estima el valor USD usando Dólar Blue (${dolarBlue}).
                </p>
            )}
        </div>
    );
}
