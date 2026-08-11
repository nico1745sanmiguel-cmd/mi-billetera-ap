import React from 'react';
import { X } from 'lucide-react';

export default function TradeForm({
    formData,
    setFormData,
    isGlass,
    inputClasses,
    carterasOpciones,
    customCartera,
    setCustomCartera,
    especiesOpciones,
    customEspecie,
    setCustomEspecie,
    fechaMode,
    setFechaMode,
    diasTenencia,
    setDiasTenencia,
    isMovimientoFiat
}) {
    return (
        <>
            {/* Fecha */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="fecha" className={`block text-xs font-bold ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        FECHA DE LA OPERACIÓN
                    </label>
                    <button
                        type="button"
                        onClick={() => setFechaMode(m => m === 'exacta' ? 'dias' : 'exacta')}
                        className="text-xs text-green-500 font-bold hover:underline"
                    >
                        {fechaMode === 'exacta' ? 'Usar días de tenencia' : 'Usar fecha exacta'}
                    </button>
                </div>
                {fechaMode === 'exacta' ? (
                    <input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        required
                        className={inputClasses}
                    />
                ) : (
                    <input
                        type="number"
                        placeholder="Ej: 45 (calcula la fecha hacia atrás)"
                        value={diasTenencia}
                        onChange={(e) => {
                            setDiasTenencia(e.target.value);
                            const d = parseInt(e.target.value) || 0;
                            const dt = new Date();
                            dt.setDate(dt.getDate() - d);
                            setFormData({ ...formData, fecha: dt.toISOString().split('T')[0] });
                        }}
                        required
                        className={inputClasses}
                    />
                )}
                {fechaMode === 'dias' && (
                    <div className={`text-xs mt-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                        Fecha calculada: {new Date(formData.fecha).toLocaleDateString('es-AR')}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="cartera" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        CARTERA / BROKER
                    </label>
                    {customCartera ? (
                        <div className="flex gap-2">
                            <input
                                id="cartera"
                                type="text"
                                placeholder="Escribí..."
                                value={formData.cartera}
                                onChange={(e) => setFormData({ ...formData, cartera: e.target.value })}
                                required
                                className={inputClasses}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => { setCustomCartera(false); setFormData({ ...formData, cartera: '' }); }}
                                className={`px-3 rounded-xl transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <select
                            id="cartera"
                            value={carterasOpciones.includes(formData.cartera) ? formData.cartera : (formData.cartera ? 'OTRA_OPCION' : '')}
                            onChange={(e) => {
                                if (e.target.value === 'OTRA_OPCION') {
                                    setCustomCartera(true);
                                    setFormData({ ...formData, cartera: '' });
                                } else {
                                    setFormData({ ...formData, cartera: e.target.value });
                                }
                            }}
                            required
                            className={inputClasses}
                        >
                            <option value="" disabled>Seleccioná...</option>
                            {carterasOpciones.map(c => <option key={c} value={c}>{c}</option>)}
                            {formData.cartera && !carterasOpciones.includes(formData.cartera) && (
                                <option value={formData.cartera}>{formData.cartera}</option>
                            )}
                            <option value="OTRA_OPCION">+ Escribir otra...</option>
                        </select>
                    )}
                </div>

                <div>
                    <label htmlFor="especie" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                        ACTIVO (TICKER)
                    </label>
                    {customEspecie ? (
                        <div className="flex gap-2">
                            <input
                                id="especie"
                                type="text"
                                placeholder="Ej: BTC"
                                value={formData.especie}
                                onChange={(e) => setFormData({ ...formData, especie: e.target.value.toUpperCase() })}
                                required
                                className={inputClasses}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => { setCustomEspecie(false); setFormData({ ...formData, especie: '' }); }}
                                className={`px-3 rounded-xl transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <select
                            id="especie"
                            value={especiesOpciones.includes(formData.especie) ? formData.especie : (formData.especie ? 'OTRA_OPCION' : '')}
                            onChange={(e) => {
                                if (e.target.value === 'OTRA_OPCION') {
                                    setCustomEspecie(true);
                                    setFormData({ ...formData, especie: '' });
                                } else {
                                    setFormData({ ...formData, especie: e.target.value });
                                }
                            }}
                            required
                            className={inputClasses}
                        >
                            <option value="" disabled>Seleccioná...</option>
                            {especiesOpciones.map(c => <option key={c} value={c}>{c}</option>)}
                            {formData.especie && !especiesOpciones.includes(formData.especie) && (
                                <option value={formData.especie}>{formData.especie}</option>
                            )}
                            <option value="OTRA_OPCION">+ Escribir otra...</option>
                        </select>
                    )}
                </div>
            </div>

            {/* Cantidad */}
            <div>
                <label htmlFor="cantidad" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                    CANTIDAD
                </label>
                <input
                    id="cantidad"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 15.5 o 15,5"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    required
                    className={inputClasses}
                />
            </div>

            {!isMovimientoFiat && (
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label htmlFor="precioUnitario" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                            PRECIO UNITARIO
                        </label>
                        <input
                            id="precioUnitario"
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej: 15000 o 15000,50"
                            value={formData.precioUnitario}
                            onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                            required={!isMovimientoFiat && formData.tipo !== 'ajuste'}
                            className={inputClasses}
                        />
                    </div>
                    <div className="w-1/3">
                        <label htmlFor="monedaPrecio" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                            MONEDA
                        </label>
                        <select
                            id="monedaPrecio"
                            value={formData.monedaPrecio}
                            onChange={(e) => setFormData({ ...formData, monedaPrecio: e.target.value })}
                            className={inputClasses}
                        >
                            <option value="USD">USD</option>
                            <option value="ARS">ARS</option>
                        </select>
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="nota" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                    NOTAS / COMISIONES
                </label>
                <input
                    id="nota"
                    type="text"
                    placeholder="Opcional"
                    value={formData.nota}
                    onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                    className={inputClasses}
                />
            </div>
        </>
    );
}
