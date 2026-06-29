import React, { useState } from 'react';
import { X, Briefcase, Tag, Palette } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';

// Íconos de categoría disponibles para los sobres
const ENVELOPE_ICONS = [
    { id: 'home', emoji: '🏠', label: 'Vivienda' },
    { id: 'food', emoji: '🛒', label: 'Comida' },
    { id: 'transport', emoji: '🚌', label: 'Transporte' },
    { id: 'health', emoji: '💊', label: 'Salud' },
    { id: 'education', emoji: '📚', label: 'Educación' },
    { id: 'leisure', emoji: '🎬', label: 'Ocio' },
    { id: 'clothing', emoji: '👕', label: 'Ropa' },
    { id: 'savings', emoji: '🏦', label: 'Ahorro' },
    { id: 'gift', emoji: '🎁', label: 'Regalos' },
    { id: 'pet', emoji: '🐾', label: 'Mascotas' },
    { id: 'tech', emoji: '💻', label: 'Tecnología' },
    { id: 'other', emoji: '📦', label: 'Otro' },
];

const ENVELOPE_COLORS = [
    { id: 'violet', from: 'from-violet-500', to: 'to-indigo-600', bg: 'bg-violet-500' },
    { id: 'emerald', from: 'from-emerald-500', to: 'to-teal-600', bg: 'bg-emerald-500' },
    { id: 'amber', from: 'from-amber-500', to: 'to-orange-500', bg: 'bg-amber-500' },
    { id: 'rose', from: 'from-rose-500', to: 'to-pink-600', bg: 'bg-rose-500' },
    { id: 'blue', from: 'from-blue-500', to: 'to-indigo-500', bg: 'bg-blue-500' },
    { id: 'cyan', from: 'from-cyan-500', to: 'to-blue-500', bg: 'bg-cyan-500' },
    { id: 'lime', from: 'from-lime-500', to: 'to-green-500', bg: 'bg-lime-500' },
    { id: 'fuchsia', from: 'from-fuchsia-500', to: 'to-purple-600', bg: 'bg-fuchsia-500' },
];

export { ENVELOPE_ICONS, ENVELOPE_COLORS };

export default function EnvelopeEditor({ envelope, onSave, onClose, isGlass }) {
    const isNew = !envelope?.id;

    const [label, setLabel] = useState(envelope?.label || '');
    const [budgeted, setBudgeted] = useState(envelope?.budgeted ? String(envelope.budgeted) : '');
    const [selectedIcon, setSelectedIcon] = useState(envelope?.iconId || 'other');
    const [selectedColor, setSelectedColor] = useState(envelope?.colorId || 'violet');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!label.trim() || !budgeted) return;
        setSaving(true);
        const data = {
            id: envelope?.id || `env_${Date.now()}`,
            label: label.trim(),
            budgeted: parseInputNumber(budgeted),
            iconId: selectedIcon,
            colorId: selectedColor,
        };
        await onSave(data);
        setSaving(false);
        onClose();
    };

    const base = isGlass
        ? 'bg-white/10 border border-white/20 text-white placeholder-white/40'
        : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400';

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                onClick={e => e.stopPropagation()}
                className={`relative w-full max-w-md rounded-t-3xl p-6 pb-10 shadow-2xl transition-all
                    ${isGlass ? 'bg-[#12133a]/95 border-t border-white/10' : 'bg-white border-t border-gray-100'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                        {isNew ? 'Nuevo sobre' : 'Editar sobre'}
                    </h3>
                    <button onClick={onClose} className={`p-2 rounded-xl ${isGlass ? 'text-white/60 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'}`}>
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Nombre */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            <Tag size={11} className="inline mr-1" />Nombre
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Alquiler, Ocio, Farmacia..."
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${base}`}
                        />
                    </div>

                    {/* Monto */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            <Briefcase size={11} className="inline mr-1" />Monto asignado
                        </label>
                        <div className="relative">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>$</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={budgeted ? formatInputNumber(budgeted) : ''}
                                onChange={e => setBudgeted(String(parseInputNumber(e.target.value) || ''))}
                                className={`w-full pl-8 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${base}`}
                            />
                        </div>
                    </div>

                    {/* Ícono */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            Ícono
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {ENVELOPE_ICONS.map(ic => (
                                <button
                                    key={ic.id}
                                    onClick={() => setSelectedIcon(ic.id)}
                                    title={ic.label}
                                    className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all
                                        ${selectedIcon === ic.id
                                            ? 'ring-2 ring-violet-500 scale-110 bg-violet-500/20'
                                            : (isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')}`}
                                >
                                    {ic.emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            <Palette size={11} className="inline mr-1" />Color
                        </label>
                        <div className="flex gap-3 flex-wrap">
                            {ENVELOPE_COLORS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedColor(c.id)}
                                    className={`w-8 h-8 rounded-full ${c.bg} transition-all
                                        ${selectedColor === c.id ? 'ring-2 ring-offset-2 scale-110 ring-violet-400' : 'opacity-60 hover:opacity-100'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Botón guardar */}
                <button
                    onClick={handleSave}
                    disabled={!label.trim() || !budgeted || saving}
                    className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm
                        disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg shadow-violet-500/30"
                >
                    {saving ? 'Guardando...' : isNew ? 'Crear sobre' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    );
}
