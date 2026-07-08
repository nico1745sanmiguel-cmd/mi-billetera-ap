import React, { useState, useMemo } from 'react';
import { Target, Edit3, Check, X, Link, Sparkles, Trophy, ImageOff, Loader2 } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';
import { useUI } from '../../context/UIContext';

export default function SavingsGoal() {
    const { isGlass, privacyMode } = useUI();
    const { savingsTransactions, savingsGoal, goalLoading, saveSavingsGoal, deleteSavingsGoal } = useSavings();
    const { dolarBlue } = useFinancial();

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', amount: '', imageUrl: '' });
    const [imageError, setImageError] = useState(false);
    const [saving, setSaving] = useState(false);

    // Calcula el total general en ARS
    const totalARS = useMemo(() => {
        const rate = dolarBlue || 1000;
        const balances = {};

        (savingsTransactions || []).forEach(tx => {
            const { cartera, especie, tipo, cantidad } = tx;
            if (!balances[cartera]) balances[cartera] = {};
            if (!balances[cartera][especie]) balances[cartera][especie] = 0;
            const num = parseFloat(cantidad) || 0;
            if (tipo === 'ingreso') balances[cartera][especie] += num;
            else if (tipo === 'egreso') balances[cartera][especie] -= num;
        });

        let total = 0;
        Object.values(balances).forEach(cartera => {
            Object.entries(cartera).forEach(([especie, cant]) => {
                const es = especie.toUpperCase();
                if (es === 'ARS') total += cant;
                else if (es === 'USD') total += cant * rate;
                else if (['USDT', 'USDC', 'DAI', 'USDP'].includes(es)) total += cant * rate;
            });
        });
        return total;
    }, [savingsTransactions, dolarBlue]);

    const goalAmount = savingsGoal ? parseFloat(savingsGoal.amount) : 0;
    const progress = savingsGoal && goalAmount > 0 ? Math.min(100, (totalARS / goalAmount) * 100) : 0;
    const remaining = savingsGoal ? Math.max(0, goalAmount - totalARS) : 0;
    const isComplete = progress >= 100;

    const formatCurrency = (amount) => {
        if (privacyMode) return '****';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const openEdit = () => {
        setForm({
            name: savingsGoal?.name || '',
            amount: savingsGoal?.amount || '',
            imageUrl: savingsGoal?.imageUrl || '',
        });
        setImageError(false);
        setEditing(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.amount) return;
        setSaving(true);
        try {
            await saveSavingsGoal({
                name: form.name,
                amount: parseFloat(String(form.amount).replace(/\./g, '').replace(',', '.')),
                imageUrl: form.imageUrl.trim(),
            });
            setEditing(false);
        } catch (e) {
            alert('No se pudo guardar el objetivo. Intentá de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Eliminar el objetivo?')) return;
        setSaving(true);
        try {
            await deleteSavingsGoal();
            setEditing(false);
        } catch (e) {
            alert('Error al eliminar el objetivo.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => setEditing(false);

    // ─── Estilos compartidos ───────────────────────────────────────────────────
    const cardBg = isGlass
        ? 'bg-white/10 backdrop-blur-md border border-white/20'
        : 'bg-white shadow-lg border border-gray-100';
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const inputClass = isGlass
        ? 'bg-white/10 text-white placeholder-white/30 border border-white/20 focus:border-amber-400/60'
        : 'bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-amber-400 focus:bg-white';

    // ─── Loading ───────────────────────────────────────────────────────────────
    if (goalLoading) {
        return (
            <div className={`rounded-3xl p-6 flex items-center justify-center gap-3 ${cardBg}`}>
                <Loader2 size={20} className="animate-spin text-amber-400" />
                <span className={`text-sm font-semibold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Cargando objetivo...</span>
            </div>
        );
    }

    // ─── FORMULARIO (crear/editar) ─────────────────────────────────────────────
    if (!savingsGoal || editing) {
        return (
            <div className={`rounded-3xl p-6 ${cardBg} animate-fade-in`}>
                <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 rounded-2xl ${isGlass ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                        <Target size={22} />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black ${textColor}`}>Mi Objetivo</h2>
                        <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                            {savingsGoal ? 'Editá tu objetivo de ahorro' : 'Creá tu primer objetivo de ahorro'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                            ¿Para qué estás ahorrando?
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Ej: Viaje a Japón, Auto nuevo..."
                            className={`w-full px-4 py-3 rounded-xl font-semibold outline-none transition-all ${inputClass}`}
                        />
                    </div>

                    {/* Monto */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                            Monto objetivo (ARS)
                        </label>
                        <input
                            type="number"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            placeholder="Ej: 500000"
                            className={`w-full px-4 py-3 rounded-xl font-semibold outline-none transition-all ${inputClass}`}
                        />
                    </div>

                    {/* URL de imagen */}
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                            Link de imagen (opcional)
                        </label>
                        <div className="relative">
                            <Link size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isGlass ? 'text-white/40' : 'text-gray-400'}`} />
                            <input
                                type="url"
                                value={form.imageUrl}
                                onChange={e => { setForm(f => ({ ...f, imageUrl: e.target.value })); setImageError(false); }}
                                placeholder="https://ejemplo.com/foto.jpg"
                                className={`w-full pl-9 pr-4 py-3 rounded-xl font-medium text-sm outline-none transition-all ${inputClass}`}
                            />
                        </div>
                        <p className={`text-xs mt-1 ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>
                            Pegá el link directo a una imagen (.jpg, .png, etc.)
                        </p>
                    </div>

                    {/* Preview de imagen */}
                    {form.imageUrl && !imageError && (
                        <div className="relative rounded-2xl overflow-hidden h-28">
                            <img
                                src={form.imageUrl}
                                alt="preview"
                                className="w-full h-full object-cover"
                                style={{ filter: 'grayscale(100%) brightness(0.75)' }}
                                onError={() => setImageError(true)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm">
                                    Así se verá al 0%
                                </span>
                            </div>
                        </div>
                    )}
                    {imageError && (
                        <p className="text-red-400 text-xs font-semibold">⚠️ No se pudo cargar esa imagen. Revisá el link.</p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-3 pt-2">
                        <button type="button"
                            onClick={handleSave}
                            disabled={!form.name || !form.amount || saving}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            {savingsGoal ? 'Guardar cambios' : 'Crear objetivo'}
                        </button>
                        {savingsGoal && (
                            <button type="button"
                                onClick={handleCancel}
                                className={`px-4 py-3 rounded-xl font-bold transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── VISTA DE OBJETIVO ─────────────────────────────────────────────────────
    const hasImage = savingsGoal.imageUrl && !imageError;

    return (
        <div className={`rounded-3xl overflow-hidden ${cardBg} animate-fade-in`}>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl transition-colors ${
                        isComplete
                            ? isGlass ? 'bg-yellow-400/20 text-yellow-400' : 'bg-yellow-100 text-yellow-500'
                            : isGlass ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                        {isComplete ? <Trophy size={22} /> : <Target size={22} />}
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${
                            isComplete
                                ? isGlass ? 'text-yellow-400/80' : 'text-yellow-600'
                                : isGlass ? 'text-white/50' : 'text-gray-500'
                        }`}>
                            {isComplete ? '🎉 ¡Objetivo alcanzado!' : 'Mi Objetivo'}
                        </p>
                        <h2 className={`text-xl font-black leading-tight ${textColor}`}>{savingsGoal.name}</h2>
                    </div>
                </div>
                <button type="button"
                    onClick={openEdit}
                    className={`p-2 rounded-xl opacity-40 hover:opacity-100 transition-all ${
                        isGlass ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Editar objetivo"
                >
                    <Edit3 size={16} />
                </button>
            </div>

            {/* Imagen con revelado de color */}
            {hasImage ? (
                <div className="mx-5 relative overflow-hidden rounded-2xl" style={{ height: '220px' }}>
                    {/* Capa B&N (fondo) */}
                    <img
                        src={savingsGoal.imageUrl}
                        alt={savingsGoal.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'grayscale(100%) brightness(0.75)' }}
                        onError={() => setImageError(true)}
                    />
                    {/* Capa a color, recortada de abajo hacia arriba */}
                    {progress > 0 && (
                        <img
                            src={savingsGoal.imageUrl}
                            alt={savingsGoal.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                                clipPath: `inset(${(100 - progress).toFixed(2)}% 0 0 0)`,
                                transition: 'clip-path 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                        />
                    )}
                    {/* Línea "nivel de agua" */}
                    {progress > 1 && progress < 99 && (
                        <div
                            className="absolute left-0 right-0 pointer-events-none"
                            style={{
                                top: `${(100 - progress).toFixed(2)}%`,
                                height: '2px',
                                background: 'rgba(255,255,255,0.85)',
                                boxShadow: '0 0 8px 2px rgba(255,255,255,0.5)',
                                transition: 'top 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                        />
                    )}
                    {/* Badge */}
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                        <div className="bg-black/65 backdrop-blur-sm text-white text-sm font-black px-3 py-1.5 rounded-xl">
                            {privacyMode ? '**%' : `${progress.toFixed(0)}% ahorrado`}
                        </div>
                        {isComplete && (
                            <div className="bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                                <Sparkles size={12} />
                                ¡Logrado!
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mx-5">
                    <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-dashed border-gray-200'} flex flex-col items-center gap-3`}>
                        <ImageOff size={28} className={isGlass ? 'text-white/20' : 'text-gray-300'} />
                        <p className={`text-xs text-center ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            Editá el objetivo para agregar una imagen
                        </p>
                        <div className="w-full mt-1">
                            <div className={`h-4 rounded-full overflow-hidden ${isGlass ? 'bg-black/30' : 'bg-gray-200'}`}>
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                        isComplete ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-amber-400 to-amber-600'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className={`flex justify-between mt-1 text-xs font-semibold ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                <span>0%</span>
                                {!privacyMode && <span className="font-black text-amber-500">{progress.toFixed(0)}%</span>}
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="p-5 grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-semibold mb-0.5 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Tenés ahorrado</p>
                    <p className={`text-base font-black ${isGlass ? 'text-green-400' : 'text-green-600'} truncate`}>
                        {formatCurrency(totalARS)}
                    </p>
                </div>
                <div className={`p-3.5 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-semibold mb-0.5 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Meta</p>
                    <p className={`text-base font-black ${textColor} truncate`}>
                        {formatCurrency(goalAmount)}
                    </p>
                </div>

                {!isComplete ? (
                    <div className={`col-span-2 p-3.5 rounded-2xl ${isGlass ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                        <p className={`text-xs font-semibold ${isGlass ? 'text-amber-300/70' : 'text-amber-700'}`}>Te falta para lograrlo</p>
                        <p className={`text-xl font-black ${isGlass ? 'text-amber-400' : 'text-amber-600'} truncate`}>
                            {formatCurrency(remaining)}
                        </p>
                    </div>
                ) : (
                    <div className={`col-span-2 p-3.5 rounded-2xl ${isGlass ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-yellow-50 border border-yellow-100'}`}>
                        <p className={`text-sm font-black ${isGlass ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            🏆 ¡Llegaste a tu objetivo! Podés editarlo para ponerte uno nuevo.
                        </p>
                    </div>
                )}
            </div>

            {/* Borrar objetivo */}
            <button type="button"
                onClick={handleDelete}
                disabled={saving}
                className={`w-full py-3 text-xs font-bold uppercase tracking-wider transition-colors border-t ${
                    isGlass
                        ? 'border-white/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/10'
                        : 'border-gray-100 text-gray-300 hover:text-red-400 hover:bg-red-50'
                }`}
            >
                {saving ? 'Eliminando...' : 'Eliminar objetivo'}
            </button>
        </div>
    );
}
