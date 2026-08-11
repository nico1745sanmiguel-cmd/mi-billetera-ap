import React, { useState, useMemo } from 'react';
import { useSavings } from '../../../context/SavingsContext';
import { Search, Filter, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCcw, Wallet, Tag, ArrowRight } from 'lucide-react';
import OperationModal from '../OperationModal';

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const TIPO_CONFIG = {
    compra: { label: 'Compra', icon: ArrowDownRight, color: 'text-green-500', bg: 'bg-green-500/10' },
    venta: { label: 'Venta', icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' },
    deposito: { label: 'Depósito', icon: ArrowDownRight, color: 'text-green-500', bg: 'bg-green-500/10' },
    retiro: { label: 'Retiro', icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' },
    cobro_cupon: { label: 'Cupón', icon: ArrowDownRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    amortizacion: { label: 'Amort.', icon: ArrowDownRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ajuste: { label: 'Ajuste', icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    caucion: { label: 'Caución', icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ingreso: { label: 'Ingreso', icon: ArrowDownRight, color: 'text-green-500', bg: 'bg-green-500/10' },
    egreso: { label: 'Egreso', icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' }
};

export default function OperationsTab({ isGlass, privacyMode }) {
    const { savingsTransactions, deleteSavingsTransaction } = useSavings();
    const [filterEspecie, setFilterEspecie] = useState('');
    const [filterCartera, setFilterCartera] = useState('');
    const [editingTx, setEditingTx] = useState(null);

    const formatAmount = (amount, formatter) => privacyMode ? '****' : formatter.format(amount);

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que querés eliminar esta operación?')) {
            await deleteSavingsTransaction(id);
        }
    };

    const sortedHistory = useMemo(() => {
        return (savingsTransactions || []).toSorted((a, b) => {
            const dateA = new Date(a.fecha || a.createdAt?.toDate?.() || 0);
            const dateB = new Date(b.fecha || b.createdAt?.toDate?.() || 0);
            return dateB - dateA;
        });
    }, [savingsTransactions]);

    const filtered = useMemo(() => {
        return sortedHistory.filter(tx => {
            if (filterEspecie && tx.especie !== filterEspecie) return false;
            if (filterCartera && tx.cartera !== filterCartera) return false;
            return true;
        });
    }, [sortedHistory, filterEspecie, filterCartera]);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';
    const secondaryTextColor = isGlass ? 'text-white/60' : 'text-gray-500';

    const carteras = Array.from(new Set((savingsTransactions || []).flatMap(t => t.cartera ? [t.cartera] : [])));
    const especies = Array.from(new Set((savingsTransactions || []).flatMap(t => t.especie ? [t.especie] : [])));

    return (
        <div className={`rounded-3xl p-6 sm:p-8 ${cardBg} animate-fade-in`}>
            
            <div className="mb-8">
                <h3 className={`font-bold flex items-center gap-2 mb-6 ${textColor}`}>
                    Historial de Operaciones
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        {filtered.length}
                    </span>
                </h3>

                {/* FILTROS TIPO CHIP (Scrollable horizontal) */}
                <div className="space-y-4">
                    {/* Filtro Carteras */}
                    {carteras.length > 0 && (
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider shrink-0 ${secondaryTextColor}`}>
                                <Wallet size={14} /> Cartera
                            </div>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                <button 
                                    onClick={() => setFilterCartera('')}
                                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        !filterCartera 
                                            ? (isGlass ? 'bg-white text-black' : 'bg-gray-800 text-white')
                                            : (isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600')
                                    }`}
                                >
                                    Todas
                                </button>
                                {carteras.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setFilterCartera(c)}
                                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            filterCartera === c
                                                ? (isGlass ? 'bg-white text-black' : 'bg-gray-800 text-white')
                                                : (isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600')
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filtro Especies */}
                    {especies.length > 0 && (
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider shrink-0 ${secondaryTextColor}`}>
                                <Tag size={14} /> Activo
                            </div>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                <button 
                                    onClick={() => setFilterEspecie('')}
                                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        !filterEspecie 
                                            ? (isGlass ? 'bg-white text-black' : 'bg-gray-800 text-white')
                                            : (isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600')
                                    }`}
                                >
                                    Todos
                                </button>
                                {especies.map(e => (
                                    <button 
                                        key={e}
                                        onClick={() => setFilterEspecie(e)}
                                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            filterEspecie === e
                                                ? (isGlass ? 'bg-white text-black' : 'bg-gray-800 text-white')
                                                : (isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600')
                                        }`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed rounded-3xl opacity-60">
                    <p className={isGlass ? 'text-white' : 'text-gray-500'}>No se encontraron operaciones con los filtros actuales.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(tx => {
                        const date = tx.fecha ? new Date(tx.fecha) : (tx.createdAt?.toDate?.() || new Date());
                        const formatter = tx.monedaPrecio === 'ARS' ? arsFormatter : usdFormatter;
                        const total = (parseFloat(tx.cantidad) || 0) * (parseFloat(tx.precioUnitario) || 0);
                        
                        const config = TIPO_CONFIG[tx.tipo] || { label: tx.tipo, icon: ArrowRight, color: 'text-gray-500', bg: 'bg-gray-500/10' };
                        const IconComponent = config.icon;

                        return (
                            <div key={tx.id} className={`group relative p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all cursor-default ${
                                isGlass ? 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20' : 'bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-300 hover:shadow-md'
                            }`}>
                                
                                {/* ── LADO IZQUIERDO: ICONO + DETALLES ── */}
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${config.bg} ${config.color}`}>
                                        <IconComponent size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-black text-lg leading-none ${textColor}`}>{tx.especie}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-500'}`}>
                                                {tx.cartera}
                                            </span>
                                        </div>
                                        <div className={`text-xs font-semibold ${secondaryTextColor}`}>
                                            <span className={`${config.color} font-black uppercase tracking-wider`}>{config.label}</span>
                                            <span className="mx-1.5 opacity-50">•</span>
                                            {date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* ── LADO DERECHO: MONTOS Y ACCIONES ── */}
                                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                                    
                                    <div className="text-left sm:text-right flex-1 sm:flex-none">
                                        {tx.precioUnitario > 0 ? (
                                            <>
                                                <div className={`text-lg font-black leading-tight ${textColor}`}>
                                                    {formatAmount(total, formatter)}
                                                </div>
                                                <div className={`text-[11px] font-bold mt-0.5 ${secondaryTextColor}`}>
                                                    {tx.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })} unidades @ {formatter.format(tx.precioUnitario)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className={`text-lg font-black leading-tight ${textColor}`}>
                                                {tx.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })} unidades
                                            </div>
                                        )}
                                        {tx.nota && (
                                            <div className={`text-[10px] font-semibold italic mt-1 truncate max-w-[200px] ${secondaryTextColor}`}>
                                                "{tx.nota}"
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Botones de acción: siempre visibles en mobile, on-hover en desktop */}
                                    <div className={`flex sm:flex-col gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        <button 
                                            onClick={() => setEditingTx(tx)} 
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(tx.id)} 
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                isGlass ? 'bg-red-500/20 hover:bg-red-500/40 text-red-300' : 'bg-red-50 hover:bg-red-100 text-red-500'
                                            }`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {editingTx && (
                <OperationModal 
                    initialData={editingTx} 
                    onClose={() => setEditingTx(null)} 
                    isGlass={isGlass} 
                />
            )}
        </div>
    );
}
