import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Trash2, Plus, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useSavings } from '../../../savings/context/SavingsContext';
import { useUI } from '../../../context/UIContext';
import { analyzeSavingsCapture, convertFileToBase64 } from '../../../services/savingsCaptureService';

export default function ImportCaptureModal({ onClose, isGlass }) {
    const { carterasPersonalizadas, addBatchSavingsTransactions } = useSavings();
    const { showToast } = useUI();
    const fileInputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Step 1 state
    const [selectedCartera, setSelectedCartera] = useState(carterasPersonalizadas[0]?.nombre || 'General');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    
    // Step 2 state
    const [detectedItems, setDetectedItems] = useState([]);

    const getTodayLocalDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showToast("La imagen es demasiado grande. Máximo 5MB.", "error");
            return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!imageFile) return;
        setLoading(true);
        try {
            const base64 = await convertFileToBase64(imageFile);
            const items = await analyzeSavingsCapture(base64, selectedCartera);
            
            // Format data ensuring fallbacks
            const formatted = items.map((item, idx) => ({
                id: Date.now() + idx,
                ticker: item.ticker || '',
                especie: item.especie || item.ticker || '',
                cantidad: item.cantidad?.toString() || '0',
                precioUnitario: item.precioUnitario?.toString() || '0',
                monedaPrecio: item.monedaPrecio || 'ARS',
                tipo: item.tipo === 'venta' ? 'venta' : 'compra',
                cartera: selectedCartera,
                fecha: item.fecha || getTodayLocalDate(),
                nota: item.nota || ''
            }));
            
            setDetectedItems(formatted);
            setStep(2);
        } catch (error) {
            console.error(error);
            showToast("Error al analizar la imagen. Intenta de nuevo.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (id, field, value) => {
        setDetectedItems(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id) => {
        setDetectedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleAddItem = () => {
        setDetectedItems(prev => [...prev, {
            id: Date.now(),
            ticker: '',
            especie: '',
            cantidad: '0',
            precioUnitario: '0',
            monedaPrecio: 'ARS',
            tipo: 'compra',
            cartera: selectedCartera,
            fecha: getTodayLocalDate(),
            nota: ''
        }]);
    };

    const handleConfirm = async () => {
        if (detectedItems.length === 0) {
            showToast("No hay operaciones para importar.", "error");
            return;
        }

        const validItems = detectedItems.filter(item => item.ticker && item.cantidad > 0);
        if (validItems.length !== detectedItems.length) {
            showToast("Algunas filas inválidas fueron ignoradas (sin ticker o cantidad 0).", "warning");
        }

        if (validItems.length === 0) return;

        setLoading(true);
        try {
            const parsedItems = validItems.map(item => ({
                ...item,
                cantidad: parseFloat(item.cantidad),
                precioUnitario: parseFloat(item.precioUnitario)
            }));
            
            await addBatchSavingsTransactions(parsedItems);
            showToast(`¡Se importaron ${parsedItems.length} operaciones!`, "success");
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Error al guardar las operaciones.", "error");
        } finally {
            setLoading(false);
        }
    };

    const bgClass = isGlass ? 'bg-black/40 backdrop-blur-xl border border-white/10' : 'bg-white';
    const textClass = isGlass ? 'text-white' : 'text-gray-800';
    const inputClass = isGlass 
        ? 'bg-black/30 border border-white/20 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500' 
        : 'bg-gray-50 border border-gray-300 text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${bgClass}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className={`text-xl font-bold ${textClass}`}>
                        {step === 1 ? 'Importar captura' : step === 2 ? 'Revisar operaciones' : 'Confirmar'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                        <X className={`w-5 h-5 ${textClass}`} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 1 && (
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                                    ¿A qué cartera ingresarán estas operaciones?
                                </label>
                                <select
                                    value={selectedCartera}
                                    onChange={(e) => setSelectedCartera(e.target.value)}
                                    className={`w-full rounded-xl p-3 ${inputClass}`}
                                >
                                    {carterasPersonalizadas.map(c => (
                                        <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div 
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
                                    ${imagePreview ? 'border-green-500/50 bg-green-500/5' : 'border-white/20 hover:border-white/40'}
                                `}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                
                                {imagePreview ? (
                                    <div className="space-y-4">
                                        <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-lg" />
                                        <p className={`text-sm ${textClass}`}>Click para cambiar imagen</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Camera className="w-8 h-8 text-green-500" />
                                        </div>
                                        <div>
                                            <p className={`font-medium ${textClass}`}>Seleccionar captura de pantalla</p>
                                            <p className="text-sm text-gray-400 mt-1">JPG, PNG o WebP hasta 5MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!imageFile || loading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Analizar con IA
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-white/10">
                                <table className="w-full text-sm text-left">
                                    <thead className={`text-xs uppercase bg-black/20 ${textClass}`}>
                                        <tr>
                                            <th className="px-4 py-3">Ticker</th>
                                            <th className="px-4 py-3">Especie</th>
                                            <th className="px-4 py-3">Cant.</th>
                                            <th className="px-4 py-3">Precio U.</th>
                                            <th className="px-4 py-3">Moneda</th>
                                            <th className="px-4 py-3">Tipo</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detectedItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                                                    No se detectaron operaciones. Podés agregarlas manualmente.
                                                </td>
                                            </tr>
                                        ) : (
                                            detectedItems.map((item) => (
                                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-2 py-2">
                                                        <input type="text" value={item.ticker} onChange={e => handleItemChange(item.id, 'ticker', e.target.value)} className={`w-24 p-2 rounded-lg ${inputClass} uppercase`} placeholder="GGAL" />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input type="text" value={item.especie} onChange={e => handleItemChange(item.id, 'especie', e.target.value)} className={`w-32 p-2 rounded-lg ${inputClass}`} placeholder="Nombre..." />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input type="number" step="any" value={item.cantidad} onChange={e => handleItemChange(item.id, 'cantidad', e.target.value)} className={`w-24 p-2 rounded-lg ${inputClass}`} />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input type="number" step="any" value={item.precioUnitario} onChange={e => handleItemChange(item.id, 'precioUnitario', e.target.value)} className={`w-24 p-2 rounded-lg ${inputClass}`} />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <select value={item.monedaPrecio} onChange={e => handleItemChange(item.id, 'monedaPrecio', e.target.value)} className={`w-20 p-2 rounded-lg ${inputClass}`}>
                                                            <option value="ARS">ARS</option>
                                                            <option value="USD">USD</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <select value={item.tipo} onChange={e => handleItemChange(item.id, 'tipo', e.target.value)} className={`w-24 p-2 rounded-lg ${inputClass}`}>
                                                            <option value="compra">Compra/Ingreso</option>
                                                            <option value="venta">Venta/Egreso</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input type="date" value={item.fecha} onChange={e => handleItemChange(item.id, 'fecha', e.target.value)} className={`w-32 p-2 rounded-lg ${inputClass}`} />
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4">
                                <button onClick={handleAddItem} className="flex items-center gap-2 text-green-500 hover:text-green-400 font-medium px-4 py-2 hover:bg-green-500/10 rounded-xl transition-colors">
                                    <Plus className="w-4 h-4" />
                                    Agregar fila manual
                                </button>
                                
                                <div className="flex gap-3">
                                    <button onClick={() => setStep(1)} className={`px-6 py-2 rounded-xl font-medium border border-white/20 hover:bg-white/10 ${textClass}`}>
                                        Volver
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading || detectedItems.length === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                                    >
                                        {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <Check className="w-4 h-4" />}
                                        Importar {detectedItems.length} ops
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
