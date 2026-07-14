import React, { useState, useRef, useCallback } from 'react';
import { X, Camera, Loader2, CheckCircle2, ChevronDown, Sparkles, AlertTriangle, Edit3, Plus, Trash2 } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { analyzeSavingsCapture } from '../../services/groqService';

const CARTERAS_DEFAULT = ['Efectivo', 'Balanz', 'Nexo', 'Binance', 'MercadoPago'];

// Mapeo de colores por tipo de especie
const getEspecieColor = (especie) => {
    const e = especie?.toUpperCase() || '';
    if (['BTC', 'ETH', 'SOL', 'ADA', 'DOT'].includes(e)) return 'from-orange-500 to-yellow-500';
    if (['USDT', 'USDC', 'DAI', 'USDP'].includes(e)) return 'from-green-500 to-teal-500';
    if (e === 'USD') return 'from-emerald-500 to-green-600';
    if (e === 'ARS') return 'from-blue-500 to-indigo-500';
    // Acciones
    return 'from-violet-500 to-purple-600';
};

// ─── Paso 1: Upload de imagen ───────────────────────────────────────────────
function StepUpload({ onImageReady, isGlass }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const processFile = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            // Comprimir antes de enviar
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 1200;
                let { width, height } = img;
                if (width > MAX) { height = (height * MAX) / width; width = MAX; }
                if (height > MAX) { width = (width * MAX) / height; height = MAX; }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                onImageReady(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }, [onImageReady]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        processFile(e.dataTransfer.files[0]);
    };

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const borderClass = dragOver
        ? 'border-violet-400 bg-violet-500/10'
        : (isGlass ? 'border-white/20 hover:border-white/40' : 'border-gray-200 hover:border-violet-300');

    return (
        <div className="space-y-5">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 mb-3">
                    <Sparkles size={12} />
                    IA de Visión
                </div>
                <h3 className={`text-lg font-black ${textColor}`}>Subí una captura de pantalla</h3>
                <p className={`text-sm mt-1 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                    De Nexo, Balanz, Binance u otra app de inversiones
                </p>
            </div>

            <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${borderClass}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <Camera size={40} className={`mx-auto mb-3 ${isGlass ? 'text-white/40' : 'text-gray-300'}`} />
                <p className={`font-bold ${textColor}`}>Arrastrá o hacé clic para subir</p>
                <p className={`text-xs mt-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>PNG, JPG — máx. 5 MB</p>
                <input
                    id="savings-image-input"
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => processFile(e.target.files[0])}
                />
            </div>

            <div className={`rounded-xl p-3 text-xs ${isGlass ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-500'}`}>
                <p className="font-semibold mb-1">💡 Ejemplos de capturas que puedo leer:</p>
                <ul className="space-y-0.5">
                    <li>• Pantalla de conversión de Nexo (USDT → MSFT)</li>
                    <li>• Detalle de tenencia de Balanz (nominales, precio, rendimiento)</li>
                    <li>• Confirmación de compra en Binance o Ripio</li>
                </ul>
            </div>
        </div>
    );
}

