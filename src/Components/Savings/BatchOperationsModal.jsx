import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, ArrowDownRight, ArrowUpRight, CheckSquare, Square, Loader2 } from 'lucide-react';
import { useSavings } from '../../savings/context/SavingsContext';
import { useUI } from '../../context/UIContext';

// Movimientos detectados de Balanz y Nexo listos para confirmar
const DETECTED_OPERATIONS = [
    {
        id: 'balanz-retiro-ars',
        tipo: 'retiro',
        cartera: 'Balanz',
        especie: 'ARS',
        cantidad: 603023.99,
        precioUnitario: 1,
        monedaPrecio: 'ARS',
        fecha: '2026-09-11T12:00:00.000Z',
        fechaDisplay: '11 sep 2026',
        nota: 'Extracción a Naranja X / Nexo',
        totalDisplay: '$ 603.023,99 ARS'
    },
    {
        id: 'nexo-deposito-usdt',
        tipo: 'deposito',
        cartera: 'Nexo',
        especie: 'USDT',
        cantidad: 375.973194,
        precioUnitario: 1,
        monedaPrecio: 'USDT',
        fecha: '2026-09-11T12:00:00.000Z',
        fechaDisplay: '11 sep 2026',
        nota: 'Fondeo desde ARS (Conversión Nexo)',
        totalDisplay: '+375.97 USDT'
    },
    {
        id: 'nexo-compra-ge',
        tipo: 'compra',
        cartera: 'Nexo',
        especie: 'GE',
        cantidad: 0.507250089,
        precioUnitario: 315.4063,
        monedaPrecio: 'USD',
        fecha: '2026-09-15T12:00:00.000Z',
        fechaDisplay: '15 sep 2026',
        nota: 'Compra General Electric (159.99 USDT)',
        totalDisplay: '0.5072 GE a $315.41 USD'
    },
    {
        id: 'nexo-compra-amat',
        tipo: 'compra',
        cartera: 'Nexo',
        especie: 'AMAT',
        cantidad: 0.374853286,
        precioUnitario: 426.8068,
        monedaPrecio: 'USD',
        fecha: '2026-09-15T12:00:00.000Z',
        fechaDisplay: '15 sep 2026',
        nota: 'Compra Applied Materials (159.99 USDT)',
        totalDisplay: '0.3748 AMAT a $426.81 USD'
    },
    {
        id: 'nexo-venta-btc',
        tipo: 'venta',
        cartera: 'Nexo',
        especie: 'BTC',
        cantidad: 0.00220697,
        precioUnitario: 74431.63,
        monedaPrecio: 'USD',
        fecha: '2026-09-15T12:00:00.000Z',
        fechaDisplay: '15 sep 2026',
        nota: 'Venta BTC (+163.78 USDT liquidez)',
        totalDisplay: '0.002207 BTC a $74,431.63 USD'
    },
    {
        id: 'nexo-compra-mcd',
        tipo: 'compra',
        cartera: 'Nexo',
        especie: 'MCD',
        cantidad: 0.590507112,
        precioUnitario: 254.0019,
        monedaPrecio: 'USD',
        fecha: '2026-09-16T12:00:00.000Z',
        fechaDisplay: '16 sep 2026',
        nota: 'Compra McDonald\'s (149.99 USDT)',
        totalDisplay: '0.5905 MCD a $254.00 USD'
    }
];

