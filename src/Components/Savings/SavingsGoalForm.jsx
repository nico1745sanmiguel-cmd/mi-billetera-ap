import React from 'react';
import { Target, Link, Check, X, Loader2 } from 'lucide-react';
import { formatInputNumber, parseInputNumber } from '../../utils';

const SavingsGoalForm = ({ 
    form, setForm, imageError, setImageError, savingsGoal, 
    handleSave, handleCancel, saving, isGlass, cardBg, textColor, inputClass 
}) => {
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
                <div>
                    <label htmlFor="goal-name-input" className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        ¿Para qué estás ahorrando?
                    </label>
                    <input autoComplete="off" id="goal-name-input"
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ej: Viaje a Japón, Auto nuevo..."
                        className={`w-full px-4 py-3 rounded-xl font-semibold outline-none transition-all ${inputClass}`}
                    />
                </div>

                <div>
                    <label htmlFor="goal-amount-input" className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        Monto objetivo (ARS)
                    </label>
                    <input autoComplete="off" id="goal-amount-input"
                        type="tel"
                        value={formatInputNumber(form.amount)}
                        onChange={e => setForm(f => ({ ...f, amount: parseInputNumber(e.target.value) }))}
                        placeholder="Ej: 500.000"
                        className={`w-full px-4 py-3 rounded-xl font-semibold outline-none transition-all ${inputClass}`}
                    />
                </div>

                <div>
                    <label htmlFor="goal-image-input" className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        Link de imagen (opcional)
                    </label>
                    <div className="relative">
                        <Link size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isGlass ? 'text-white/40' : 'text-gray-400'}`} />
                        <input autoComplete="off" id="goal-image-input"
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

                <div className="flex gap-3 pt-2">
                    <button aria-label="Acción" type="button"
                        onClick={handleSave}
                        disabled={!form.name || !form.amount || saving}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        {savingsGoal ? 'Guardar cambios' : 'Crear objetivo'}
                    </button>
                    {savingsGoal && (
                        <button aria-label="Acción" type="button"
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
};

export default SavingsGoalForm;
