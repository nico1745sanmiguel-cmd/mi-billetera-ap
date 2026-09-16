import React from 'react';
import { X } from 'lucide-react';

export default function CaucionForm({
    formData,
    setFormData,
    isGlass,
    inputClasses,
    carterasOpciones,
    customCartera,
    setCustomCartera,
    caucionCalc,
    errors = {},
    setErrors
}) {
    const getFieldClass = (field) => errors?.[field] ? `${inputClasses} border-red-500 ring-2 ring-red-500/20` : inputClasses;
    const clearError = (field) => { if (errors?.[field] && setErrors) setErrors(prev => ({ ...prev, [field]: null })); };

    return (
        <div className="space-y-4">
            {/* Cartera */}
            <div>
                <label htmlFor="cartera-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                    BROKER / CARTERA
                </label>
                {customCartera ? (
                    <div className="flex gap-2">
                        <input
                            id="cartera-caucion"
                            type="text"
                            placeholder="Escribí el nombre..."
                            value={formData.cartera}
                            onChange={(e) => {
                                clearError('cartera');
                                setFormData({ ...formData, cartera: e.target.value });
                            }}
                            required
                            className={getFieldClass('cartera')}
                            autoFocus
                        />
                        <button
                            type="button"
                            aria-label="Cancelar cartera personalizada"
                            onClick={() => { clearError('cartera'); setCustomCartera(false); setFormData({ ...formData, cartera: '' }); }}
                            className={`min-h-[44px] min-w-[44px] px-3 flex items-center justify-center rounded-xl transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <select
                        id="cartera-caucion"
                        value={carterasOpciones.includes(formData.cartera) ? formData.cartera : (formData.cartera ? 'OTRA_OPCION' : '')}
                        onChange={(e) => {
                            clearError('cartera');
                            if (e.target.value === 'OTRA_OPCION') {
                                setCustomCartera(true);
                                setFormData({ ...formData, cartera: '' });
                            } else {
                                setFormData({ ...formData, cartera: e.target.value });
                            }
                        }}
                        required
                        className={getFieldClass('cartera')}
                    >
                        <option value="" disabled>Seleccioná...</option>
                        {carterasOpciones.map(c => <option key={c} value={c}>{c}</option>)}
                        {formData.cartera && !carterasOpciones.includes(formData.cartera) && (
                            <option value={formData.cartera}>{formData.cartera}</option>
                        )}
                        <option value="OTRA_OPCION">+ Escribir otra...</option>
                    </select>
                )}
                {errors?.cartera && <p className="text-red-400 text-xs mt-1 font-medium">{errors.cartera}</p>}
            </div>
            {/* Monto + TNA */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="monto-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        MONTO EN ARS
                    </label>
                    <input
                        id="monto-caucion"
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 500000"
                        value={formData.montoARS}
                        onChange={(e) => {
                            clearError('montoARS');
                            setFormData({ ...formData, montoARS: e.target.value });
                        }}
                        required
                        className={getFieldClass('montoARS')}
                    />
                    {errors?.montoARS && <p className="text-red-400 text-xs mt-1 font-medium">{errors.montoARS}</p>}
                </div>
                <div>
                    <label htmlFor="tna-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        TNA (%)
                    </label>
                    <input
                        id="tna-caucion"
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 40"
                        value={formData.tna}
                        onChange={(e) => {
                            clearError('tna');
                            setFormData({ ...formData, tna: e.target.value });
                        }}
                        required
                        className={getFieldClass('tna')}
                    />
                    {errors?.tna && <p className="text-red-400 text-xs mt-1 font-medium">{errors.tna}</p>}
                </div>
            </div>
            {/* Plazo + Fecha de inicio */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="plazo-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        PLAZO (DÍAS)
                    </label>
                    <input
                        id="plazo-caucion"
                        type="number"
                        min="1"
                        placeholder="Ej: 7"
                        value={formData.plazo}
                        onChange={(e) => {
                            clearError('plazo');
                            setFormData({ ...formData, plazo: e.target.value });
                        }}
                        required
                        className={getFieldClass('plazo')}
                    />
                    {errors?.plazo && <p className="text-red-400 text-xs mt-1 font-medium">{errors.plazo}</p>}
                </div>
                <div>
                    <label htmlFor="fecha-inicio-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        FECHA INICIO
                    </label>
                    <input
                        id="fecha-inicio-caucion"
                        type="date"
                        value={formData.fechaInicio}
                        onChange={(e) => {
                            clearError('fechaInicio');
                            clearError('fecha');
                            setFormData({ ...formData, fechaInicio: e.target.value, fecha: e.target.value });
                        }}
                        required
                        className={errors?.fechaInicio || errors?.fecha ? `${inputClasses} border-red-500 ring-2 ring-red-500/20` : inputClasses}
                    />
                    {(errors?.fechaInicio || errors?.fecha) && <p className="text-red-400 text-xs mt-1 font-medium">{errors.fechaInicio || errors.fecha}</p>}
                </div>
            </div>
            {/* Resumen calculado */}
            {caucionCalc && (
                <div className={`rounded-2xl p-4 space-y-2 text-sm ${isGlass ? 'bg-blue-500/15 border border-blue-400/30' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex justify-between">
                        <span className={isGlass ? 'text-blue-200' : 'text-blue-700'}>Vencimiento</span>
                        <span className={`font-bold ${isGlass ? 'text-white' : 'text-blue-900'}`}>
                            {caucionCalc.fechaVencimiento ? `${caucionCalc.fechaVencimiento.split('-')[2]}/${caucionCalc.fechaVencimiento.split('-')[1]}/${caucionCalc.fechaVencimiento.split('-')[0]}` : '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className={isGlass ? 'text-blue-200' : 'text-blue-700'}>Interés esperado</span>
                        <span className={`font-bold ${isGlass ? 'text-green-300' : 'text-green-700'}`}>
                            + {caucionCalc.interesEsperadoARS.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className={`flex justify-between border-t pt-2 ${isGlass ? 'border-blue-400/30' : 'border-blue-200'}`}>
                        <span className={`font-bold ${isGlass ? 'text-blue-100' : 'text-blue-800'}`}>Total a cobrar</span>
                        <span className={`font-black ${isGlass ? 'text-white' : 'text-blue-900'}`}>
                            {caucionCalc.montoTotalEsperadoARS.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            )}
            {/* Nota */}
            <div>
                <label htmlFor="nota-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                    NOTA (OPCIONAL)
                </label>
                <input
                    id="nota-caucion"
                    type="text"
                    placeholder="Opcional"
                    value={formData.nota}
                    onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                    className={inputClasses}
                />
            </div>
        </div>
    );
}
