import React, { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';

const today = () => new Date().toISOString().slice(0, 10);

const PLATFORMS = [
    { key: 'uber',   label: 'Uber',   color: 'from-black to-gray-700',        emoji: '⚫', accentBg: 'bg-gray-900', accentText: 'text-white' },
    { key: 'didi',   label: 'DiDi',   color: 'from-orange-500 to-orange-600',  emoji: '🟠', accentBg: 'bg-orange-500', accentText: 'text-white' },
    { key: 'cabify', label: 'Cabify', color: 'from-purple-600 to-purple-700',  emoji: '🟣', accentBg: 'bg-purple-600', accentText: 'text-white' },
    { key: 'others', label: 'Otros',  color: 'from-gray-500 to-gray-600',      emoji: '⚪', accentBg: 'bg-gray-500', accentText: 'text-white' },
];

const STORAGE_KEY = 'mobility_draft';

// Lee el borrador del día de hoy de localStorage
const loadDraft = (date) => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const draft = JSON.parse(raw);
        if (draft.date !== date) return null; // borrador de otro día → ignorar
        return draft;
    } catch {
        return null;
    }
};

// Escribe el borrador completo
const saveDraft = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* noop */ }
};

const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
};

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
    const isEdit = !!initialData?.id;

    // En modo edición no usamos localStorage
    const [form, setForm] = useState(() => {
        if (isEdit) return initialData;
        const draft = loadDraft(today());
        return draft ? { ...emptyForm, ...draft } : emptyForm;
    });

    // Qué plataformas ya fueron "confirmadas" con el botón individual
    const [confirmed, setConfirmed] = useState(() => {
        if (isEdit) return {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY + '_confirmed');
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Persistir borrador automáticamente cuando cambian los valores
    useEffect(() => {
        if (isEdit) return;
        saveDraft(form);
    }, [form, isEdit]);

    // Persistir confirmaciones
    useEffect(() => {
        if (isEdit) return;
        try {
            localStorage.setItem(STORAGE_KEY + '_confirmed', JSON.stringify(confirmed));
        } catch { /* noop */ }
    }, [confirmed, isEdit]);

    // Calcular previews en tiempo real
    const uber   = parseFloat(form.uber)   || 0;
    const didi   = parseFloat(form.didi)   || 0;
    const cabify = parseFloat(form.cabify) || 0;
    const others = parseFloat(form.others) || 0;
    const total  = uber + didi + cabify + others;
    const hours  = parseFloat(form.hoursWorked) || 0;
    const km     = parseFloat(form.kilometers)  || 0;
    const perHour = hours > 0 ? (total / hours).toFixed(0) : '—';
    const perKm   = km    > 0 ? (total / km).toFixed(2)    : '—';

    const set = useCallback((field, val) => {
        setForm(prev => ({ ...prev, [field]: val }));
        // Si el usuario edita el monto, la confirmación previa ya no es válida
        if (PLATFORMS.find(p => p.key === field)) {
            setConfirmed(prev => ({ ...prev, [field]: false }));
        }
    }, []);

    // Guardar una plataforma individualmente
    const confirmPlatform = (key) => {
        const val = parseFloat(form[key]);
        if (!val || val <= 0) return;
        setConfirmed(prev => ({ ...prev, [key]: true }));
        saveDraft(form); // aseguramos persistencia inmediata
    };

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
                clearDraft();
                localStorage.removeItem(STORAGE_KEY + '_confirmed');
                setForm(emptyForm);
                setConfirmed({});
            }
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

    const activePlatforms = PLATFORMS.filter(p => settings?.activePlatforms?.[p.key]);

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

            {/* PLATAFORMAS — cada una con su botón de guardar */}
            <div className={`rounded-2xl p-4 space-y-3 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-700'}`}>💰 Ingresos por plataforma</h3>
                    {!isEdit && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isGlass ? 'bg-white/10 text-white/50' : 'bg-violet-50 text-violet-400'}`}>
                            Guardado automático
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    {activePlatforms.map(({ key, label, emoji, accentBg }) => {
                        const isConfirmed = confirmed[key] && parseFloat(form[key]) > 0;
                        const hasValue = parseFloat(form[key]) > 0;

                        return (
                            <div key={key} className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                                isConfirmed
                                    ? isGlass ? 'bg-green-500/15 border border-green-400/30' : 'bg-green-50 border border-green-200'
                                    : isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'
                            }`}>
                                {/* Emoji / check */}
                                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-base transition-all ${
                                    isConfirmed ? 'bg-green-500 text-white' : `${accentBg} text-white opacity-80`
                                }`}>
                                    {isConfirmed ? <CheckCircle2 size={16} /> : <span>{emoji}</span>}
                                </div>

                                {/* Label */}
                                <label className={`w-14 text-xs font-bold flex-shrink-0 ${
                                    isConfirmed
                                        ? isGlass ? 'text-green-300' : 'text-green-600'
                                        : isGlass ? 'text-white/70' : 'text-gray-600'
                                }`}>
                                    {label}
                                </label>

                                {/* Input */}
                                <div className="relative flex-1 min-w-0">
                                    <span className={`absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0"
                                        value={form[key]}
                                        onChange={e => set(key, e.target.value)}
                                        className={`w-full rounded-lg px-3 py-2 ps-7 text-sm font-medium outline-none transition-all ${
                                            isGlass
                                                ? 'bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-violet-400'
                                                : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-300 focus:border-violet-400 focus:ring-1 focus:ring-violet-200'
                                        }`}
                                    />
                                </div>

                                {/* Botón guardar individual */}
                                {!isEdit && (
                                    <button
                                        type="button"
                                        onClick={() => confirmPlatform(key)}
                                        disabled={!hasValue || isConfirmed}
                                        title={isConfirmed ? 'Guardado' : 'Guardar monto'}
                                        className={`flex-shrink-0 p-2 rounded-lg transition-all active:scale-95 ${
                                            isConfirmed
                                                ? isGlass ? 'bg-green-500/30 text-green-300 cursor-default' : 'bg-green-100 text-green-500 cursor-default'
                                                : hasValue
                                                    ? isGlass ? 'bg-violet-500/30 text-violet-300 hover:bg-violet-500/50' : 'bg-violet-100 text-violet-500 hover:bg-violet-200'
                                                    : isGlass ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        }`}
                                    >
                                        {isConfirmed ? <CheckCircle2 size={15} /> : <Save size={15} />}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Indicador de progreso */}
                {!isEdit && activePlatforms.length > 0 && (
                    <div className={`flex items-center gap-2 pt-1`}>
                        <div className={`flex-1 h-1 rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 to-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${(Object.values(confirmed).filter(Boolean).length / activePlatforms.length) * 100}%` }}
                            />
                        </div>
                        <span className={`text-xs font-medium ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            {Object.values(confirmed).filter(Boolean).length}/{activePlatforms.length} plataformas
                        </span>
                    </div>
                )}
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
                        : <><Save size={15} /> {isEdit ? 'Guardar cambios' : '✅ Registrar jornada'}</>
                    }
                </button>
            </div>
        </form>
    );
}