// ─── Paso 2: Loading ─────────────────────────────────────────────────────────
function StepLoading({ previewUrl, isGlass }) {
    return (
        <div className="flex flex-col items-center gap-6 py-6">
            {previewUrl && (
                <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="h-48 rounded-xl object-contain border border-white/10 shadow-lg"
                />
            )}
            <div className="flex flex-col items-center gap-3">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                    <Sparkles size={20} className="absolute inset-0 m-auto text-violet-400" />
                </div>
                <p className={`font-bold text-lg ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                    Analizando con IA...
                </p>
                <p className={`text-sm ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                    Groq está leyendo tu captura
                </p>
            </div>
        </div>
    );
}

// ─── Paso 3: Revisión de transacciones detectadas ───────────────────────────
function StepReview({ transacciones, setTransacciones, carteraInferida, previewUrl, isGlass, savingsTransactions }) {
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const inputCls = `w-full p-2 rounded-lg border text-sm font-semibold outline-none transition-colors ${
        isGlass
            ? 'bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-violet-400'
            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-violet-500'
    }`;

    // Opciones de cartera uniendo defaults + las que ya tiene el usuario
    const carterasOpts = Array.from(new Set([
        ...CARTERAS_DEFAULT,
        ...(savingsTransactions || []).map(t => t.cartera).filter(Boolean)
    ]));

    const updateTx = (idx, field, value) => {
        setTransacciones(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    const removeTx = (idx) => {
        setTransacciones(prev => prev.filter((_, i) => i !== idx));
    };

    const addTx = () => {
        setTransacciones(prev => [...prev, {
            tipo: 'ingreso', especie: '', apiTicker: null,
            cantidad: '', precioCompra: null, precioActual: null,
            moneda: 'USD', nota: 'Agregado manualmente', fecha: null
        }]);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                {previewUrl && (
                    <img src={previewUrl} alt="Captura" className="h-16 w-16 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                )}
                <div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-400" />
                        <h3 className={`font-black ${textColor}`}>
                            {transacciones.length} transacción{transacciones.length !== 1 ? 'es' : ''} detectada{transacciones.length !== 1 ? 's' : ''}
                        </h3>
                    </div>
                    {carteraInferida && (
                        <p className={`text-xs mt-0.5 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                            Cartera detectada: <span className="font-bold">{carteraInferida}</span>
                        </p>
                    )}
                    <p className={`text-xs ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                        Revisá y editá antes de guardar
                    </p>
                </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {transacciones.map((tx, idx) => (
                    <div
                        key={idx}
                        className={`rounded-2xl p-4 space-y-3 border ${
                            tx.tipo === 'ingreso'
                                ? (isGlass ? 'border-green-500/30 bg-green-500/5' : 'border-green-100 bg-green-50/50')
                                : (isGlass ? 'border-red-500/30 bg-red-500/5' : 'border-red-100 bg-red-50/50')
                        }`}
                    >
                        {/* Cabecera de la tarjeta */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded-full text-xs font-black bg-gradient-to-r ${getEspecieColor(tx.especie)} text-white`}>
                                    {tx.especie || '?'}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wide ${
                                    tx.tipo === 'ingreso' ? 'text-green-500' : 'text-red-500'
                                }`}>
                                    {tx.tipo === 'ingreso' ? '▲ Ingreso' : '▼ Egreso'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeTx(idx)}
                                className={`p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity ${isGlass ? 'hover:bg-red-500/20 text-white' : 'hover:bg-red-100 text-gray-500'}`}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Fila 1: Tipo + Cartera */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`block text-xs font-bold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Tipo</label>
                                <select
                                    id={`tx-tipo-${idx}`}
                                    value={tx.tipo}
                                    onChange={e => updateTx(idx, 'tipo', e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="ingreso">Ingreso</option>
                                    <option value="egreso">Egreso</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-xs font-bold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Cartera</label>
                                <input
                                    autoComplete="off"
                                    id={`tx-cartera-${idx}`}
                                    list={`carteras-list-${idx}`}
                                    value={tx.cartera || ''}
                                    onChange={e => updateTx(idx, 'cartera', e.target.value)}
                                    placeholder="Ej: Nexo"
                                    className={inputCls}
                                />
                                <datalist id={`carteras-list-${idx}`}>
                                    {carterasOpts.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                        </div>

                        {/* Fila 2: Especie + Cantidad */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`block text-xs font-bold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Especie (ticker)</label>
                                <input
                                    autoComplete="off"
                                    id={`tx-especie-${idx}`}
                                    value={tx.especie || ''}
                                    onChange={e => updateTx(idx, 'especie', e.target.value.toUpperCase())}
                                    placeholder="MSFT, BTC..."
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Cantidad</label>
                                <input
                                    autoComplete="off"
                                    id={`tx-cantidad-${idx}`}
                                    type="number"
                                    step="any"
                                    value={tx.cantidad || ''}
                                    onChange={e => updateTx(idx, 'cantidad', parseFloat(e.target.value) || '')}
                                    placeholder="0"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Fila 3: Precio compra + API ticker */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`block text-xs font-bold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                                    Precio compra ({tx.moneda || 'USD'})
                                </label>
                                <input
                                    autoComplete="off"
                                    id={`tx-precio-${idx}`}
                                    type="number"
                                    step="any"
                                    value={tx.precioCompra ?? ''}
                                    onChange={e => updateTx(idx, 'precioCompra', e.target.value === '' ? null : parseFloat(e.target.value))}
                                    placeholder="0.00"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                                    Ticker API
                                    <span className={`ml-1 font-normal text-xs ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>(cotización)</span>
                                </label>
                                <input
                                    autoComplete="off"
                                    id={`tx-apiTicker-${idx}`}
                                    value={tx.apiTicker || ''}
                                    onChange={e => updateTx(idx, 'apiTicker', e.target.value || null)}
                                    placeholder="MSFT, BYMA.BA..."
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Nota */}
                        {tx.nota && (
                            <p className={`text-xs italic ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                {tx.nota}{tx.fecha ? ` — ${tx.fecha}` : ''}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addTx}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 border-dashed transition-colors ${
                    isGlass ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80' : 'border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-600'
                }`}
            >
                <Plus size={16} />
                Agregar transacción manual
            </button>
        </div>
    );
}

// ─── Modal principal ─────────────────────────────────────────────────────────
export default function SavingsScannerModal({ onClose, isGlass }) {
    const { addSavingsTransaction, savingsTransactions } = useSavings();

    const [step, setStep] = useState('upload'); // upload | loading | review | success
    const [previewUrl, setPreviewUrl] = useState(null);
    const [transacciones, setTransacciones] = useState([]);
    const [carteraInferida, setCarteraInferida] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';

    const handleImageReady = async (base64) => {
        setPreviewUrl(base64);
        setStep('loading');
        setError(null);

        try {
            const result = await analyzeSavingsCapture(base64, '');
            const txs = (result.transacciones || []).map(tx => ({
                ...tx,
                cartera: result.carteraInferida || ''
            }));
            setTransacciones(txs);
            setCarteraInferida(result.carteraInferida || '');
            setStep('review');
        } catch (err) {
            console.error(err);
            setError('No pude analizar la imagen. Asegurate de que sea una captura clara de una app de inversiones.');
            setStep('upload');
        }
    };

    const handleConfirm = async () => {
        const valid = transacciones.filter(tx => tx.especie && tx.cantidad && tx.cartera);
        if (valid.length === 0) {
            setError('Completá al menos la cartera, especie y cantidad en cada transacción.');
            return;
        }

        setSaving(true);
        try {
            for (const tx of valid) {
                await addSavingsTransaction({
                    tipo: tx.tipo,
                    cartera: tx.cartera.trim(),
                    especie: tx.especie.trim().toUpperCase(),
                    cantidad: parseFloat(tx.cantidad),
                    precioCompra: tx.precioCompra || null,
                    precioActual: tx.precioActual || null,
                    apiTicker: tx.apiTicker || null,
                    moneda: tx.moneda || 'USD',
                    nota: tx.nota || '',
                    fecha: tx.fecha || null,
                });
            }
            setStep('success');
            setTimeout(onClose, 1800);
        } catch (err) {
            console.error(err);
            setError('Error al guardar. Intentá de nuevo.');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 animate-fade-in">
            <div
                className={`absolute inset-0 ${isGlass ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
                onClick={onClose}
            />

            <div className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-8 animate-slide-up shadow-2xl ${
                isGlass ? 'bg-[#0f0c29]/95 border border-white/15 backdrop-blur-xl' : 'bg-white'
            }`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-500/20">
                            <Sparkles size={20} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${textColor}`}>Escanear Captura</h2>
                            <p className={`text-xs ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                {step === 'upload' && 'Subí una foto de tu app'}
                                {step === 'loading' && 'Analizando...'}
                                {step === 'review' && 'Revisá y confirmá'}
                                {step === 'success' && '¡Guardado!'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Contenido según paso */}
                {step === 'upload' && (
                    <StepUpload onImageReady={handleImageReady} isGlass={isGlass} />
                )}
                {step === 'loading' && (
                    <StepLoading previewUrl={previewUrl} isGlass={isGlass} />
                )}
                {step === 'review' && (
                    <>
                        <StepReview
                            transacciones={transacciones}
                            setTransacciones={setTransacciones}
                            carteraInferida={carteraInferida}
                            previewUrl={previewUrl}
                            isGlass={isGlass}
                            savingsTransactions={savingsTransactions}
                        />
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={saving}
                            className="mt-5 w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold p-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            {saving ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 size={20} />
                                    Confirmar y guardar {transacciones.filter(t => t.especie && t.cantidad && t.cartera).length} movimiento{transacciones.filter(t => t.especie && t.cantidad && t.cartera).length !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </>
                )}
                {step === 'success' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 size={36} className="text-green-400" />
                        </div>
                        <p className={`text-xl font-black ${textColor}`}>¡Guardado!</p>
                        <p className={`text-sm ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                            Tus movimientos fueron registrados correctamente.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
