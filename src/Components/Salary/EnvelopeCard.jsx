import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatMoney } from '../../utils';
import { ENVELOPE_ICONS, ENVELOPE_COLORS } from './EnvelopeEditor';

export default function EnvelopeCard({ envelope, isGlass, onEdit, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const icon = ENVELOPE_ICONS.find(i => i.id === envelope.iconId) || ENVELOPE_ICONS.find(i => i.id === 'other');
    const color = ENVELOPE_COLORS.find(c => c.id === envelope.colorId) || ENVELOPE_COLORS[0];

    const budgeted = Number(envelope.budgeted) || 0;

    return (
        <div
            className={`relative rounded-2xl p-4 border transition-all group
                ${isGlass
                    ? 'bg-white/5 border-white/10 hover:bg-white/8'
                    : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
        >
            <div className="flex items-center gap-3">
                {/* Ícono */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${color.from} ${color.to} shadow-md flex-shrink-0`}>
                    {icon.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                        {envelope.label}
                    </p>
                    <p className={`text-xs font-mono font-bold mt-0.5 bg-gradient-to-r ${color.from} ${color.to} bg-clip-text text-transparent`}>
                        {formatMoney(budgeted)}
                    </p>
                </div>

                {/* Acciones */}
                <div className={`flex items-center gap-1 transition-opacity ${confirmDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {!confirmDelete ? (
                        <>
                            <button type="button"
                                onClick={() => onEdit(envelope)}
                                className={`p-2 rounded-xl transition-colors ${isGlass ? 'text-white/40 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                            >
                                <Pencil size={14} />
                            </button>
                            <button type="button"
                                onClick={() => setConfirmDelete(true)}
                                className={`p-2 rounded-xl transition-colors ${isGlass ? 'text-white/40 hover:bg-red-500/20 hover:text-red-300' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-1">
                            <button type="button"
                                onClick={() => { onDelete(envelope.id); setConfirmDelete(false); }}
                                className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold"
                            >
                                Eliminar
                            </button>
                            <button type="button"
                                onClick={() => setConfirmDelete(false)}
                                className={`px-2 py-1.5 rounded-xl text-xs font-bold ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-500'}`}
                            >
                                No
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
