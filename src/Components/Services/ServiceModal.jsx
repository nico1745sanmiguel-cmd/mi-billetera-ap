import React from 'react';
import { formatInputNumber, parseInputNumber } from '../../utils';

/**
 * ServiceModal
 * Formulario para crear/editar un gasto fijo o ajustar un resumen de tarjeta.
 */
export default function ServiceModal({
    isModalOpen,
    setIsModalOpen,
    editingService,
    form,
    setForm,
    handleSave,
    handleDelete,
    isGlass,
    householdId
}) {
    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto ${isGlass ? 'bg-[#1a1b4b] border border-white/10' : 'bg-white'}`}>
                <div className={`flex justify-between items-center mb-6 border-b pb-4 sticky top-0 z-10 ${isGlass ? 'border-white/10 bg-[#1a1b4b]' : 'border-gray-100 bg-white'}`}>
                    <h3 className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                        {editingService?.type === 'card' ? `Ajustar Resumen ${editingService.bank}` : (editingService ? 'Editar' : 'Nuevo Fijo')}
                    </h3>
                    <button aria-label="Acción" type="button" onClick={() => setIsModalOpen(false)} className={`p-2 rounded-full transition-colors ${isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100'}`}>✕</button>
                </div>

                <form onSubmit={handleSave} className="space-y-5 pb-6">
                    {/* Toggle Compartir */}
                    {householdId && (!editingService || editingService.type !== 'card') && (
                        <div className={`p-3 rounded-xl flex items-center justify-between ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                            <div>
                                <p className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Compartir en Hogar</p>
                                <p className={`text-[10px] ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Visible para el reparto proporcional</p>
                            </div>
                            <button aria-label="Acción" type="button" onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))} className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none ${form.isShared ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${form.isShared ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    )}

                    {editingService?.type === 'card' ? (
                        <div className="bg-blue-900/30 p-4 rounded-2xl border border-blue-500/30">
                            <p className="text-xs text-blue-300 mb-2 font-medium">Ingresa el monto exacto de tu resumen final. Esto reemplazará la suma automática.</p>
                            <label htmlFor="input-field" className="block text-xs font-bold text-blue-200 uppercase mb-1">Monto Final ($)</label>
                            <input autoComplete="off" id="input-field"
                                type="tel"
                                className={`w-full p-4 border rounded-xl outline-none font-bold text-center text-xl focus:ring-4 ${isGlass ? 'bg-black/20 border-white/10 text-white focus:ring-blue-500/20' : 'bg-white border-blue-200 text-gray-800 focus:ring-blue-100'}`}
                                placeholder="0"
                                value={formatInputNumber(form.amount)}
                                onChange={e => setForm({ ...form, amount: parseInputNumber(e.target.value) })}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label htmlFor="input-field" className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Nombre</label>
                                <input autoComplete="off" id="input-field"
                                    className={`w-full p-4 border rounded-2xl outline-none font-bold ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                    placeholder="Ej: Internet..."
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="input-field" className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Monto ($)</label>
                                    <input autoComplete="off" id="input-field"
                                        type="tel"
                                        className={`w-full p-4 border rounded-2xl outline-none font-bold text-center ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                        placeholder="0"
                                        value={formatInputNumber(form.amount)}
                                        onChange={e => setForm({ ...form, amount: parseInputNumber(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="input-field" className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Día Venc.</label>
                                    <input autoComplete="off" id="input-field"
                                        type="number"
                                        max="31"
                                        className={`w-full p-4 border rounded-2xl outline-none font-bold text-center ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                        placeholder="10"
                                        value={form.day}
                                        onChange={e => setForm({ ...form, day: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="input-field" className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Frecuencia</label>
                                <div className="relative">
                                    <select
                                        value={form.frequency}
                                        onChange={e => setForm({ ...form, frequency: e.target.value })}
                                        className={`w-full p-4 border rounded-xl outline-none font-bold text-sm appearance-none ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                    >
                                        <option>Mensual</option><option>Bimestral</option><option>Trimestral</option><option>Semestral</option><option>Anual</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-4 flex gap-3">
                        {editingService && (
                            <button aria-label="Acción" type="button" onClick={handleDelete} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center">
                                {editingService.type === 'card' ? 'Volver a Automático' : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                            </button>
                        )}
                        <button aria-label="Acción" type="submit" className={`flex-1 font-bold rounded-2xl py-4 shadow-lg active:scale-95 transition-transform text-lg ${isGlass ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-gray-900 text-white hover:bg-black'}`}>
                            {editingService ? (editingService.type === 'card' ? 'Confirmar Monto' : 'Actualizar') : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
