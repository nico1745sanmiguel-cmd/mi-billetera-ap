import React, { useState, useRef } from 'react';
import { Trash2, CheckCircle2, Circle } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { updateFreshDate } from '../../repositories/freshRepository';
import { useUIDispatch } from '../../context/UIContext';

export default function TripCard({ trip, cfg, isGlass, onDelete, onUpdateTotal, onToggleCompleted, compactView }) {
    const [editing, setEditing] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [editingDate, setEditingDate] = useState(false);
    const inputRef = useRef(null);
    const dateInputRef = useRef(null);
    const isCancellingRef = useRef(false);
    const { showToast } = useUIDispatch();

    const startEdit = () => {
        isCancellingRef.current = false;
        setInputVal(trip.total > 0 ? String(trip.total) : '');
        setEditing(true);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    const commitEdit = async () => {
        if (isCancellingRef.current) {
            isCancellingRef.current = false;
            return;
        }

        const parsed = parseInputNumber(inputVal);
        if (!inputVal || parsed <= 0) {
            setInputVal(trip.total > 0 ? String(trip.total) : '');
            setEditing(false);
            showToast('El monto debe ser mayor a 0', 'warning');
            return;
        }

        if (parsed === Number(trip.total)) {
            setEditing(false);
            return;
        }

        try {
            await onUpdateTotal(trip.id, parsed);
            showToast('Monto actualizado', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error al actualizar total', 'error');
        }
        setEditing(false);
    };

    const handleDateChange = async (e) => {
        const newDate = e.target.value;
        if (!newDate || isNaN(new Date(newDate + 'T12:00:00').getTime())) {
            showToast('Seleccioná una fecha válida', 'warning');
            setEditingDate(false);
            return;
        }
        try {
            await updateFreshDate(trip.id, newDate);
            showToast('Fecha actualizada', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error al actualizar la fecha', 'error');
        }
        setEditingDate(false);
    };

    const { dateDay, dateMonth, dateLabel } = React.useMemo(() => {
        if (!trip.date) return { dateDay: '—', dateMonth: '', dateLabel: '—' };
        const d = new Date(trip.date + 'T12:00:00');
        if (isNaN(d.getTime())) return { dateDay: '—', dateMonth: '', dateLabel: '—' };
        const formatted = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
        const parts = formatted.split(' ');
        const day = parts[0] || '—';
        const month = parts[1] || '';
        return {
            dateDay: day,
            dateMonth: month,
            dateLabel: month ? `${day} ${month}` : day
        };
    }, [trip.date]);

    return (
        <div className={`flex items-center gap-2 ${compactView ? 'p-1.5' : 'p-3'} rounded-2xl border transition-all ${
            isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'
        } ${trip.completed ? 'opacity-60' : ''}`}>
            
            <button
                aria-label={trip.completed ? `Marcar ${trip.note || 'compra'} como pendiente` : `Marcar ${trip.note || 'compra'} como completada`}
                type="button" 
                onClick={() => onToggleCompleted(trip.id, !trip.completed)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 rounded-xl transition-colors ${
                    trip.completed ? 'text-emerald-500' : (isGlass ? 'text-white/20 hover:text-white/50' : 'text-gray-300 hover:text-gray-500')
                }`}
            >
                {trip.completed ? <CheckCircle2 size={compactView ? 20 : 24} /> : <Circle size={compactView ? 20 : 24} />}
            </button>

            {editingDate ? (
                <input
                    autoComplete="off"
                    id={`trip-date-${trip.id}`}
                    aria-label="Seleccionar fecha"
                    ref={dateInputRef}
                    type="date"
                    defaultValue={trip.date || ''}
                    onChange={handleDateChange}
                    onBlur={() => setEditingDate(false)}
                    className={`min-w-[44px] min-h-[44px] w-11 h-11 text-[8px] rounded-xl flex-shrink-0 font-bold border outline-none cursor-pointer p-1 ${
                        isGlass ? 'bg-black/40 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    style={{ colorScheme: isGlass ? 'dark' : 'light' }}
                    autoFocus
                />
            ) : (
                <button
                    aria-label={`Fecha de compra: ${dateLabel}. Tocar para cambiar fecha`}
                    type="button"
                    onClick={() => setEditingDate(true)}
                    title="Tap para editar fecha"
                    className={`min-w-[44px] min-h-[44px] px-1.5 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-center transition-opacity hover:opacity-70 active:scale-95 ${
                        isGlass ? cfg.accentGlass : cfg.accentLight
                    }`}
                >
                    <span className="text-[10px] uppercase leading-none">{dateMonth}</span>
                    <span className="text-sm leading-none">{dateDay}</span>
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
                    <div className={`flex items-center rounded-xl px-3 border ${compactView ? 'h-9 w-24' : 'h-11 w-32'} ${
                        isGlass ? 'bg-black/40 border-white/20' : 'bg-white border-gray-300'
                    }`}>
                        <span className={`${compactView ? 'text-xs' : 'text-sm'} mr-1 ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>$</span>
                        <input
                            autoComplete="off"
                            id={`trip-total-${trip.id}`}
                            aria-label="Ingresar monto"
                            ref={inputRef}
                            type="tel"
                            className={`w-full bg-transparent outline-none ${compactView ? 'text-xs' : 'text-sm'} font-bold text-right ${
                                isGlass ? 'text-white' : 'text-gray-800'
                            }`}
                            value={formatInputNumber(inputVal)}
                            onChange={e => {
                                const raw = e.target.value;
                                setInputVal(raw === '' ? '' : String(parseInputNumber(raw)));
                            }}
                            onBlur={commitEdit}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                    isCancellingRef.current = true;
                                    setInputVal(trip.total > 0 ? String(trip.total) : '');
                                    setEditing(false);
                                }
                            }}
                            enterKeyHint="done"
                        />
                    </div>
                </div>
            ) : (
                <button
                    aria-label={trip.total > 0 ? `Total: ${formatMoney(trip.total)}. Tocar para editar` : "Agregar precio a la compra"}
                    type="button"
                    onClick={startEdit}
                    className={`font-mono font-bold min-h-[44px] flex items-center justify-end ${compactView ? 'text-xs min-w-[60px]' : 'text-sm min-w-[80px]'} text-right px-2 py-1 rounded-xl transition-colors ${
                        trip.total > 0
                            ? (isGlass ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-50')
                            : (isGlass ? 'text-gray-500 hover:bg-white/10 border border-dashed border-white/20' : 'text-gray-300 hover:bg-gray-50 border border-dashed border-gray-200')
                    }`}
                >
                    {trip.total > 0 ? formatMoney(trip.total) : '+ precio'}
                </button>
            )}

            <button
                aria-label={`Eliminar registro ${trip.note || ''}`}
                type="button"
                onClick={() => onDelete(trip.id)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                    isGlass ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                }`}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}
