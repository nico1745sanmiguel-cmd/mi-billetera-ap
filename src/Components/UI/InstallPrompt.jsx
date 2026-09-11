import React, { useState, useEffect, useRef } from 'react';

export default function InstallPrompt() {
  const deferredPrompt = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Escuchar el evento especial de Chrome/Android
    const handler = (e) => {
      // 1. Evitar que Chrome muestre su barra fea automáticamente
      e.preventDefault();
      // 2. Guardar el evento para dispararlo cuando queramos
      deferredPrompt.current = e;
      // 3. Mostrar nuestro botón
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt.current) return;

    // Disparar el prompt nativo
    deferredPrompt.current.prompt();

    // Esperar a ver qué decidió el usuario
    await deferredPrompt.current.userChoice;
    
    // Limpiar
    deferredPrompt.current = null;
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 animate-fade-in flex justify-between items-center border-l-4 border-blue-500">
      <div>
        <p className="font-bold text-sm">¿Instalar App?</p>
        <p className="text-xs text-gray-300">Acceso rápido y sin barras.</p>
      </div>
      <div className="flex items-center gap-3">
        <button 
            aria-label="Cerrar aviso de instalación" 
            type="button" 
            onClick={() => setShow(false)} 
            className="min-h-[44px] px-3.5 flex items-center justify-center text-gray-400 text-xs font-bold hover:text-white rounded-xl transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
            LUEGO
        </button>
        <button 
            aria-label="Instalar aplicación en dispositivo" 
            type="button" 
            onClick={handleInstallClick} 
            className="min-h-[44px] px-4 flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
            INSTALAR
        </button>
      </div>
    </div>
  );
}