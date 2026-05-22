import React, { useMemo, useState } from 'react';
import { Wallet, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export default function SavingsCard({ cartera, items, isGlass, privacyMode, dolarBlue, customQuotes }) {
    const { savingsTransactions } = useFinancial();
    const [showHistory, setShowHistory] = useState(false);

    const formatAmount = (amount) => {
        if (privacyMode) return '****';
        return new Intl.NumberFormat('es-AR', {
            maximumFractionDigits: 2
        }).format(amount);
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
                        <div key={idx} className={`flex justify-between items-center p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <span className={`font-semibold ${textColor}`}>{item.especie}</span>
                            <span className={`font-bold ${textColor}`}>
                                {formatAmount(item.cantidad)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* BOTÓN HISTORIAL */}
            <button 
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
                            <div key={idx} className="flex justify-between items-center text-sm">
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
