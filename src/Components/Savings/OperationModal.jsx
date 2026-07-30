import React, { useState, useMemo } from 'react';
import { X, Save, Clock } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';

export default function OperationModal({ onClose, isGlass, initialData }) {
    const { addSavingsTransaction, updateSavingsTransaction, savingsTransactions } = useSavings();
    const { dolarBlue } = useFinancial();
    const [loading, setLoading] = useState(false);

    // Valores iniciales
    const [formData, setFormData] = useState({
        tipo: initialData?.tipo || 'compra',
        cartera: initialData?.cartera || '',
        especie: initialData?.especie || '',
        cantidad: initialData?.cantidad?.toString() || '',
        precioUnitario: initialData?.precioUnitario?.toString() || '',
        monedaPrecio: initialData?.monedaPrecio || 'USD',
        fecha: initialData?.fecha 
            ? new Date(initialData.fecha).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
        nota: initialData?.nota || '',
        // campos caución
        montoARS: initialData?.montoARS?.toString() || '',
        tna: initialData?.tna?.toString() || '',
        plazo: initialData?.plazo?.toString() || '7',
        fechaInicio: initialData?.fechaInicio
            ? new Date(initialData.fechaInicio).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
    });

    const [fechaMode, setFechaMode] = useState('exacta');
    const [diasTenencia, setDiasTenencia] = useState('');

    // Autocompletado nativo extrayendo datos previos + defaults
    const carterasOpciones = useMemo(() => {
        const set = new Set(['Efectivo', 'Balanz', 'Nexo', 'Binance']);
        (savingsTransactions || []).forEach(tx => {
            if (tx.cartera) set.add(tx.cartera);
        });
        return Array.from(set);
    }, [savingsTransactions]);

    const especiesOpciones = useMemo(() => {
        const set = new Set(['ARS', 'USD', 'BTC', 'USDT', 'CEDEARs']);
        (savingsTransactions || []).forEach(tx => {
            if (tx.especie) set.add(tx.especie);
        });
        return Array.from(set);
    }, [savingsTransactions]);

    const isMovimientoFiat = formData.tipo === 'deposito' || formData.tipo === 'retiro';
    // cobro_cupon y amortizacion: solo registran el monto total recibido, sin modificar cantidad
    const isCobro = formData.tipo === 'cobro_cupon' || formData.tipo === 'amortizacion';
    const isCaucion = formData.tipo === 'caucion';

    // Cálculos automáticos de la caución
    const caucionCalc = useMemo(() => {
        if (!isCaucion) return null;
        const monto = parseFloat(formData.montoARS) || 0;
        const tna = parseFloat(formData.tna) || 0;
        const plazo = parseInt(formData.plazo) || 0;
        if (!monto || !tna || !plazo) return null;

        const interesEsperadoARS = monto * (tna / 100 / 365) * plazo;
        const montoTotalEsperadoARS = monto + interesEsperadoARS;

        const fechaVenc = new Date(formData.fechaInicio);
        fechaVenc.setDate(fechaVenc.getDate() + plazo);
        const fechaVencimiento = fechaVenc.toISOString().split('T')[0];

        return { interesEsperadoARS, montoTotalEsperadoARS, fechaVencimiento };
    }, [isCaucion, formData.montoARS, formData.tna, formData.plazo, formData.fechaInicio]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.cartera || !formData.fecha) return;
        
        if (isCaucion) {
            if (!formData.montoARS || !formData.tna || !formData.plazo) return;
        } else {
            if (!formData.especie) return;
            // cobros solo requieren monto total; el resto requieren cantidad
            if (!isCobro && !formData.cantidad) return;
            // Si no es fiat ni cobro, necesita precio
            if (!isMovimientoFiat && !isCobro && !formData.precioUnitario && formData.tipo !== 'ajuste') return;
        }

        const parseNumber = (val) => {
            if (!val) return 0;
            let str = val.toString().trim();
            
            const lastComma = str.lastIndexOf(',');
            const lastDot = str.lastIndexOf('.');
            
            if (lastComma > -1 && lastDot > -1) {
                if (lastComma > lastDot) {
                    str = str.replace(/\./g, '').replace(',', '.');
                } else {
                    str = str.replace(/,/g, '');
                }
            } else if (lastComma > -1) {
                if (str.split(',').length > 2) {
                    str = str.replace(/,/g, '');
                } else {
                    str = str.replace(',', '.');
                }
            } else if (lastDot > -1) {
                const parts = str.split('.');
                if (parts.length > 2) {
                    str = str.replace(/\./g, '');
                } else {
                    if (parts[1].length === 3 && parts[0] !== '0') {
                        str = str.replace('.', '');
                    }
                }
            }
            return parseFloat(str) || 0;
        };

        const cantidadParsed = parseNumber(formData.cantidad);
        const precioParsed = parseNumber(formData.precioUnitario);
        const montoTotalParsed = parseNumber(formData.montoTotal);

        setLoading(true);
        try {
            let payload;

            if (isCaucion) {
                const monto = parseFloat(formData.montoARS) || 0;
                const tna = parseFloat(formData.tna) || 0;
                const plazo = parseInt(formData.plazo) || 0;
                const interesEsperadoARS = monto * (tna / 100 / 365) * plazo;
                const montoTotalEsperadoARS = monto + interesEsperadoARS;
                const fechaVenc = new Date(formData.fechaInicio);
                fechaVenc.setDate(fechaVenc.getDate() + plazo);

                payload = {
                    tipo: 'caucion',
                    cartera: formData.cartera.trim(),
                    especie: 'ARS',
                    montoARS: monto,
                    tna,
                    plazo,
                    fechaInicio: new Date(formData.fechaInicio).toISOString(),
                    fechaVencimiento: fechaVenc.toISOString(),
                    interesEsperadoARS,
                    montoTotalEsperadoARS,
                    fecha: new Date(formData.fechaInicio).toISOString(),
                    nota: formData.nota.trim()
                };
            } else if (isCobro) {
                // Para cobros: cantidad = 1, precioUnitario = monto total recibido
                // Así el contexto calcula valorOperacionUSD = 1 * montoTotal = montoTotal
                payload = {
                    tipo: formData.tipo,
                    cartera: formData.cartera.trim(),
                    especie: formData.especie.trim().toUpperCase(),
                    cantidad: 1,
                    precioUnitario: montoTotalParsed,
                    monedaPrecio: formData.monedaPrecio,
                    fecha: new Date(formData.fecha).toISOString(),
                    nota: formData.nota.trim()
                };
            } else {
                payload = {
                    tipo: formData.tipo,
                    cartera: formData.cartera.trim(),
                    especie: formData.especie.trim().toUpperCase(),
                    cantidad: cantidadParsed,
                    precioUnitario: isMovimientoFiat ? 1 : precioParsed,
                    monedaPrecio: isMovimientoFiat ? formData.especie.toUpperCase() : formData.monedaPrecio,
                    fecha: new Date(formData.fecha).toISOString(),
                    nota: formData.nota.trim()
                };
            }

            if (initialData?.id) {
                await updateSavingsTransaction(initialData.id, payload);
            } else {
                await addSavingsTransaction(payload);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar la operación");
        }
        setLoading(false);
    };

    const inputClasses = `w-full p-3 rounded-xl border transition-all outline-none ${
        isGlass 
        ? 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-green-400 focus:bg-white/20' 
        : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10'
    }`;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 sm:pt-16 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
            <div className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl animate-scale-in ${
                isGlass ? 'bg-[#0f0c29]/90 border border-white/20 backdrop-blur-xl' : 'bg-white'
            }`}>
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-black ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                        {initialData ? 'Editar Operación' : 'Nueva Operación'}
                    </h2>
                    <button aria-label="Cerrar" type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Tipo de Operación — fila 1: compra/venta/deposito/retiro */}
                    <div className="grid grid-cols-2 gap-2">
                        {['compra', 'venta', 'deposito', 'retiro'].map(t => (
                            <button aria-label="Acción" type="button" key={t}
                                onClick={() => setFormData({...formData, tipo: t})}
                                className={`p-2 text-sm font-bold rounded-xl border capitalize transition-all ${
                                    formData.tipo === t
                                    ? 'bg-green-500 border-green-500 text-white shadow-md'
                                    : isGlass 
                                        ? 'border-white/20 text-white/60 hover:bg-white/10' 
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    {/* Tipos especiales de bono — fila 2 */}
                    <div className="grid grid-cols-3 gap-2">
                        {[{ id: 'cobro_cupon', label: '🏦 Cupón' }, { id: 'amortizacion', label: '📉 Amort.' }, { id: 'caucion', label: '⏱ Caución' }].map(({ id, label }) => (
                            <button aria-label="Acción" type="button" key={id}
                                onClick={() => setFormData({...formData, tipo: id})}
                                className={`p-2 text-sm font-bold rounded-xl border transition-all ${
                                    formData.tipo === id
                                    ? id === 'caucion'
                                        ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                                        : 'bg-amber-500 border-amber-500 text-white shadow-md'
                                    : isGlass 
                                        ? 'border-white/20 text-white/60 hover:bg-white/10' 
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {isCobro && (
                        <p className={`text-xs px-1 -mt-2 ${isGlass ? 'text-amber-300/80' : 'text-amber-600'}`}>
                            Registrá el dinero recibido. No modifica la cantidad del activo.
                        </p>
                    )}
                    {isCaucion && (
                        <p className={`text-xs px-1 -mt-2 ${isGlass ? 'text-blue-300/80' : 'text-blue-600'}`}>
                            Colocá pesos a préstamo en el mercado bursátil. Se registra el capital y la tasa acordada.
                        </p>
                    )}

                    {/* ──── FORMULARIO ESPECIAL PARA CAUCIÓN ──── */}
                    {isCaucion ? (
                        <div className="space-y-4">
                            {/* Cartera */}
                            <div>
                                <label htmlFor="cartera-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                                    BROKER / CARTERA
                                </label>
                                <input
                                    id="cartera-caucion"
                                    type="text"
                                    list="carteras-list-c"
                                    placeholder="Ej: Balanz"
                                    value={formData.cartera}
                                    onChange={(e) => setFormData({...formData, cartera: e.target.value})}
                                    required
                                    className={inputClasses}
                                />
                                <datalist id="carteras-list-c">
                                    {carterasOpciones.map(c => <option key={c} value={c} />)}
                                </datalist>
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
                                        onChange={(e) => setFormData({...formData, montoARS: e.target.value})}
                                        required
                                        className={inputClasses}
                                    />
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
                                        onChange={(e) => setFormData({...formData, tna: e.target.value})}
                                        required
                                        className={inputClasses}
                                    />
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
                                        onChange={(e) => setFormData({...formData, plazo: e.target.value})}
                                        required
                                        className={inputClasses}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="fecha-inicio-caucion" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                                        FECHA INICIO
                                    </label>
                                    <input
                                        id="fecha-inicio-caucion"
                                        type="date"
                                        value={formData.fechaInicio}
                                        onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})}
                                        required
                                        className={inputClasses}
                                    />
                                </div>
                            </div>
                            {/* Resumen calculado */}
                            {caucionCalc && (
                                <div className={`rounded-2xl p-4 space-y-2 text-sm ${
                                    isGlass ? 'bg-blue-500/15 border border-blue-400/30' : 'bg-blue-50 border border-blue-200'
                                }`}>
                                    <div className="flex justify-between">
                                        <span className={isGlass ? 'text-blue-200' : 'text-blue-700'}>Vencimiento</span>
                                        <span className={`font-bold ${isGlass ? 'text-white' : 'text-blue-900'}`}>
                                            {new Date(caucionCalc.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-AR')}
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
                                    onChange={(e) => setFormData({...formData, nota: e.target.value})}
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                    ) : (
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
                                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
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
                                    setFormData({...formData, fecha: dt.toISOString().split('T')[0]});
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
                            <input
                                id="cartera"
                                type="text"
                                list="carteras-list"
                                placeholder="Ej: Nexo"
                                value={formData.cartera}
                                onChange={(e) => setFormData({...formData, cartera: e.target.value})}
                                required
                                className={inputClasses}
                            />
                            <datalist id="carteras-list">
                                {carterasOpciones.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        
                        <div>
                            <label htmlFor="especie" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                                ACTIVO (TICKER)
                            </label>
                            <input
                                id="especie"
                                type="text"
                                list="especies-list"
                                placeholder="Ej: BTC, AAPL"
                                value={formData.especie}
                                onChange={(e) => setFormData({...formData, especie: e.target.value.toUpperCase()})}
                                required
                                className={inputClasses}
                            />
                            <datalist id="especies-list">
                                {especiesOpciones.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Cantidad — solo para operaciones normales */}
                    {!isCobro && (
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
                            onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                            required={!isCobro}
                            className={inputClasses}
                        />
                    </div>
                    )}

                    {/* Monto total recibido — solo para cobros */}
                    {isCobro && (
                    <div>
                        <label htmlFor="montoTotal" className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                            MONTO TOTAL RECIBIDO
                        </label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    id="montoTotal"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ej: 850 o 850,50"
                                    value={formData.montoTotal || ''}
                                    onChange={(e) => setFormData({...formData, montoTotal: e.target.value})}
                                    required
                                    className={inputClasses}
                                />
                            </div>
                            <div className="w-1/3">
                                <select
                                    value={formData.monedaPrecio}
                                    onChange={(e) => setFormData({...formData, monedaPrecio: e.target.value})}
                                    className={inputClasses}
                                >
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    )}

                    {!isMovimientoFiat && !isCobro && (
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
                                    onChange={(e) => setFormData({...formData, precioUnitario: e.target.value})}
                                    required={!isMovimientoFiat}
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
                                    onChange={(e) => setFormData({...formData, monedaPrecio: e.target.value})}
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
                            onChange={(e) => setFormData({...formData, nota: e.target.value})}
                            className={inputClasses}
                        />
                    </div>
                    {/* fin bloque no-caucion */}
                    </>
                    )}


                    <button aria-label="Acción"
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                {initialData ? 'Guardar Cambios'
                                 : formData.tipo === 'compra' ? 'Registrar Compra' 
                                 : formData.tipo === 'venta' ? 'Registrar Venta'
                                 : formData.tipo === 'deposito' ? 'Registrar Ingreso'
                                 : formData.tipo === 'cobro_cupon' ? 'Registrar Cupón'
                                 : formData.tipo === 'amortizacion' ? 'Registrar Amortización'
                                 : formData.tipo === 'caucion' ? 'Registrar Caución'
                                 : 'Registrar Retiro'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
