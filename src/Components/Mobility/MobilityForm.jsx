import React, { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, CheckCircle2, Plus, X } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';
import CurrencyInput from '../Shared/CurrencyInput';

const today = () => new Date().toISOString().slice(0, 10);

const PLATFORMS = [
    { key: 'uber',   label: 'Uber',   color: 'from-black to-gray-700',        emoji: '⚫', accentBg: 'bg-gray-900', accentText: 'text-white' },
    { key: 'didi',   label: 'DiDi',   color: 'from-orange-500 to-orange-600',  emoji: '🟠', accentBg: 'bg-orange-500', accentText: 'text-white' },
    { key: 'cabify', label: 'Cabify', color: 'from-purple-600 to-purple-700',  emoji: '🟣', accentBg: 'bg-purple-600', accentText: 'text-white' },
    { key: 'others', label: 'Otros',  color: 'from-gray-500 to-gray-600',      emoji: '⚪', accentBg: 'bg-gray-500', accentText: 'text-white' },
];

const STORAGE_KEY = 'mobility_multi_draft:v2';
const CONFIRM_KEY = STORAGE_KEY + '_confirmed';

const emptyForm = (date) => ({
    date: date || today(),
    hoursWorked: '',
    kilometers: '',
    uber: '',
    didi: '',
    cabify: '',
    others: '',
});

// Devuelve el objeto de borradores. Clave: fecha, Valor: form.
const loadDrafts = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const drafts = JSON.parse(raw);
        if (Object.keys(drafts).length === 0) return null;
        return drafts;
    } catch {
        return null;
    }
};

const saveDrafts = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* noop */ }
};

const formatDateTab = (dateStr) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (dateStr === todayStr) return 'Hoy';
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
};

