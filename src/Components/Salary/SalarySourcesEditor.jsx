import React, { useState } from 'react';
import { X, Plus, Briefcase, Trash2, Pencil } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { useSalaryState, useSalaryDispatch } from '../../context/SalaryContext';

export default function SalarySourcesEditor({ onClose, isGlass }) {
    const { sources, baseSalary } = useSalaryState();
    const { saveSources } = useSalaryDispatch();

    // Inicializamos con las fuentes existentes o con la del historial como base
    const initialSources = sources.length > 0
        ? sources
        : baseSalary > 0
            ? [{ id: 'main', label: 'Sueldo principal', amount: baseSalary }]
            : [];

    const [localSources, setLocalSources] = useState(initialSources);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [addingNew, setAddingNew] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newAmount, setNewAmount] = useState('');

    const totalIncome = localSources.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

    const startEdit = (source) => {
        setEditingId(source.id);
        setEditLabel(source.label);
        setEditAmount(String(source.amount));
    };

    const confirmEdit = () => {
        setLocalSources(prev =>
            prev.map(s => s.id === editingId
                ? { ...s, label: editLabel.trim(), amount: parseInputNumber(editAmount) }
                : s
            )
        );
        setEditingId(null);
    };

    const removeSource = (id) => {
        setLocalSources(prev => prev.filter(s => s.id !== id));
    };

    const addSource = () => {
        if (!newLabel.trim() || !newAmount) return;
        setLocalSources(prev => [...prev, {
            id: `src_${Date.now()}`,
            label: newLabel.trim(),
            amount: parseInputNumber(newAmount),
        }]);
        setNewLabel('');
        setNewAmount('');
        setAddingNew(false);
    };

    const handleSave = async () => {
        if (localSources.length === 0) return;
        setSaving(true);
        await saveSources(localSources);
        setSaving(false);
        onClose();
    };

    const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500
        ${isGlass ? 'bg-white/10 border border-white/20 text-white placeholder-white/40' : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400'}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 sm:pt-16 animate-fade-in" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div
                onClick={e => e.stopPropagation()}
                className={`relative w-full max-w-md rounded-3xl p-6 pb-10 shadow-2xl animate-scale-in max-h-[85vh] overflow-hidden flex flex-col
                    ${isGlass ? 'bg-[#12133a]/95 border border-white/10' : 'bg-white border border-gray-100'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Fuentes de ingreso</h3>
                    <button aria-label="Acción" type="button" onClick={onClose} className={`p-2 rounded-xl ${isGlass ? 'text-white/60 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'}`}>
                        <X size={18} />
                    </button>
                </div>
                <p className={`text-xs mb-5 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                    Suma de todas tus fuentes: <strong className={isGlass ? 'text-white' : 'text-gray-700'}>{formatMoney(totalIncome)}</strong>
                </p>

                {/* Lista de fuentes */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {localSources.map(source => (
                        <div key={source.id} className={`rounded-xl border p-3 ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            {editingId === source.id ? (
                                <div className="space-y-2">
                                    <input autoComplete="off" id="input-field"
                                        type="text"
                                        value={editLabel}
                                        onChange={e => setEditLabel(e.target.value)}
                                        placeholder="Nombre"
                                        className={inputClass}
                                    />
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>$</span>
                                        <input autoComplete="off" id="input-field"
                                            type="text"
                                            inputMode="numeric"
                                            value={editAmount ? formatInputNumber(editAmount) : ''}
                                            onChange={e => setEditAmount(String(parseInputNumber(e.target.value) || ''))}
                                            placeholder="Monto"
                                            className={`${inputClass} pl-7`}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button aria-label="Acción" type="button" onClick={confirmEdit} className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Listo</button>
                                        <button aria-label="Acción" type="button" onClick={() => setEditingId(null)} className={`px-4 py-2 rounded-xl text-xs font-bold ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-500'}`}>Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm font-semibold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{source.label}</p>
                                        <p className={`text-xs font-mono font-bold mt-0.5 ${isGlass ? 'text-violet-300' : 'text-violet-600'}`}>{formatMoney(source.amount)}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button aria-label="Acción" type="button" onClick={() => startEdit(source)} className={`p-2 rounded-xl ${isGlass ? 'text-white/40 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}><Pencil size={14} /></button>
                                        {localSources.length > 1 && (
                                            <button aria-label="Acción" type="button" onClick={() => removeSource(source.id)} className={`p-2 rounded-xl ${isGlass ? 'text-white/40 hover:bg-red-500/20 hover:text-red-300' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Formulario nueva fuente */}
                    {addingNew && (
                        <div className={`rounded-xl border p-3 space-y-2 ${isGlass ? 'bg-white/5 border-violet-500/40' : 'bg-violet-50 border-violet-200'}`}>
                            <input autoComplete="off" id="input-field"
                                type="text"
                                autoFocus
                                placeholder="Ej: Freelance, Alquiler cobrado..."
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                className={inputClass}
                            />
                            <div className="relative">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>$</span>
                                <input autoComplete="off" id="input-field"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Monto"
                                    value={newAmount ? formatInputNumber(newAmount) : ''}
                                    onChange={e => setNewAmount(String(parseInputNumber(e.target.value) || ''))}
                                    className={`${inputClass} pl-7`}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button aria-label="Acción" type="button" onClick={addSource} disabled={!newLabel.trim() || !newAmount} className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-40">Agregar</button>
                                <button aria-label="Acción" type="button" onClick={() => setAddingNew(false)} className={`px-4 py-2 rounded-xl text-xs font-bold ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-500'}`}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Agregar fuente */}
                {!addingNew && (
                    <button aria-label="Acción" type="button"
                        onClick={() => setAddingNew(true)}
                        className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all
                            ${isGlass ? 'border-white/20 text-white/50 hover:border-violet-500/50 hover:text-violet-300' : 'border-gray-200 text-gray-400 hover:border-violet-400 hover:text-violet-600'}`}
                    >
                        <Plus size={16} /> Agregar fuente de ingreso
                    </button>
                )}

                <button aria-label="Acción" type="button"
                    onClick={handleSave}
                    disabled={saving || localSources.length === 0}
                    className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm
                        disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-violet-500/30"
                >
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    );
}
