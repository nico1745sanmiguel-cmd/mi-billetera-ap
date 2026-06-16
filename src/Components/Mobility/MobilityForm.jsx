import React, { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';

const today = () => new Date().toISOString().slice(0, 10);

const PLATFORMS = [
    { key: 'uber',   label: 'Uber',   color: 'from-black to-gray-700',        emoji: '⚫' },
    { key: 'didi',   label: 'DiDi',   color: 'from-orange-500 to-orange-600',  emoji: '🟠' },
    { key: 'cabify', label: 'Cabify', color: 'from-purple-600 to-purple-700',  emoji: '🟣' },
    { key: 'others', label: 'Otros',  color: 'from-gray-500 to-gray-600',      emoji: '⚪' },
];

const emptyForm = {
    date: today(),
    hoursWorked: '',
    kilometers: '',
    uber: '',
    didi: '',
    cabify: '',
    others: '',
};

export default function MobilityForm({ isGlass, onSuccess, initialData = null, onCancel = null }) {
    const { addSession, updateSession, settings } = useMobility();
    const [form, setForm] = useState(initialData || emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!initialData?.id;

    // Calcular previews en tiempo real
    const uber    = parseFloat(form.uber)    || 0;
    const didi    = parseFloat(form.didi)    || 0;
    const cabify  = parseFloat(form.cabify)  || 0;
    const others  = parseFloat(form.others)  || 0;
    const total   = uber + didi + cabify + others;
    const hours   = parseFloat(form.hoursWorked) || 0;
    const km      = parseFloat(form.kilometers)  || 0;
    const perHour = hours > 0 ? (total / hours).toFixed(0) : '—';
    const perKm   = km    > 0 ? (total / km).toFixed(2)    : '—';

    const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (total <= 0) { setError('Ingresá al menos un ingreso.'); return; }
        if (!form.date)  { setError('La fecha es obligatoria.');    return; }
        setError('');
        setSaving(true);
        try {
            if (isEdit) {
                await updateSession(initialData.id, form);
            } else {
                await addSession(form);
            }
            setForm(emptyForm);
            onSuccess?.();
        } catch (err) {
            console.error(err);
            setError('Error al guardar. Revisá tu conexión.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = `w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all
        ${isGlass
            ? 'bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30'
            : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
        }`;

    const labelCls = `block text-xs font-semibold mb-1 uppercase tracking-wide
        ${isGlass ? 'text-white/60' : 'text-gray-400'}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* FECHA Y LOGÍSTICA */}
            <div className={`rounded-2xl p-4 space-y-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
                <h3 className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-700'}`}>📅 Jornada</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                        <label className={labelCls}>Fecha</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => set('date', e.target.value)}
                            className={inputCls}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Horas</label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            placeholder="8"
                            value={form.hoursWorked}
                            onChange={e => set('hoursWorked', e.target.value)}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>KM</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="120"
                            value={form.kilometers}
                            onChange={e => set('kilometers', e.target.value)}
                            className={inputCls}
                        />
                    </div>
                </div>
            </div>

            {/* PLATAFORMAS */}
            <div className={`rounded-2xl p-4 space-y-3 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
                <h3 className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-700'}`}>💰 Ingresos por plataforma</h3>
                <div className="grid grid-cols-2 gap-3">
                    {PLATFORMS.filter(p => settings?.activePlatforms?.[p.key]).map(({ key, label, emoji }) => (
                        <div key={key}>
                            <label className={labelCls}>{emoji} {label}</label>
                            <div className="relative">
                                <span className={`absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    value={form[key]}
                                    onChange={e => set(key, e.target.value)}
                                    className={`${inputCls} ps-7`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PREVIEW DE TOTALES */}
            {total > 0 && (
                <div className={`rounded-2xl p-4 ${isGlass ? 'bg-violet-500/20 border border-violet-400/30' : 'bg-violet-50 border border-violet-100'}`}>
                    <p className={`text-xs font-semibold uppercase mb-3 ${isGlass ? 'text-violet-300' : 'text-violet-500'}`}>Vista previa</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>${total.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Total</p>
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>${perHour !== '—' ? Number(perHour).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}</p>
                            <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>por hora</p>
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>${perKm}</p>
                            <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>por km</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            )}

            <div className={`flex gap-2 ${isEdit ? 'grid grid-cols-2' : ''}`}>
                {isEdit && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all ${isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                >
                    {saving
                        ? <><RefreshCw size={15} className="animate-spin" /> Guardando...</>
                        : <><Save size={15} /> {isEdit ? 'Guardar cambios' : 'Registrar jornada'}</>
                    }
                </button>
            </div>
        </form>
    );
}
