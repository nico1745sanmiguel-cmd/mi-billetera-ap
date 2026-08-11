import React from 'react';
import { Target, Link, Check, X, Loader2 } from 'lucide-react';
import { formatInputNumber, parseInputNumber } from '../../utils';

const SavingsGoalForm = ({ 
    form, setForm, imageError, setImageError, savingsGoal, 
    handleSave, handleCancel, saving, isGlass, cardBg, textColor, inputClass 
}) => {
    return (
        <div className={`rounded-3xl p-6 sm:p-8 ${cardBg} animate-fade-in`}>
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-2xl shadow-sm ${isGlass ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                    <Target size={24} />
                </div>
                <div>
                    <h2 className={`text-xl font-black ${textColor}`}>Mi Objetivo</h2>
                    <p className={`text-xs font-semibold mt-0.5 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        {savingsGoal ? 'Editá tu objetivo de ahorro' : 'Creá tu primer objetivo de ahorro'}
                    </p>
                </div>
            </div>

            <div className="space-y-5">
                {/* 1. Monto (Agrandado para darle importancia) */}
                <div>
                    <label htmlFor="goal-amount-input" className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-amber-300' : 'text-amber-700'}`}>
                        Monto objetivo (ARS)
                    </label>
                    <div className="relative">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>$</span>
                        <input autoComplete="off" id="goal-amount-input"
                            type="tel"
                            value={formatInputNumber(form.amount)}
                            onChange={e => setForm(f => ({ ...f, amount: parseInputNumber(e.target.value) }))}
                            placeholder="Ej: 500.000"
                            className={`w-full pl-10 pr-4 py-4 rounded-2xl text-2xl font-black outline-none transition-all shadow-inner ${inputClass}`}
                        />
                    </div>
                </div>

                {/* 2. Nombre */}
                <div>
                    <label htmlFor="goal-name-input" className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        ¿Para qué estás ahorrando?
                    </label>
                    <input autoComplete="off" id="goal-name-input"
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ej: Viaje a Japón, Auto nuevo..."
                        className={`w-full px-4 py-3.5 rounded-xl font-bold outline-none transition-all ${inputClass}`}
                    />
                </div>

                {/* 3. Imagen */}
                <div>
                    <label htmlFor="goal-image-input" className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        Link de imagen (opcional)
                    </label>
                    <div className="relative">
                        <Link size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isGlass ? 'text-white/40' : 'text-gray-400'}`} />
                        <input autoComplete="off" id="goal-image-input"
                            type="url"
                            value={form.imageUrl}
                            onChange={e => { setForm(f => ({ ...f, imageUrl: e.target.value })); setImageError(false); }}
                            placeholder="https://ejemplo.com/foto.jpg"
                            className={`w-full pl-10 pr-4 py-3.5 rounded-xl font-medium text-sm outline-none transition-all ${inputClass}`}
                        />
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                        Pegá el link directo a una imagen (.jpg, .png)
                    </p>
                </div>

                {/* Preview de la imagen */}
                {form.imageUrl && !imageError && (
                    <div className="relative rounded-2xl overflow-hidden h-32 shadow-md">
                        <img
                            src={form.imageUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                            style={{ filter: 'grayscale(100%) brightness(0.75)' }}
                            onError={() => setImageError(true)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-black/60 text-white text-xs font-bold px-4 py-2 rounded-xl backdrop-blur-md">
                                Así se verá la portada
                            </span>
                        </div>
                    </div>
                )}
                {imageError && (
                    <p className="text-red-500 bg-red-500/10 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        ⚠️ No se pudo cargar la imagen.
                    </p>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4 mt-6 border-t border-gray-200/20">
                    <button aria-label="Acción" type="button"
                        onClick={handleSave}
                        disabled={!form.name || !form.amount || saving}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} />}
                        {savingsGoal ? 'Guardar cambios' : 'Crear objetivo'}
                    </button>
                    {savingsGoal && (
                        <button aria-label="Acción" type="button"
                            onClick={handleCancel}
                            className={`px-5 rounded-2xl font-bold transition-all active:scale-[0.98] ${
                                isGlass 
                                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavingsGoalForm;