export default function MobilityForm({ isGlass, onSuccess, initialData = null, onCancel = null }) {
    const { addSession, updateSession, settings } = useMobility();
    const isEdit = !!initialData?.id;

    // ESTADO: drafts es un objeto con clave = fecha (ej. "2024-07-13")
    const [drafts, setDrafts] = useState(() => {
        if (isEdit) {
            return { [initialData.date]: initialData };
        }
        const saved = loadDrafts();
        if (saved) return saved;
        return { [today()]: emptyForm(today()) };
    });

    const [activeDate, setActiveDate] = useState(() => {
        if (isEdit) return initialData.date;
        const saved = loadDrafts();
        if (saved) {
            const keys = Object.keys(saved).sort().reverse();
            return keys.includes(today()) ? today() : keys[0];
        }
        return today();
    });

    // En formato de { [date]: { uber: true, didi: false } }
    const [confirmed, setConfirmed] = useState(() => {
        if (isEdit) return {};
        try {
            const raw = localStorage.getItem(CONFIRM_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Persistir borradores y confirmaciones automáticamente (solo si no es edición)
    useEffect(() => {
        if (isEdit) return;
        saveDrafts(drafts);
    }, [drafts, isEdit]);

    useEffect(() => {
        if (isEdit) return;
        try {
            localStorage.setItem(CONFIRM_KEY, JSON.stringify(confirmed));
        } catch { /* noop */ }
    }, [confirmed, isEdit]);

    // Referencia al formulario activo
    const form = drafts[activeDate] || emptyForm(activeDate);
    const activeConfirmed = confirmed[activeDate] || {};

    const uber   = parseFloat(form.uber)   || 0;
    const didi   = parseFloat(form.didi)   || 0;
    const cabify = parseFloat(form.cabify) || 0;
    const others = parseFloat(form.others) || 0;
    const total  = uber + didi + cabify + others;
    const hours  = parseFloat(form.hoursWorked) || 0;
    const km     = parseFloat(form.kilometers)  || 0;
    const perHour = hours > 0 ? (total / hours).toFixed(0) : '—';
    const perKm   = km    > 0 ? (total / km).toFixed(2)    : '—';

    const setField = useCallback((field, val) => {
        setDrafts(prev => ({
            ...prev,
            [activeDate]: { ...prev[activeDate], [field]: val }
        }));
        
        // Si edita plataforma, quitar el tick de confirmación
        if (PLATFORMS.find(p => p.key === field)) {
            setConfirmed(prev => ({
                ...prev,
                [activeDate]: { ...(prev[activeDate] || {}), [field]: false }
            }));
        }
    }, [activeDate]);

    // Cambiar la fecha global del borrador activo si el usuario edita el input date
    const handleDateChange = (oldDate, newDate) => {
        if (!newDate || oldDate === newDate) return;
        setDrafts(prev => {
            const copy = { ...prev };
            // Si ya existe la nueva fecha en los drafts, no sobreescribir
            if (copy[newDate]) return prev;
            
            copy[newDate] = { ...copy[oldDate], date: newDate };
            delete copy[oldDate];
            return copy;
        });
        setConfirmed(prev => {
            const copy = { ...prev };
            copy[newDate] = copy[oldDate] || {};
            delete copy[oldDate];
            return copy;
        });
        // react-doctor-disable-next-line react-doctor/no-impure-state-updater
        setActiveDate(newDate);
    };

    const confirmPlatform = (key) => {
        const val = parseFloat(form[key]);
        if (!val || val <= 0) return;
        setConfirmed(prev => ({
            ...prev,
            [activeDate]: { ...(prev[activeDate] || {}), [key]: true }
        }));
    };

    const handleAddTab = () => {
        // Encontrar una fecha libre hacia atrás
        let target = new Date();
        target.setDate(target.getDate() - 1); // empezamos probando con ayer
        
        // Buscar un día libre
        let dateStr = target.toISOString().slice(0, 10);
        let attempts = 0;
        while (drafts[dateStr] && attempts < 30) {
            target.setDate(target.getDate() - 1);
            dateStr = target.toISOString().slice(0, 10);
            attempts++;
        }

        if (!drafts[dateStr]) {
            setDrafts(prev => ({ ...prev, [dateStr]: emptyForm(dateStr) }));
            setActiveDate(dateStr);
        }
    };

    const handleRemoveTab = (dateToRemove, e) => {
        e.stopPropagation();
        setDrafts(prev => {
            const copy = { ...prev };
            delete copy[dateToRemove];
            
            // Si nos quedamos sin tabs, creamos uno nuevo
            if (Object.keys(copy).length === 0) {
                copy[today()] = emptyForm(today());
            }
            return copy;
        });
        setConfirmed(prev => {
            const copy = { ...prev };
            delete copy[dateToRemove];
            return copy;
        });
        
        if (activeDate === dateToRemove) {
            const remainingDates = Object.keys(drafts).filter(d => d !== dateToRemove).sort().reverse();
            setActiveDate(remainingDates.length > 0 ? remainingDates[0] : today());
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const allDrafts = Object.values(drafts);
        // Validar que al menos uno tenga ingresos
        const draftsWithIncome = allDrafts.filter(d => {
            const t = (parseFloat(d.uber)||0) + (parseFloat(d.didi)||0) + (parseFloat(d.cabify)||0) + (parseFloat(d.others)||0);
            return t > 0;
        });

        if (draftsWithIncome.length === 0 && !isEdit) {
            setError('Ingresá montos en al menos un día.');
            return;
        }

        if (isEdit && total <= 0) {
            setError('Ingresá al menos un ingreso.');
            return;
        }

        setError('');
        setSaving(true);
        try {
            if (isEdit) {
                await updateSession(initialData.id, form);
            } else {
                // Guardar concurrentemente
                await Promise.all(draftsWithIncome.map(draft => addSession(draft)));
                
                // Limpiar storage
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(CONFIRM_KEY);
                setDrafts({ [today()]: emptyForm(today()) });
                setConfirmed({});
                setActiveDate(today());
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

    const sortedDates = Object.keys(drafts).sort().reverse();

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* TABS DE FECHAS */}
            {!isEdit && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {sortedDates.map(d => (
                        <div
                            key={d}
                            onClick={() => setActiveDate(d)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all flex-shrink-0 ${
                                activeDate === d
                                    ? (isGlass ? 'bg-violet-500/80 text-white shadow-md' : 'bg-violet-100 text-violet-700 shadow-sm')
                                    : (isGlass ? 'bg-white/10 text-white/50 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
                            }`}
                        >
                            {formatDateTab(d)}
                            {Object.keys(drafts).length > 1 && (
                                <button type="button" 
                                    onClick={(e) => handleRemoveTab(d, e)} 
                                    className={`p-0.5 rounded-full ${activeDate === d ? 'hover:bg-black/10' : 'hover:bg-black/10'}`}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddTab}
                        title="Agregar día"
                        className={`flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all flex-shrink-0 ${
                            isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            )}

            {/* FECHA Y LOGÍSTICA */}
            <div className={`rounded-2xl p-4 space-y-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
                <h3 className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-700'}`}>📅 {isEdit ? 'Jornada' : 'Datos del día'}</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                        <label className={labelCls} htmlFor="mobDate">Fecha</label>
                        <input autoComplete="off"
                            id="mobDate"
                            type="date"
                            value={form.date}
                            onChange={e => handleDateChange(form.date, e.target.value)}
                            className={inputCls}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="mobHours">Horas</label>
                        <CurrencyInput autoComplete="off"
                            id="mobHours"
                            value={form.hoursWorked}
                            onChange={val => setField('hoursWorked', val)}
                            placeholder="8"
                            allowDecimals={true}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="mobKm">KM</label>
                        <CurrencyInput autoComplete="off"
                            id="mobKm"
                            value={form.kilometers}
                            onChange={val => setField('kilometers', val)}
                            placeholder="120"
                            allowDecimals={false}
                            className={inputCls}
                        />
                    </div>
                </div>
            </div>

            {/* PLATAFORMAS */}
            <div className={`rounded-2xl p-4 space-y-3 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-700'}`}>💰 Ingresos por plataforma</h3>
                    {!isEdit && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isGlass ? 'bg-white/10 text-white/50' : 'bg-violet-50 text-violet-400'}`}>
                            Guardado auto
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    {activePlatforms.map(({ key, label, emoji, accentBg }) => {
                        const isConfirmed = activeConfirmed[key] && parseFloat(form[key]) > 0;
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
                                <label htmlFor={`mob_${key}`} className={`w-14 text-xs font-bold flex-shrink-0 ${
                                    isConfirmed
                                        ? isGlass ? 'text-green-300' : 'text-green-600'
                                        : isGlass ? 'text-white/70' : 'text-gray-600'
                                }`}>
                                    {label}
                                </label>

                                {/* Input */}
                                <div className="relative flex-1 min-w-0">
                                    <span className={`absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                                    <CurrencyInput autoComplete="off"
                                        id={`mob_${key}`}
                                        value={form[key]}
                                        onChange={val => setField(key, val)}
                                        placeholder="0"
                                        className={`w-full rounded-lg px-3 py-2 ps-7 text-sm font-medium outline-none transition-all ${
                                            isGlass
                                                ? 'bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-violet-400'
                                                : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-300 focus:border-violet-400 focus:ring-1 focus:ring-violet-200'
                                        }`}
                                    />
                                </div>

                                {/* Botón guardar individual */}
                                {!isEdit && (
                                    <button aria-label="Acción"
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
                                style={{ width: `${(Object.values(activeConfirmed).filter(Boolean).length / activePlatforms.length) * 100}%` }}
                            />
                        </div>
                        <span className={`text-xs font-medium ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            {Object.values(activeConfirmed).filter(Boolean).length}/{activePlatforms.length} plataformas
                        </span>
                    </div>
                )}
            </div>

            {/* PREVIEW DE TOTALES */}
            {total > 0 && (
                <div className={`rounded-2xl p-4 ${isGlass ? 'bg-violet-500/20 border border-violet-400/30' : 'bg-violet-50 border border-violet-100'}`}>
                    <p className={`text-xs font-semibold uppercase mb-3 ${isGlass ? 'text-violet-300' : 'text-violet-500'}`}>Vista previa del día</p>
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
                    <button aria-label="Acción"
                        type="button"
                        onClick={onCancel}
                        className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all ${isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Cancelar
                    </button>
                )}
                <button aria-label="Acción"
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                >
                    {saving
                        ? <><RefreshCw size={15} className="animate-spin" /> Guardando...</>
                        : <><Save size={15} /> {isEdit ? 'Guardar cambios' : (Object.keys(drafts).length > 1 ? `✅ Registrar ${Object.keys(drafts).length} días` : '✅ Registrar jornada')}</>
                    }
                </button>
            </div>
        </form>
    );
}
