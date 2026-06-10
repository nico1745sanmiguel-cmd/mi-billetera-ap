import React, { useState, useMemo } from 'react';
import { Fuel, Wrench, Car, Droplets, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';

const today = () => new Date().toISOString().slice(0, 10);

// ─── Categorías de gasto ───────────────────────────────────────────────────
const CATEGORIES = [
    { key: 'gnc',       label: 'GNC',        icon: Zap,      color: 'from-blue-500 to-cyan-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-300' },
    { key: 'nafta',     label: 'Nafta',       icon: Fuel,     color: 'from-amber-500 to-orange-400', bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-300' },
    { key: 'repuestos', label: 'Repuestos',   icon: Wrench,   color: 'from-red-500 to-rose-400',    bg: 'bg-red-50',    text: 'text-red-700',    ring: 'ring-red-300' },
    { key: 'lavadero',  label: 'Lavadero/Mec', icon: Droplets, color: 'from-teal-500 to-emerald-400', bg: 'bg-teal-50', text: 'text-teal-700',   ring: 'ring-teal-300' },
];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export default function MobilityExpenses({ isGlass }) {
    const { expenses, addExpense, deleteExpense } = useMobility();

    // ─── GNC: carga rápida ────────────────────────────────────────────────────
    const [gncAmount, setGncAmount] = useState('');
    const [gncDate,   setGncDate]   = useState(today());
    const [gncSaving, setGncSaving] = useState(false);

    // ─── Formulario completo (otros gastos) ────────────────────────────────────
    const [showFull,    setShowFull]    = useState(false);
    const [fullForm,    setFullForm]    = useState({ date: today(), category: 'nafta', amount: '', notes: '' });
    const [fullSaving,  setFullSaving]  = useState(false);

    // ─── Mes visible ──────────────────────────────────────────────────────────
    const now = new Date();
    const [viewMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    const monthExpenses = useMemo(() =>
        expenses.filter(e => e.date?.startsWith(viewMonth)),
        [expenses, viewMonth]
    );

    const totalMonth = useMemo(() =>
        monthExpenses.reduce((a, e) => a + (e.amount || 0), 0),
        [monthExpenses]
    );

    const byCategory = useMemo(() =>
        CATEGORIES.map(cat => ({
            ...cat,
            total: monthExpenses.filter(e => e.category === cat.key).reduce((a, e) => a + (e.amount || 0), 0),
        })),
        [monthExpenses]
    );

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
            setFullForm({ date: today(), category: 'nafta', amount: '', notes: '' });
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

                <form onSubmit={handleGnc} className="flex gap-2">
                    <input
                        type="date"
                        value={gncDate}
                        onChange={e => setGncDate(e.target.value)}
                        className={`${inputCls} w-36 flex-shrink-0`}
                    />
                    <div className="relative flex-1">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Monto"
                            value={gncAmount}
                            onChange={e => setGncAmount(e.target.value)}
                            className={`${inputCls} pl-7`}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={gncSaving}
                        className="flex-shrink-0 px-4 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 active:scale-95 transition-all shadow-md shadow-blue-500/30 flex items-center gap-1.5"
                    >
                        {gncSaving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        <span className="hidden sm:inline">Agregar</span>
                    </button>
                </form>
            </div>

            {/* ─── OTROS GASTOS (colapsable) ─── */}
            <div className={card}>
                <button
                    onClick={() => setShowFull(v => !v)}
                    className={`w-full flex items-center justify-between ${text}`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm">
                            <Car size={16} className="text-white" />
                        </div>
                        <div className="text-left">
                            <p className={`text-sm font-bold ${text}`}>Otros gastos</p>
                            <p className={`text-xs ${sub}`}>Nafta · Repuestos · Lavadero</p>
                        </div>
                    </div>
                    {showFull ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
                </button>

                {showFull && (
                    <form onSubmit={handleFull} className="space-y-3 mt-4 pt-4 border-t border-white/10">
                        {/* Categoría */}
                        <div>
                            <p className={labelCls}>Categoría</p>
                            <div className="grid grid-cols-3 gap-2">
                                {CATEGORIES.filter(c => c.key !== 'gnc').map(cat => {
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
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isGlass ? 'text-white/40' : 'text-gray-300'}`}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0"
                                        value={fullForm.amount}
                                        onChange={e => setFullForm(f => ({ ...f, amount: e.target.value }))}
                                        className={`${inputCls} pl-7`}
                                        required
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
                            disabled={fullSaving}
                            className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
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
                        {MONTHS[now.getMonth()]} — Total gastos
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
                            const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[0];
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
                                    <button
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
