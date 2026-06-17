import React, { useState } from 'react';
import { Trash2, CheckCircle2, XCircle, ShoppingBag, CreditCard, Tag } from 'lucide-react';

// Categorías válidas, las mismas que entiende la IA
const CATEGORIES = [
    "Supermercado", "Servicios", "Servicios Digitales", "Transporte", 
    "Indumentaria", "Entretenimiento", "Gastronomía", "Salud", 
    "Automotor", "Hogar", "Impuestos y Comisiones", "Pago", "Varios"
];

const StatementReviewer = ({ data, onConfirm, onCancel }) => {
    // Estado local para permitir ediciones rápidas antes de guardar
    console.log("=== DATA RECIBIDA EN STATEMENT REVIEWER ===", data);
    // Normalizamos los amounts a número para evitar bugs si la IA devuelve strings
    const [transactions, setTransactions] = useState(
        (data.transactions || []).map(tx => ({ ...tx, amount: Number(tx.amount) || 0 }))
    );
    const [summary, setSummary] = useState(data.summary || {});

    const handleDelete = (index) => {
        setTransactions(prev => prev.filter((_, i) => i !== index));
    };

    const handleCategoryChange = (index, newCategory) => {
        setTransactions(prev => {
            const newTxs = [...prev];
            newTxs[index] = { ...newTxs[index], category: newCategory };
            return newTxs;
        });
    };

    const handleConfirm = () => {
        onConfirm({ summary, transactions });
    };

    // Calculamos el total (sin contar los pagos a la tarjeta)
    const totalCalculated = transactions
        .filter(t => !t.isPayment)
        .reduce((acc, tx) => acc + (tx.amount || 0), 0);

    return (
        <div className="w-full max-w-4xl mx-auto my-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header: Resumen General */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Resumen {summary.bankName ? `de ${summary.bankName}` : ''}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Cierre: {summary.closingDate || 'No detectado'} | Vto: {summary.dueDate || 'No detectado'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Total Calculado
                        </p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                            ${totalCalculated.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabla de Transacciones */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">
                                Revisión de Gastos ({transactions.length})
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Editá la categoría o eliminá lo que la IA haya clasificado mal.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── VISTA MOBILE: tarjetas apiladas ── */}
                <div className="md:hidden max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/50">
                    {transactions.map((tx, idx) => (
                        <div key={idx} className="p-4 flex flex-col gap-3">
                            {/* Fila 1: fecha + monto + eliminar */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                    {tx.date || '-'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-base font-black ${tx.isPayment ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                        ${(tx.amount || 0).toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(idx)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Eliminar gasto"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {/* Fila 2: nombre comercio */}
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                    {tx.cleanName || tx.originalDescription}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate" title={tx.originalDescription}>
                                    {tx.originalDescription}
                                </p>
                            </div>
                            {/* Fila 3: cuota + categoría */}
                            <div className="flex items-center gap-2">
                                {tx.isInstallment && tx.installmentTotal > 1 && (
                                    <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm flex-shrink-0">
                                        {tx.installmentCurrent}/{tx.installmentTotal}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                                    <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <select
                                        value={tx.category || 'Varios'}
                                        onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 cursor-pointer w-full"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c} className="text-slate-800 bg-white dark:bg-slate-800">{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── VISTA DESKTOP: tabla original ── */}
                <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 shadow-sm">
                            <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="p-4 font-bold">Fecha</th>
                                <th className="p-4 font-bold">Comercio</th>
                                <th className="p-4 font-bold text-center">Cuota</th>
                                <th className="p-4 font-bold">Categoría</th>
                                <th className="p-4 font-bold text-right">Monto</th>
                                <th className="p-4 font-bold text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {transactions.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {tx.date || '-'}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {tx.cleanName || tx.originalDescription}
                                        </p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[200px]" title={tx.originalDescription}>
                                            {tx.originalDescription}
                                        </p>
                                    </td>
                                    <td className="p-4 text-center">
                                        {tx.isInstallment && tx.installmentTotal > 1 ? (
                                            <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">
                                                {tx.installmentCurrent}/{tx.installmentTotal}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                                            <select 
                                                value={tx.category || 'Varios'}
                                                onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 cursor-pointer w-full"
                                            >
                                                {CATEGORIES.map(c => (
                                                    <option key={c} value={c} className="text-slate-800 bg-white dark:bg-slate-800">{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`text-sm font-bold ${tx.isPayment ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            ${(tx.amount || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleDelete(idx)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Eliminar gasto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Actions */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button 
                        onClick={onCancel}
                        className="flex items-center gap-2 px-6 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800"
                    >
                        <XCircle className="w-5 h-5" />
                        Descartar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Confirmar y Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatementReviewer;
