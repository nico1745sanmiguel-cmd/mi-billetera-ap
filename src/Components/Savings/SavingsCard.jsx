import React, { useMemo, useState } from 'react';
import { Wallet, ChevronDown, ChevronUp, Clock, Edit2, Check, X } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';

const amountFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export default function SavingsCard({ cartera, items, isGlass, privacyMode }) {
    const { addSavingsTransaction, savingsTransactions } = useSavings();
    const [showHistory, setShowHistory] = useState(false);
    
    // Estado para la edición inline
    const [editingIdx, setEditingIdx] = useState(null);
    const [editValue, setEditValue] = useState('');

    const formatAmount = (amount) => {
        if (privacyMode) return '****';
        return amountFormatter.format(amount);
    };

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const bgClass = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-md border border-gray-100';
    
    // Historial filtrado para esta cartera (últimos 5)
    const history = useMemo(() => {
        return (savingsTransactions || [])
            .filter(t => t.cartera === cartera)
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
            .slice(0, 5);
    }, [savingsTransactions, cartera]);

    const handleSaveEdit = async (item) => {
        const newValue = parseFloat(editValue.replace(',', '.'));
        if (isNaN(newValue)) {
            setEditingIdx(null);
            return;
        }

        const difference = newValue - item.cantidad;
        if (difference === 0) {
            setEditingIdx(null);
            return;
        }

        // Crear una transacción de ajuste para compensar la diferencia
        const transaction = {
            cartera: cartera,
            especie: item.especie,
            tipo: difference > 0 ? 'ingreso' : 'egreso',
            cantidad: Math.abs(difference),
            nota: 'Ajuste manual de saldo',
            fecha: new Date().toISOString()
        };

        try {
            await addSavingsTransaction(transaction);
            setEditingIdx(null);
        } catch (error) {
            console.error("Error al ajustar saldo:", error);
            alert("Hubo un error al actualizar el saldo.");
        }
    };

    return (
        <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${bgClass}`}>
            <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <Wallet size={20} className={isGlass ? 'text-white' : 'text-gray-600'} />
                    </div>
                    <h3 className={`font-black text-lg ${textColor}`}>{cartera}</h3>
                </div>

                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div key={item.id || item.especie || idx} className={`flex justify-between items-center p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <span className={`font-semibold ${textColor}`}>{item.especie}</span>
                            
                            {editingIdx === idx ? (
                                <div className="flex items-center gap-2">
                                    <input id="input-field" 
                                        type="text"
                                        inputMode="decimal"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className={`w-24 px-2 py-1 rounded text-right text-sm font-bold ${
                                            isGlass ? 'bg-black/30 text-white outline-none border border-green-500/50' : 'bg-white border border-gray-300 text-gray-800 outline-none focus:border-green-500'
                                        }`}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(item);
                                            if (e.key === 'Escape') setEditingIdx(null);
                                        }}
                                    />
                                    <button aria-label="Acción" type="button" onClick={() => handleSaveEdit(item)} className="text-green-500 hover:text-green-600 transition-colors p-1 bg-green-500/10 rounded">
                                        <Check size={16} strokeWidth={3} />
                                    </button>
                                    <button aria-label="Acción" type="button" onClick={() => setEditingIdx(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                        <X size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${textColor}`}>
                                        {formatAmount(item.cantidad)}
                                    </span>
                                    <button aria-label="Acción" type="button" 
                                        onClick={() => {
                                            setEditValue(item.cantidad.toString());
                                            setEditingIdx(idx);
                                        }}
                                        className={`p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-all ${
                                            isGlass ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-500'
                                        }`}
                                        title="Ajustar Saldo"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* BOTÓN HISTORIAL */}
            <button aria-label="Acción" type="button" 
                onClick={() => setShowHistory(!showHistory)}
                className={`w-full p-3 flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors ${
                    isGlass 
                    ? 'bg-white/5 hover:bg-white/10 text-white/70' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
                }`}
            >
                <Clock size={14} />
                {showHistory ? 'Ocultar Historial' : 'Ver últimos movimientos'}
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* HISTORIAL DESPLEGABLE */}
            {showHistory && (
                <div className={`p-4 border-t ${isGlass ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50/50'} space-y-3`}>
                    {history.length === 0 ? (
                        <p className={`text-sm text-center ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            No hay movimientos recientes.
                        </p>
                    ) : (
                        history.map((tx, idx) => (
                            <div key={tx.id || idx} className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className={`font-semibold ${tx.tipo === 'ingreso' ? 'text-green-500' : 'text-red-500'}`}>
                                        {tx.tipo === 'ingreso' ? '+' : '-'} {tx.cantidad} {tx.especie}
                                    </span>
                                    <span className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('es-AR') : 'Reciente'}
                                    </span>
                                </div>
                                {tx.nota && (
                                    <span className={`text-xs truncate max-w-[100px] text-right ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                                        {tx.nota}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