const TIPO_BADGE = {
    compra: { label: 'Compra', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: ArrowDownRight },
    venta: { label: 'Venta', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: ArrowUpRight },
    deposito: { label: 'Depósito', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', icon: ArrowDownRight },
    retiro: { label: 'Retiro', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: ArrowUpRight }
};

export default function BatchOperationsModal({ onClose, isGlass = true }) {
    const { addBatchSavingsTransactions } = useSavings();
    const { showToast } = useUI();
    const [selectedIds, setSelectedIds] = useState(() => new Set(DETECTED_OPERATIONS.map(op => op.id)));
    const [loading, setLoading] = useState(false);

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === DETECTED_OPERATIONS.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(DETECTED_OPERATIONS.map(op => op.id)));
        }
    };

    const handleConfirm = async () => {
        const opsToSave = DETECTED_OPERATIONS.filter(op => selectedIds.has(op.id)).map(({ id, fechaDisplay, totalDisplay, ...payload }) => payload);

        if (opsToSave.length === 0) {
            showToast('Seleccioná al menos una operación para registrar', 'warning');
            return;
        }

        setLoading(true);
        try {
            await addBatchSavingsTransactions(opsToSave);
            showToast(`¡${opsToSave.length} operaciones registradas con éxito!`, 'success');
            onClose();
        } catch (error) {
            console.error('Error al guardar lote de operaciones:', error);
            showToast('Error al registrar las operaciones en lote', 'error');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

            {/* Modal Box */}
            <div className={`relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-scale-in border ${
                isGlass 
                    ? 'bg-[#0f0c29]/95 text-white border-white/20 backdrop-blur-2xl' 
                    : 'bg-white text-gray-900 border-gray-100 shadow-xl'
            }`}>
                
                {/* Header */}
                <div className={`p-6 border-b flex items-start justify-between gap-4 ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-400 text-white shadow-lg shadow-green-500/30">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-tight">
                                Carga Rápida de Operaciones
                            </h2>
                            <p className={`text-xs mt-0.5 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                                Revisá y confirmá los 6 movimientos detectados de tus cuentas.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar modal"
                        className={`p-2 rounded-full transition-colors ${
                            isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar de selección */}
                <div className={`px-6 py-2.5 flex items-center justify-between text-xs font-semibold border-b ${
                    isGlass ? 'border-white/5 bg-white/5 text-white/70' : 'border-gray-100 bg-gray-50 text-gray-600'
                }`}>
                    <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                        {selectedIds.size === DETECTED_OPERATIONS.length ? (
                            <CheckSquare size={16} className="text-green-500" />
                        ) : (
                            <Square size={16} />
                        )}
                        <span>{selectedIds.size === DETECTED_OPERATIONS.length ? 'Deseleccionar todo' : 'Seleccionar todo'}</span>
                    </button>

                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        {selectedIds.size} de {DETECTED_OPERATIONS.length} seleccionadas
                    </span>
                </div>

                {/* Lista con scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {DETECTED_OPERATIONS.map(op => {
                        const isSelected = selectedIds.has(op.id);
                        const badge = TIPO_BADGE[op.tipo] || TIPO_BADGE.compra;
                        const BadgeIcon = badge.icon;

                        return (
                            <div
                                key={op.id}
                                onClick={() => toggleSelect(op.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-3.5 ${
                                    isSelected
                                        ? isGlass 
                                            ? 'bg-white/10 border-green-500/50 shadow-md shadow-green-500/5' 
                                            : 'bg-green-50/50 border-green-300 shadow-sm'
                                        : isGlass
                                            ? 'bg-white/5 border-white/10 opacity-50 hover:opacity-80'
                                            : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
                                }`}
                            >
                                {/* Checkbox */}
                                <div className="shrink-0 text-green-500">
                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} className={isGlass ? 'text-white/40' : 'text-gray-400'} />}
                                </div>

                                {/* Icono tipo */}
                                <div className={`p-2 rounded-xl border shrink-0 ${badge.color}`}>
                                    <BadgeIcon size={16} />
                                </div>

                                {/* Detalles */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm tracking-tight">{op.especie}</span>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                                isGlass ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {op.cartera}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-semibold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                            {op.fechaDisplay}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-1 text-xs">
                                        <p className={`truncate font-normal ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                                            {op.nota}
                                        </p>
                                        <span className="font-bold text-xs shrink-0 ml-2">
                                            {op.totalDisplay}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer de acción */}
                <div className={`p-6 border-t flex items-center justify-end gap-3 ${
                    isGlass ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'
                }`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                            isGlass ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || selectedIds.size === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Guardando en tu cuenta...</span>
                            </>
                        ) : (
                            <>
                                <Check size={18} strokeWidth={3} />
                                <span>Confirmar e Ingresar ({selectedIds.size})</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}
