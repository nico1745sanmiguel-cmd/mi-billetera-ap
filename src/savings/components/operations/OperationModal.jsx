import React, { useState, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../../context/FinancialContext';

import TradeForm from './TradeForm';
import CaucionForm from './CaucionForm';
import CouponForm from './CouponForm';

export default function OperationModal({ onClose, isGlass, initialData }) {
    const { addSavingsTransaction, updateSavingsTransaction, savingsTransactions, carterasPersonalizadas } = useSavings();
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
        // campos cobro
        montoTotal: initialData?.tipo === 'cobro_cupon' || initialData?.tipo === 'amortizacion' ? initialData?.precioUnitario?.toString() : ''
    });

    const [fechaMode, setFechaMode] = useState('exacta');
    const [diasTenencia, setDiasTenencia] = useState('');
    const [customCartera, setCustomCartera] = useState(false);
    const [customEspecie, setCustomEspecie] = useState(false);

    // Autocompletado nativo extrayendo datos previos + configuradas + defaults
    const carterasOpciones = useMemo(() => {
        const set = new Set(['Efectivo', 'Balanz', 'Nexo', 'Binance']);
        (carterasPersonalizadas || []).forEach(c => set.add(c.nombre));
        (savingsTransactions || []).forEach(tx => {
            if (tx.cartera) set.add(tx.cartera);
        });
        return Array.from(set);
    }, [savingsTransactions, carterasPersonalizadas]);

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
            // Si no es fiat ni cobro ni ajuste, necesita precio
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
                    
                    {/* Tipo de Operación — fila 1 */}
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
                    {/* Tipos especiales — fila 2 */}
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

                    {isCaucion ? (
                        <CaucionForm 
                            formData={formData} setFormData={setFormData}
                            isGlass={isGlass} inputClasses={inputClasses}
                            carterasOpciones={carterasOpciones}
                            customCartera={customCartera} setCustomCartera={setCustomCartera}
                            caucionCalc={caucionCalc}
                        />
                    ) : isCobro ? (
                        <CouponForm
                            formData={formData} setFormData={setFormData}
                            isGlass={isGlass} inputClasses={inputClasses}
                            carterasOpciones={carterasOpciones} customCartera={customCartera} setCustomCartera={setCustomCartera}
                            especiesOpciones={especiesOpciones} customEspecie={customEspecie} setCustomEspecie={setCustomEspecie}
                            fechaMode={fechaMode} setFechaMode={setFechaMode}
                            diasTenencia={diasTenencia} setDiasTenencia={setDiasTenencia}
                        />
                    ) : (
                        <TradeForm
                            formData={formData} setFormData={setFormData}
                            isGlass={isGlass} inputClasses={inputClasses}
                            carterasOpciones={carterasOpciones} customCartera={customCartera} setCustomCartera={setCustomCartera}
                            especiesOpciones={especiesOpciones} customEspecie={customEspecie} setCustomEspecie={setCustomEspecie}
                            fechaMode={fechaMode} setFechaMode={setFechaMode}
                            diasTenencia={diasTenencia} setDiasTenencia={setDiasTenencia}
                            isMovimientoFiat={isMovimientoFiat}
                        />
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
