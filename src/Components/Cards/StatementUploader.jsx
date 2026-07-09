import React, { useState, useCallback, useRef } from 'react';
import { UploadCloud, FileText, Lock, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, Download, MousePointer, ArrowRight } from 'lucide-react';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import { analyzeStatement } from '../../services/aiService';

const VISA_URL = 'https://mycards.prismamediosdepago.com/';

const steps = [
    { icon: ExternalLink, label: 'Abrí el sitio de Visa', detail: 'Tocá el botón de abajo' },
    { icon: Lock, label: 'Ingresá con tu usuario', detail: 'Usuario y contraseña de Prisma' },
    { icon: Download, label: 'Descargá el PDF', detail: 'Buscá tu resumen y descargalo' },
    { icon: MousePointer, label: 'Volvé aquí y subí el PDF', detail: 'Usá el botón de abajo' },
];

const VisaDownloadGuide = () => {
    const [isOpen, setIsOpen] = useState(true);


    return (
        <div className="w-full max-w-xl mx-auto mb-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 overflow-hidden shadow-sm">
            {/* Header */}
            <button aria-label="Acción" type="button"
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left"
            >
                <div className="flex items-center gap-2.5">
                    <span className="text-lg">💳</span>
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        ¿Cómo bajo mi resumen de Visa?
                    </span>
                </div>
                {isOpen
                    ? <ChevronUp className="w-4 h-4 text-blue-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-blue-500 shrink-0" />
                }
            </button>

            {/* Body */}
            {isOpen && (
                <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Steps */}
                    <ol className="space-y-2.5 mb-4">
                        {steps.map((step, i) => (
                            <li key={step.label} className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
                                        {step.label}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {step.detail}
                                    </p>
                                </div>
                                {i < steps.length - 1 && (
                                    <ArrowRight className="w-3.5 h-3.5 text-blue-300 shrink-0 hidden sm:block" />
                                )}
                            </li>
                        ))}
                    </ol>

                    {/* CTA Button */}
                    <a
                        href={VISA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Ir al sitio de Visa / Prisma
                    </a>

                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2.5">
                        Se abre en una nueva pestaña. Volvé aquí cuando hayas descargado el PDF.
                    </p>
                </div>
            )}
        </div>
    );
};

const StatementUploader = ({ onAnalysisComplete }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [error, setError] = useState(null);
    const [needsPassword, setNeedsPassword] = useState(false);
    const [password, setPassword] = useState('');
    const currentFile = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const processFile = async (file, pdfPassword = null) => {
        if (file.type !== 'application/pdf') {
            setError('Por favor sube un archivo PDF válido.');
            return;
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setError('El archivo es muy grande. El tamaño máximo es 10MB.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setNeedsPassword(false);

        try {
            setProcessingStep('Leyendo archivo localmente...');
            const text = await extractTextFromPDF(file, pdfPassword);
            
            setProcessingStep('Analizando consumos con IA...');
            const analysisResult = await analyzeStatement(text);

            currentFile.current = null;
            setPassword('');
            if (onAnalysisComplete) onAnalysisComplete(analysisResult);
        } catch (err) {
            if (err.message === 'PASSWORD_REQUIRED' || err.message === 'PASSWORD_INCORRECT') {
                setNeedsPassword(true);
                currentFile.current = file;
                setError(err.message === 'PASSWORD_INCORRECT' ? 'Contraseña incorrecta. Intentá de nuevo.' : null);
            } else {
                setError(err.message);
                setPassword('');
            }
        } finally {
            setIsProcessing(false);
            setIsDragging(false);
            setProcessingStep('');
        }
    };

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            setError('Por favor ingresá la contraseña.');
            return;
        }
        processFile(currentFile.current, password);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
            // Limpiamos el input para permitir subir el mismo archivo dos veces seguidas
            e.target.value = null;
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto my-6">
            <VisaDownloadGuide />

            {error && !needsPassword && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 flex flex-col items-center justify-center gap-6
                    ${isDragging
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 scale-[1.02]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }
                    ${isProcessing ? 'opacity-70 pointer-events-none' : ''}
                    bg-white dark:bg-slate-900 backdrop-blur-sm shadow-sm
                `}
            >
                <input
                    type="file"
                    id="pdf-upload"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleChange}
                />

                {isProcessing ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                            {processingStep}
                        </p>
                    </div>
                ) : needsPassword ? (
                    <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400 mb-2 shadow-sm">
                            <Lock className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">PDF Protegido</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {error || 'El resumen requiere contraseña (suele ser tu DNI).'}
                            </p>
                        </div>
                        <div className="flex w-full gap-2 mt-2">
                            <input id="input-field"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                                placeholder="Ingresá la contraseña"
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-inner"
                                autoFocus
                            />
                            <button aria-label="Acción" type="button"
                                onClick={handlePasswordSubmit}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg"
                            >
                                Abrir
                            </button>
                        </div>
                        <button aria-label="Acción" type="button" 
                            onClick={() => { setNeedsPassword(false); setError(null); currentFile.current = null; }}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-2 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform">
                            <FileText className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Procesar Resumen con IA
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Arrastrá tu PDF aquí o
                            </p>
                        </div>
                        <label
                            htmlFor="pdf-upload"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-medium cursor-pointer transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 mt-2"
                        >
                            <UploadCloud className="w-4 h-4" />
                            Seleccionar archivo
                        </label>
                        <p className="text-xs text-slate-400 mt-3 font-medium">
                            <Lock className="w-3 h-3 inline mr-1" />
                            Tus datos se procesan localmente de forma segura.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatementUploader;
