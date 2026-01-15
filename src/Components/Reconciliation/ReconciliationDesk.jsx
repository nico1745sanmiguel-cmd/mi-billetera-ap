import React, { useState, useEffect, useCallback } from 'react';
import { parseBankText } from '../../utils/bankParser';
import { extractTextFromPDF } from '../../utils/pdfParser';
import { useAliases } from '../../hooks/useAliases';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ReconciliationDesk = ({
    user,
    householdId,
    onBack,
    isGlass,
    cards,
    existingTransactions // Pasarle las transactions reales para cotejar
}) => {
    const [inputText, setInputText] = useState('');
    const [parsedItems, setParsedItems] = useState([]);
    const [step, setStep] = useState('input'); // input, review
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const { aliases, addAlias, findAlias } = useAliases(user?.uid, householdId);

    // --- HANDLERS PDF ---
    const processFile = async (file) => {
        if (file.type !== 'application/pdf') {
            alert("Por favor subí un archivo PDF.");
            return;
        }

        setIsProcessing(true);
        try {
            const text = await extractTextFromPDF(file);
            setInputText(prev => prev + '\n' + text); // Append text
            // Auto-analyze could be triggered here or let user review text first
        } catch (e) {
            console.error(e);
            alert("Error leyendo el PDF. Asegurate que no sea una imagen escaneada.");
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    // --- PROCESAMIENTO ---
    const handleAnalyze = () => {
        const items = parseBankText(inputText);

        // Enriquecer items con Aliases y Cotejo
        const enrichedItems = items.map((item, index) => {
            // 1. Buscar Alias
            const foundAlias = findAlias(item.description);

            // 2. Buscar Coincidencia Exacta (o cercana) en existentes
            // Criterio: Misma fecha (aprox +/- 2 dias) y Mismo monto (exacto o +/- 1%)
            const match = existingTransactions.find(t => {
                // TODO: Lógica de fecha robusta. Por ahora probamos monto exacto.
                // Ojo: t.amount suele ser negativo en gastos? O positivo? Chequear App.jsx
                // Asumiendo sistema guarda gastos positivos o negativos consistenty.
                // En este app, parece que 'amount' es el valor absoluto del gasto.
                const diff = Math.abs(parseFloat(t.amount) - item.amount);
                return diff < 1; // Tolerancia $1
            });

            return {
                ...item,
                id: `temp_${index}`,
                status: match ? 'matched' : (foundAlias ? 'recognized' : 'unknown'),
                details: match ? match : (foundAlias ? { category: foundAlias.categoryId, title: foundAlias.alias } : null),
                suggestedAlias: foundAlias ? foundAlias.alias : '',
                suggestedCategory: foundAlias ? foundAlias.categoryId : '',
            };
        });

        setParsedItems(enrichedItems);
        setStep('review');
    };

    // --- ACCIONES ---
    const handleConfirmItem = async (item, index) => {
        // Guardar como transacción real
        try {
            const payload = {
                amount: item.amount,
                description: item.suggestedAlias || item.description, // Usar alias bonito si existe
                category: item.suggestedCategory || 'varios',
                date: item.parsedDate.toISOString(),
                userId: user.uid,
                householdId: householdId || null,
                ownerId: user.uid,
                isShared: true, // Default
                type: 'expense', // Asumido
                installments: item.installmentsInfo ? parseInt(item.installmentsInfo.split('/')[1]) : 1, // "01/03" -> 3 cuotas
                // Si hay data de tarjeta, habría que inferir cual tarjeta es.
                // Por ahora lo dejamos genérico o pedimos select.
                paymentMethod: 'credit_card', // Asumimos tarjeta si viene de resumen
                rawImportData: item.description // Guardamos el original por si acaso
            };

            await addDoc(collection(db, 'transactions'), payload);

            // Si definió un nuevo alias en el camino, lo guardamos
            if (item.status === 'unknown' && item.newAliasName) {
                // Detectar patrón: Usamos las primeras 2 palabras o la descripción entera
                // Estrategia simple: Usar descripción entera como patrón
                await addAlias(item.description, item.newAliasName, item.suggestedCategory);
            }

            // Actualizar UI
            const newItems = [...parsedItems];
            newItems[index].status = 'saved';
            setParsedItems(newItems);

        } catch (e) {
            console.error("Error saving", e);
            alert("Error al guardar");
        }
    };

    // --- RENDER ---
    return (
        <div className={`p-4 min-h-screen ${isGlass ? 'text-white' : 'text-gray-800'}`}>

            {/* HEADER */}
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-white/10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-2xl font-bold">Conciliación Inteligente</h1>
            </div>

            {step === 'input' && (
                <div
                    className={`p-6 rounded-3xl transition-all border-2 border-dashed ${isDragging ? 'border-blue-400 bg-blue-500/10 scale-105' :
                            (isGlass ? 'bg-white/10 backdrop-blur-md border-white/20' : 'bg-white shadow-lg border-gray-300')
                        }`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    <div className="text-center mb-6 pointer-events-none">
                        <div className="w-16 h-16 mx-auto bg-blue-500/20 text-blue-300 rounded-full flex items-center justify-center mb-3">
                            {isProcessing ? (
                                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            )}
                        </div>
                        <p className="text-lg font-bold">Arrastrá tu PDF acá</p>
                        <p className="text-sm opacity-70">o pegá el texto abajo manualmente</p>
                    </div>

                    <textarea
                        className={`w-full h-48 p-4 rounded-xl mb-4 font-mono text-sm ${isGlass ? 'bg-black/30 text-white border border-white/10' : 'bg-gray-50 border-gray-200'}`}
                        placeholder={`Si no tenés PDF, copiá y pegá líneas del homebanking...`}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />

                    <button
                        onClick={handleAnalyze}
                        disabled={!inputText.trim() || isProcessing}
                        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Leyendo PDF...' : 'Analizar Gastos'}
                    </button>
                </div>
            )}

            {step === 'review' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-semibold">Resultados ({parsedItems.length})</h2>
                        <button onClick={() => setStep('input')} className="text-sm opacity-70 hover:opacity-100">Volver</button>
                    </div>

                    {parsedItems.map((item, index) => (
                        <div key={index} className={`p-4 rounded-2xl flex flex-col gap-3 ${item.status === 'saved' ? 'opacity-50' : ''
                            } ${isGlass ? 'bg-white/5 border border-white/5' : 'bg-white shadow-sm'
                            }`}>

                            {/* FILA SUPERIOR: DATOS ORIGINALES */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-mono text-xs opacity-60 mb-1">{item.originalDate}</div>
                                    <div className="font-bold text-sm">{item.description}</div>
                                </div>
                                <div className="font-mono font-bold text-lg">${item.amount.toLocaleString('es-AR')}</div>
                            </div>

                            {/* FILA INFERIOR: ACCIÓN SUGERIDA */}
                            {item.status === 'matched' && (
                                <div className="bg-green-500/20 text-green-400 p-2 rounded-lg text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <span>Ya está cargado (posible coincidencia)</span>
                                </div>
                            )}

                            {item.status === 'saved' && (
                                <div className="text-center text-sm font-bold text-green-500">
                                    ¡Guardado!
                                </div>
                            )}

                            {item.status === 'recognized' && (
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm opacity-80 flex gap-2 items-center">
                                        <span className="text-blue-400">Detectado como:</span>
                                        <span className="font-bold">{item.suggestedAlias}</span>
                                    </div>
                                    <button
                                        onClick={() => handleConfirmItem(item, index)}
                                        className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Confirmar Gasto
                                    </button>
                                </div>
                            )}

                            {item.status === 'unknown' && (
                                <div className="bg-orange-500/10 p-3 rounded-lg space-y-3">
                                    <p className="text-xs text-orange-300 font-bold uppercase">Nuevo Movimiento Desconocido</p>

                                    {/* Formulario Rápido en Línea */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre (Alias)"
                                            className={`p-2 rounded-lg text-sm ${isGlass ? 'bg-black/20' : 'bg-gray-50'}`}
                                            onChange={(e) => {
                                                const newItems = [...parsedItems];
                                                newItems[index].newAliasName = e.target.value;
                                                newItems[index].suggestedAlias = e.target.value;
                                                setParsedItems(newItems);
                                            }}
                                        />
                                        <select
                                            className={`p-2 rounded-lg text-sm ${isGlass ? 'bg-black/20' : 'bg-gray-50'}`}
                                            onChange={(e) => {
                                                const newItems = [...parsedItems];
                                                newItems[index].suggestedCategory = e.target.value;
                                                setParsedItems(newItems);
                                            }}
                                        >
                                            <option value="">Categoría</option>
                                            <option value="supermercado">🛒 Super</option>
                                            <option value="comida">🍔 Comida</option>
                                            <option value="transporte">🚕 Taxi/Uber</option>
                                            <option value="servicios">💡 Servicios</option>
                                            <option value="varios">📦 Varios</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => handleConfirmItem(item, index)}
                                        disabled={!item.suggestedCategory || !item.suggestedAlias}
                                        className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                                    >
                                        Guardar y Recordar Alias
                                    </button>
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};

export default ReconciliationDesk;
