import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, Zap } from 'lucide-react';
import { analyzeDriverImage } from '../../services/groqService';

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxarVngNVgUcUQGV51Ssu2BVCX_Yvj46zT65jZA3kRztFcHvynxA8EgpU1S1mQkIeMG/exec";

export default function DriverScanner() {
    const [imagePreview, setImagePreview] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, analyzing, sending, success, error
    const [resultData, setResultData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
            processImage(reader.result);
        };
        reader.readAsDataURL(file);
        
        // Limpiar el input para permitir seleccionar la misma foto de nuevo si hay error
        e.target.value = null; 
    };

    const processImage = async (base64Image) => {
        try {
            setStatus('analyzing');
            setErrorMessage('');
            
            // 1. Mandar a Groq
            const extractedData = await analyzeDriverImage(base64Image);
            setResultData(extractedData);
            
            // 2. Mandar al Webhook
            setStatus('sending');
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: JSON.stringify(extractedData)
            });

            if (!response.ok) throw new Error("Error enviando a Google Sheets");
            
            setStatus('success');
            
        } catch (error) {
            console.error("Error procesando imagen:", error);
            setStatus('error');
            setErrorMessage(error.message || "Ocurrió un error inesperado.");
        }
    };

    const reset = () => {
        setImagePreview(null);
        setStatus('idle');
        setResultData(null);
    };

    return (
        <>
            {/* INPUT INVISIBLE */}
            <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
            />

            {/* BOTÓN FLOTANTE PERSISTENTE (Solo visible cuando NO hay imagen procesándose) */}
            {!imagePreview && (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-center text-white transition-transform active:scale-90 hover:scale-105 border-2 border-white/20"
                >
                    <Zap size={24} className="animate-pulse" />
                </button>
            )}

            {/* MODAL PANTALLA COMPLETA (Solo visible cuando hay imagen) */}
            {imagePreview && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                        
                        {/* Header con botón de cerrar (solo si dio error o éxito) */}
                        {(status === 'success' || status === 'error') && (
                            <button onClick={reset} className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-md transition-colors">
                                <X size={20} />
                            </button>
                        )}

                        <div className="relative bg-gray-900 flex-1 flex items-center justify-center min-h-[300px]">
                            <img 
                                src={imagePreview} 
                                alt="Scanned" 
                                className={`max-h-[50vh] w-auto object-contain transition-all duration-500 ${status === 'analyzing' ? 'opacity-40 blur-sm scale-105' : 'opacity-100'}`} 
                            />
                            
                            {status === 'analyzing' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500 bg-black/40 backdrop-blur-sm">
                                    <Loader2 size={50} className="animate-spin mb-4" />
                                    <span className="font-black text-lg text-white drop-shadow-md tracking-wide">La IA está leyendo...</span>
                                    <span className="text-white/70 text-sm mt-1">Identificando datos</span>
                                </div>
                            )}

                            {status === 'sending' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-400 bg-black/40 backdrop-blur-sm">
                                    <Upload size={50} className="animate-bounce mb-4" />
                                    <span className="font-black text-lg text-white drop-shadow-md tracking-wide">Guardando en Sheets...</span>
                                </div>
                            )}
                        </div>

                        {/* RESULTADOS O ERRORES */}
                        <div className="p-6 bg-white shrink-0">
                            {status === 'success' && (
                                <div className="text-center animate-in slide-in-from-bottom-4">
                                    <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-3" />
                                    <h3 className="font-black text-emerald-600 text-xl mb-1">¡Guardado con éxito!</h3>
                                    <p className="text-gray-600 text-sm mb-5">
                                        Categoría: <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{resultData?.category}</span>
                                    </p>
                                    
                                    <button 
                                        onClick={reset}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 text-lg"
                                    >
                                        Listo
                                    </button>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="text-center animate-in slide-in-from-bottom-4">
                                    <AlertCircle size={56} className="text-rose-500 mx-auto mb-3" />
                                    <h3 className="font-black text-rose-600 text-xl mb-1">Hubo un problema</h3>
                                    <p className="text-rose-500/80 text-sm mb-5 leading-tight">{errorMessage}</p>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 text-lg"
                                    >
                                        Intentar con otra foto
                                    </button>
                                </div>
                            )}

                            {(status === 'analyzing' || status === 'sending') && (
                                <div className="text-center py-4">
                                    <p className="text-gray-400 font-medium animate-pulse">Por favor esperá unos segundos...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
