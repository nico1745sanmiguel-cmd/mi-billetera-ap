import React, { useState, useMemo, useEffect } from 'react';
import { Fuel, Wrench, Car, Droplets, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Zap, Tag } from 'lucide-react';
import { useMobilityState, useMobilityDispatch } from '../../context/MobilityContext';
import CurrencyInput from '../Shared/CurrencyInput';

const today = () => new Date().toISOString().slice(0, 10);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const ICONS = { Zap, Fuel, Wrench, Droplets, Tag };

export default function MobilityExpenses({ isGlass, month, year }) {
    const { expenses, settings } = useMobilityState();
    const { addExpense, deleteExpense } = useMobilityDispatch();

    const activeCategories = useMemo(() => {
        return (settings?.expenseCategories || []).filter(c => c.active).map(c => ({
            key: c.id,
            label: c.label,
            icon: ICONS[c.iconName] || Tag,
            color: c.id === 'gnc'       ? 'from-blue-500 to-cyan-400' :
                   c.id === 'nafta'     ? 'from-amber-500 to-orange-400' :
                   c.id === 'repuestos' ? 'from-red-500 to-rose-400' :
                   c.id === 'lavadero' ? 'from-teal-500 to-emerald-400' :
                   'from-indigo-500 to-violet-500',
            bg: 'bg-gray-50',
            text: 'text-gray-700',
            ring: 'ring-gray-300'
        }));
    }, [settings?.expenseCategories]);

    // La primera categoría non-gnc, para usarla como default
    const firstNonGnc = useMemo(
        () => activeCategories.find(c => c.key !== 'gnc')?.key || '',
        [activeCategories]
    );

    // ─── GNC: carga rápida ──────────────────────────────────────────────────────
    const hasGnc = activeCategories.find(c => c.key === 'gnc');
    const [gncAmount, setGncAmount] = useState('');
    const [gncDate,   setGncDate]   = useState(today());
    const [gncSaving, setGncSaving] = useState(false);

    // ─── Formulario completo (otros gastos) ────────────────────────────────────
    const [showFull,   setShowFull]   = useState(!hasGnc);
    const [fullForm,   setFullForm]   = useState({ date: today(), category: firstNonGnc, amount: '', notes: '' });
    const [fullSaving, setFullSaving] = useState(false);

    // Si las categorías cambian (ej: el usuario agrega una nueva), resincronizar
    // la categoría seleccionada si la actual ya no existe o es inválida.
    useEffect(() => {
        const valid = activeCategories.filter(c => c.key !== 'gnc');
        if (valid.length === 0) return;
        const currentOk = valid.find(c => c.key === fullForm.category);
        if (!currentOk) {
            setFullForm(f => ({ ...f, category: valid[0].key }));
        }
    }, [activeCategories]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Mes visible (viene del Dashboard compartido) ───────────────────────────
    const viewMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthExpenses = useMemo(() =>
        expenses.filter(e => e.date?.startsWith(viewMonth)),
        [expenses, viewMonth]
    );

    const totalMonth = useMemo(() =>
        monthExpenses.reduce((a, e) => a + (e.amount || 0), 0),
        [monthExpenses]
    );

    const byCategory = useMemo(() => {
        const cats = [...activeCategories];
        monthExpenses.forEach(exp => {
            if (!cats.find(c => c.key === exp.category)) {
                const oldCat = (settings?.expenseCategories || []).find(c => c.id === exp.category);
                cats.push({
                    key: exp.category,
                    label: oldCat ? oldCat.label : exp.category,
                    icon: oldCat ? (ICONS[oldCat.iconName] || Tag) : Tag,
                    color: 'from-gray-500 to-gray-600',
                    bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-300'
                });
            }
        });
        return cats.map(cat => ({
            ...cat,
            total: monthExpenses.filter(e => e.category === cat.key).reduce((a, e) => a + (e.amount || 0), 0),
        }));
    }, [monthExpenses, activeCategories, settings?.expenseCategories]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleGnc = async (e) => {
        e.preventDefault();
        if (!gncAmount || parseFloat(gncAmount) <= 0) return;
        setGncSaving(true);
        try {
            await addExpense({ date: gncDate, category: 'gnc', amount: gncAmount, notes: '' });
            setGncAmount('');
        } finally {
            setGncSaving(false);
        }
    };

    const handleFull = async (e) => {
        e.preventDefault();
        if (!fullForm.amount || parseFloat(fullForm.amount) <= 0) return;
        setFullSaving(true);
        try {
            await addExpense(fullForm);
            // Reset: usar la primera categoría no-gnc disponible, no hardcodear 'nafta'
            setFullForm({ date: today(), category: firstNonGnc, amount: '', notes: '' });
            setShowFull(false);
        } finally {
            setFullSaving(false);
        }
    };

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const inputCls = `w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all
        ${isGlass
            ? 'bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30'
            : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
        }`;
    const labelCls = `block text-xs font-semibold mb-1 uppercase tracking-wide ${isGlass ? 'text-white/60' : 'text-gray-400'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4">

            {/* ─── CARGA RÁPIDA GNC ─── */}
            {hasGnc && (
                <div className={`${card}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
                            <Zap size={16} className="text-white" />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${text}`}>Cargar GNC</p>
                            <p className={`text-xs ${sub}`}>Carga rápida del día</p>
                        </div>
                    </div>

                    <form onSubmit={handleGnc} className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={gncDate}
                                onChange={e => setGncDate(e.target.value)}
                                className={`${inputCls} flex-1 min-w-0`}
                            />
                            <div className="relative flex-1 min-w-0">
                                <span className={`absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                                <CurrencyInput
                                    value={gncAmount}
                                    onChange={setGncAmount}
                                    placeholder="Monto"
                                    className={`${inputCls} ps-7`}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={gncSaving}
                            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 active:scale-95 transition-all shadow-md shadow-blue-500/30 flex items-center justify-center gap-2"
                        >
                            {gncSaving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                            Agregar GNC
                        </button>
                    </form>
                </div>
            )}

            {/* ─── OTROS GASTOS (colapsable) ─── */}
            <div className={card}>
                <button type="button"
                    onClick={() => setShowFull(v => !v)}
                    className={`w-full flex items-center justify-between ${text}`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm">
                            <Car size={16} className="text-white" />
                        </div>
                        <div className="text-left">
                            <p className={`text-sm font-bold ${text}`}>Otros gastos</p>
                            <p className={`text-xs ${sub}`}>
                                {activeCategories.filter(c => c.key !== 'gnc').map(c => c.label).join(' · ') || 'Sin categorías activas'}
                            </p>
                        </div>
                    </div>
                    {showFull ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
                </button>

                {showFull && (
                    <form onSubmit={handleFull} className="space-y-3 mt-4 pt-4 border-t border-white/10">
                        {/* Categoría */}
                        <div>
                            <p className={labelCls}>Categoría</p>
                            {activeCategories.filter(c => c.key !== 'gnc').length === 0 ? (
                                <p className={`text-xs ${sub} text-center py-3`}>
                                    No hay categorías activas. Activalas en ⚙️ Configuración.
                                </p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {activeCategories.filter(c => c.key !== 'gnc').map(cat => {
                                        const Icon = cat.icon;
                                        const active = fullForm.category === cat.key;
                                        return (
                                            <button
                                                key={cat.key}
                                                type="button"
                                                onClick={() => setFullForm(f => ({ ...f, category: cat.key }))}
                                                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                                    active
                                                        ? isGlass
                                                            ? `bg-gradient-to-br ${cat.color} text-white shadow-md`
                                                            : `${cat.bg} ${cat.text} ring-2 ${cat.ring}`
                                                        : isGlass
                                                            ? 'bg-white/10 text-white/50 hover:bg-white/20'
                                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon size={16} />
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Fecha + Monto */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Fecha</label>
                                <input
                                    type="date"
                                    value={fullForm.date}
                                    onChange={e => setFullForm(f => ({ ...f, date: e.target.value }))}
                                    className={inputCls}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Monto</label>
                                <div className="relative">
                                    <span className={`absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                                    <CurrencyInput
                                        value={fullForm.amount}
                                        onChange={val => setFullForm(f => ({ ...f, amount: val }))}
                                        placeholder="0"
                                        className={`${inputCls} ps-7`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notas */}
                        <div>
                            <label className={labelCls}>Notas (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: cambio de aceite, filtro…"
                                value={fullForm.notes}
                                onChange={e => setFullForm(f => ({ ...f, notes: e.target.value }))}
                                className={inputCls}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={fullSaving || !fullForm.category}
                            className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {fullSaving ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                            Registrar gasto
                        </button>
                    </form>
                )}
            </div>

            {/* ─── RESUMEN DEL MES ─── */}
            <div className={card}>
                <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>
                        {MONTHS[month]} — Total gastos
                    </p>
                    <p className={`text-base font-bold ${isGlass ? 'text-red-300' : 'text-red-500'}`}>{fmt(totalMonth)}</p>
                </div>

                {/* Chips por categoría */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {byCategory.map(cat => {
                        const Icon = cat.icon;
                        if (cat.total === 0) return null;
                        return (
                            <div key={cat.key} className={`flex items-center gap-2 p-2.5 rounded-xl ${isGlass ? 'bg-white/10' : cat.bg}`}>
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                                    <Icon size={13} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-semibold truncate ${isGlass ? 'text-white/80' : cat.text}`}>{cat.label}</p>
                                    <p className={`text-xs font-bold ${isGlass ? 'text-white' : 'text-gray-700'}`}>{fmt(cat.total)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Listado reciente */}
                {monthExpenses.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-3xl mb-1">⛽</p>
                        <p className={`text-sm font-semibold ${text}`}>Sin gastos este mes</p>
                        <p className={`text-xs ${sub}`}>Cargá tu primer gasto arriba</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Últimos registros</p>
                        {monthExpenses.slice(0, 10).map(exp => {
                            const cat = byCategory.find(c => c.key === exp.category) || { label: exp.category, icon: Tag, color: 'from-gray-500 to-gray-600' };
                            const Icon = cat.icon;
                            return (
                                <div key={exp.id} className={`flex items-center gap-3 py-2 px-3 rounded-xl ${isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors group`}>
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={13} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold ${text}`}>{cat.label}</p>
                                        {exp.notes && <p className={`text-xs truncate ${sub}`}>{exp.notes}</p>}
                                    </div>
                                    <p className={`text-xs ${sub} flex-shrink-0`}>{exp.date?.slice(5)}</p>
                                    <p className={`text-sm font-bold ${isGlass ? 'text-red-300' : 'text-red-500'} flex-shrink-0`}>{fmt(exp.amount)}</p>
                                    <button type="button"
                                        onClick={() => deleteExpense(exp.id)}
                                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${isGlass ? 'hover:bg-white/20 text-white/40' : 'hover:bg-red-50 text-gray-300 hover:text-red-400'}`}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
