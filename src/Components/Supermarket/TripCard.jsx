import React, { useState, useRef } from 'react';
import { Trash2, CheckCircle2, Circle } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { updateFreshDate } from '../../repositories/freshRepository';

export default function TripCard({ trip, cfg, isGlass, onDelete, onUpdateTotal, onToggleCompleted, compactView }) {
    const [editing, setEditing] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [editingDate, setEditingDate] = useState(false);
    const inputRef = useRef(null);
    const dateInputRef = useRef(null);

    const startEdit = () => {
        setInputVal(trip.total > 0 ? String(trip.total) : '');
        setEditing(true);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    const commitEdit = async () => {
        const parsed = parseInputNumber(inputVal);
        await onUpdateTotal(trip.id, parsed);
        setEditing(false);
    };

    const handleDateChange = async (e) => {
        const newDate = e.target.value;
        if (newDate) {
            await updateFreshDate(trip.id, newDate);
        }
        setEditingDate(false);
    };

    const dateLabel = trip.date
        ? new Date(trip.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        : '—';

    return (
        <div className={`flex items-center gap-2 ${compactView ? 'p-1.5' : 'p-3'} rounded-2xl border transition-all ${
            isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'
        } ${trip.completed ? 'opacity-60' : ''}`}>
            
            <button aria-label="Acción" type="button" 
                onClick={() => onToggleCompleted(trip.id, !trip.completed)}
                className={`p-1 transition-colors ${trip.completed ? 'text-emerald-500' : (isGlass ? 'text-white/20' : 'text-gray-300')}`}
            >
                {trip.completed ? <CheckCircle2 size={compactView ? 18 : 24} /> : <Circle size={compactView ? 18 : 24} />}
            </button>

            {editingDate ? (
                <input autoComplete="off" id="input-field"
                    ref={dateInputRef}
                    type="date"
                    defaultValue={trip.date || ''}
                    onChange={handleDateChange}
                    onBlur={() => setEditingDate(false)}
                    className={`${compactView ? 'w-8 h-8 text-[6px]' : 'w-11 h-11 text-[8px]'} rounded-xl flex-shrink-0 font-bold border outline-none cursor-pointer p-1 ${
                        isGlass ? 'bg-black/40 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    style={{ colorScheme: isGlass ? 'dark' : 'light' }}
                    autoFocus
                />
            ) : (
                <button aria-label="Acción" type="button"
                    onClick={() => setEditingDate(true)}
                    title="Tap para editar fecha"
                    className={`${compactView ? 'w-8 h-8' : 'w-11 h-11'} rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-center transition-opacity hover:opacity-70 active:scale-95 ${
                        isGlass ? cfg.accentGlass : cfg.accentLight
                    }`}
                >
                    <span className={`${compactView ? 'text-[8px]' : 'text-[10px]'} uppercase leading-none`}>{dateLabel.split(' ')[1]}</span>
                    <span className={`${compactView ? 'text-xs' : 'text-base'} leading-none`}>{dateLabel.split(' ')[0]}</span>
                </button>
            )}

            <div className="flex-1 min-w-0">
                <p className={`${compactView ? 'text-xs' : 'text-sm'} font-bold truncate ${isGlass ? 'text-white' : 'text-gray-800'} ${trip.completed ? 'line-through opacity-50' : ''}`}>
                    {trip.note || 'Sin nota'}
                </p>
                <p className={`text-[10px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                    {trip.completed ? 'Completado' : 'Pendiente'}
                </p>
            </div>

            {editing ? (
                <div className="flex items-center gap-2">
                    <div className={`flex items-center rounded-xl px-3 border ${compactView ? 'h-7 w-24' : 'h-9 w-32'} ${
                        isGlass ? 'bg-black/40 border-white/20' : 'bg-white border-gray-300'
                    }`}>
                        <span className={`${compactView ? 'text-xs' : 'text-sm'} mr-1 ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>$</span>
                        <input autoComplete="off" id="input-field"
                            ref={inputRef}
                            type="tel"
                            className={`w-full bg-transparent outline-none ${compactView ? 'text-xs' : 'text-sm'} font-bold text-right ${
                                isGlass ? 'text-white' : 'text-gray-800'
                            }`}
                            value={formatInputNumber(inputVal)}
                            onChange={e => setInputVal(String(parseInputNumber(e.target.value)))}
                            onBlur={commitEdit}
                            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                            enterKeyHint="done"
                        />
                    </div>
                </div>
            ) : (
                <button aria-label="Acción" type="button"
                    onClick={startEdit}
                    className={`font-mono font-bold ${compactView ? 'text-xs min-w-[60px]' : 'text-sm min-w-[80px]'} text-right px-2 py-1 rounded-xl transition-colors ${
                        trip.total > 0
                            ? (isGlass ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-50')
                            : (isGlass ? 'text-gray-500 hover:bg-white/10 border border-dashed border-white/20' : 'text-gray-300 hover:bg-gray-50 border border-dashed border-gray-200')
                    }`}
                >
                    {trip.total > 0 ? formatMoney(trip.total) : '+ precio'}
                </button>
            )}

            <button aria-label="Acción" type="button"
                onClick={() => onDelete(trip.id)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    isGlass ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                }`}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}
