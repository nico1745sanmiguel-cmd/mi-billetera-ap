import React, { useState, useRef, useEffect } from 'react';
import { analyzeReceipt } from '../../services/groqService';

export default function ReceiptScanner({ isGlass, items = [], onBack }) {
  const [step, setStep] = useState('START'); // START, CAMERA, RESULTS
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Limpiar cámara si el componente se desmonta
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setStep('CAMERA');
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setErrorMsg("No se pudo acceder a la cámara. Revisa los permisos.");
      setStep('START');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Capturar frame
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Obtener imagen en base64 (calidad 80% para no mandar algo gigante a Groq)
    const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8);
    
    setIsScanning(true);
    stopCamera(); 

    try {
      // Llamada REAL a Groq
      const groqResults = await analyzeReceipt(base64Image, items);
      
      // Procesar resultados de la IA vs nuestra lista
      let finalResults = [];
      let nextId = 1;

      for (const scanned of groqResults) {
        let expectedPrice = 0;
        let expectedName = scanned.matchedExpectedName || 'No estaba en la lista';
        
        if (scanned.matchedExpectedName) {
            const found = items.find(i => i.name === scanned.matchedExpectedName);
            if (found) expectedPrice = found.price;
        }

        const diff = scanned.scannedPrice - expectedPrice;
        let status = 'match';
        if (expectedPrice === 0) status = 'unknown'; // No anotado o sin precio
        else if (diff > 0) status = 'overcharged';
        else if (diff < 0) status = 'saved';

        finalResults.push({
            id: nextId++,
            expectedName,
            scannedName: scanned.scannedName,
            expectedPrice,
            scannedPrice: scanned.scannedPrice,
            status
        });
      }

      setResults(finalResults);
      setStep('RESULTS');
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al leer el ticket. Intentá enfocar mejor o revisar la conexión.");
      setStep('START');
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'saved') return isGlass ? 'text-emerald-400 bg-emerald-400/10' : 'text-emerald-600 bg-emerald-50';
    if (status === 'overcharged') return isGlass ? 'text-rose-400 bg-rose-400/10' : 'text-rose-600 bg-rose-50';
    if (status === 'unknown') return isGlass ? 'text-amber-400 bg-amber-400/10' : 'text-amber-600 bg-amber-50';
    return isGlass ? 'text-gray-300 bg-white/5' : 'text-gray-600 bg-gray-50';
  };

  // Cálculos de totales
  const totalSaved = results.filter(r => r.status === 'saved').reduce((acc, r) => acc + (Math.abs(r.scannedPrice - r.expectedPrice)), 0);
  const totalOvercharged = results.filter(r => r.status === 'overcharged').reduce((acc, r) => acc + (r.scannedPrice - r.expectedPrice), 0);

  return (
    <div className={`p-4 md:p-6 max-w-2xl mx-auto min-h-[80vh] flex flex-col ${isGlass ? 'text-white' : 'text-gray-800'}`}>
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={step === 'START' ? onBack : () => { stopCamera(); setStep('START'); }} 
          className={`p-2 rounded-xl transition-colors ${isGlass ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 className="text-2xl font-bold">
          {step === 'START' ? 'Conciliar Ticket' : step === 'CAMERA' ? 'Enfocá el Ticket' : 'Resultados Reales'}
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 mb-4 bg-rose-500/20 text-rose-500 border border-rose-500/50 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: START */}
      {step === 'START' && (
        <div className="flex-1 flex flex-col animate-fadeIn">
          <div className={`flex-1 rounded-3xl p-6 ${isGlass ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white shadow-xl border border-gray-100'}`}>
            <h2 className="text-lg font-semibold mb-4 opacity-80">Lista Actual a Comparar</h2>
            <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="opacity-50 text-center py-4">No tenés ítems en tu lista actual.</p>
              ) : (
                items.map(item => (
                  <div key={item.id} className={`flex justify-between p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <span>{item.name}</span>
                    <span className="font-bold">${item.price}</span>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={startCamera}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Abrir Cámara
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REAL CAMERA */}
      {step === 'CAMERA' && (
        <div className="flex-1 flex flex-col items-center justify-center animate-fadeIn relative">
          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay Guides */}
            <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-lg pointer-events-none"></div>

            {/* Scanning Animation */}
            {isScanning && (
              <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center text-white">
                <div className="w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-scan absolute top-0 left-0"></div>
                <div className="animate-pulse font-bold text-lg">Analizando con Groq IA...</div>
              </div>
            )}

            {/* Controls */}
            {!isScanning && (
              <div className="absolute bottom-6 left-0 w-full flex justify-center z-20">
                <button 
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 active:scale-90 transition-transform shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 'RESULTS' && (
        <div className="flex-1 flex flex-col animate-fadeIn pb-20">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-3xl ${isGlass ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-100'}`}>
              <span className={`text-sm ${isGlass ? 'text-rose-200' : 'text-rose-600'}`}>Cobrado de más</span>
              <p className={`text-2xl font-bold mt-1 ${isGlass ? 'text-rose-400' : 'text-rose-700'}`}>${totalOvercharged}</p>
            </div>
            <div className={`p-4 rounded-3xl ${isGlass ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-100'}`}>
              <span className={`text-sm ${isGlass ? 'text-emerald-200' : 'text-emerald-600'}`}>Ahorrado</span>
              <p className={`text-2xl font-bold mt-1 ${isGlass ? 'text-emerald-400' : 'text-emerald-700'}`}>${totalSaved}</p>
            </div>
          </div>

          {/* List */}
          <div className={`flex-1 rounded-3xl p-2 md:p-4 ${isGlass ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white shadow-xl border border-gray-100'}`}>
            {results.length === 0 && <p className="text-center p-4">No se detectaron productos claros en el ticket.</p>}
            
            {results.map(item => {
              const diff = item.scannedPrice - item.expectedPrice;
              const isDiff = diff !== 0 && item.status !== 'unknown';

              return (
                <div key={item.id} className={`p-4 mb-3 rounded-2xl flex flex-col gap-2 transition-all ${getStatusColor(item.status)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{item.expectedName}</h3>
                      <p className="text-xs opacity-70">Ticket dice: {item.scannedName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg">${item.scannedPrice}</p>
                      {item.expectedPrice > 0 && (
                        <p className="text-xs opacity-70 line-through">Anotado: ${item.expectedPrice}</p>
                      )}
                    </div>
                  </div>
                  
                  {isDiff && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-current/10">
                      <span className="text-sm font-medium">
                        {diff > 0 ? 'Te cobraron de más' : 'Estaba más barato'}
                      </span>
                      <span className="font-bold">
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    </div>
                  )}
                  {item.status === 'unknown' && (
                    <div className="text-xs mt-1 pt-1 border-t border-current/10 opacity-80">
                      No lo anotaste en la lista o no tenías precio cargado.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button 
            onClick={() => setStep('START')}
            className={`mt-6 py-4 rounded-2xl font-bold transition-all active:scale-95 ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
          >
            Escanear Otro
          </button>
        </div>
      )}

      {/* Tailwind Animation for the scanner line */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}} />
    </div>
  );
}
