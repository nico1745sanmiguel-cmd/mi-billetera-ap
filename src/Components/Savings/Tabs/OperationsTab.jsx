import React, { useState } from 'react';
import { useSavings } from '../../../context/SavingsContext';
import { Search, Filter } from 'lucide-react';

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function OperationsTab({ isGlass, privacyMode }) {
    const { savingsTransactions } = useSavings();
    const [filterEspecie, setFilterEspecie] = useState('');
    const [filterCartera, setFilterCartera] = useState('');

    const formatAmount = (amount, formatter) => privacyMode ? '****' : formatter.format(amount);

    const sortedHistory = [...(savingsTransactions || [])].sort((a, b) => {
        const dateA = new Date(a.fecha || a.createdAt?.toDate?.() || 0);
        const dateB = new Date(b.fecha || b.createdAt?.toDate?.() || 0);
        return dateB - dateA;
    });

    const filtered = sortedHistory.filter(tx => {
        if (filterEspecie && tx.especie !== filterEspecie) return false;
        if (filterCartera && tx.cartera !== filterCartera) return false;
        return true;
    });

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';
    const inputClasses = `p-2 rounded-xl border text-sm outline-none transition-all ${
        isGlass 
        ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-green-400' 
        : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500 focus:bg-white'
    }`;

    // Opciones para filtros
    const carteras = Array.from(new Set((savingsTransactions || []).map(t => t.cartera).filter(Boolean)));
    const especies = Array.from(new Set((savingsTransactions || []).map(t => t.especie).filter(Boolean)));

    return (
        <div className={`rounded-3xl p-6 ${cardBg} animate-fade-in`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                    Historial de Operaciones
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-32">
                        <select 
                            value={filterCartera} 
                            onChange={(e) => setFilterCartera(e.target.value)}
                            className={`w-full appearance-none pr-8 ${inputClasses}`}
                        >
                            <option value="">Todas las carteras</option>
                            {carteras.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                    <div className="relative flex-1 sm:w-32">
                        <select 
                            value={filterEspecie} 
                            onChange={(e) => setFilterEspecie(e.target.value)}
                            className={`w-full appearance-none pr-8 ${inputClasses}`}
                        >
                            <option value="">Todas las especies</option>
                            {especies.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                    <p className={isGlass ? 'text-white' : 'text-gray-500'}>No hay operaciones para mostrar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(tx => {
                        const date = tx.fecha ? new Date(tx.fecha) : (tx.createdAt?.toDate?.() || new Date());
                        const isIngreso = tx.tipo === 'compra' || tx.tipo === 'deposito' || tx.tipo === 'ingreso';
                        const formatter = tx.monedaPrecio === 'ARS' ? arsFormatter : usdFormatter;
                        const total = (parseFloat(tx.cantidad) || 0) * (parseFloat(tx.precioUnitario) || 0);

                        return (
                            <div key={tx.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                isGlass ? 'hover:bg-white/5 border border-transparent hover:border-white/10' : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
                            }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 p-2 rounded-full ${
                                        isIngreso 
                                        ? 'bg-green-500/20 text-green-500' 
                                        : 'bg-red-500/20 text-red-500'
                                    }`}>
                                        <span className="text-xs font-bold uppercase block w-10 text-center leading-none tracking-tighter">
                                            {tx.tipo.substring(0,4)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${textColor}`}>{tx.especie}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-md ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'}`}>
                                                {tx.cartera}
                                            </span>
                                        </div>
                                        <div className={`text-xs mt-1 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                                            {date.toLocaleDateString('es-AR')} • {tx.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })} unidades
                                            {tx.precioUnitario > 0 && ` a ${formatter.format(tx.precioUnitario)} c/u`}
                                        </div>
                                    </div>
                                </div>
                                
                                {tx.precioUnitario > 0 && (
                                    <div className="text-right">
                                        <span className={`font-bold text-sm block ${isIngreso ? 'text-green-500' : 'text-red-500'}`}>
                                            {isIngreso ? '-' : '+'}{formatAmount(total, formatter)}
                                        </span>
                                        {tx.nota && <span className={`text-xs opacity-60 block mt-0.5 truncate max-w-[150px]`}>{tx.nota}</span>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
