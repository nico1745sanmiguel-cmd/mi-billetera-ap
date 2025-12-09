import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Escuchar el evento especial de Chrome/Android
    const handler = (e) => {
      // 1. Evitar que Chrome muestre su barra fea automáticamente
      e.preventDefault();
      // 2. Guardar el evento para dispararlo cuando queramos
      setDeferredPrompt(e);
      // 3. Mostrar nuestro botón
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Disparar el prompt nativo
    deferredPrompt.prompt();

    // Esperar a ver qué decidió el usuario
    const { outcome } = await deferredPrompt.userChoice;
    
    // Limpiar
    setDeferredPrompt(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 animate-fade-in flex justify-between items-center border-l-4 border-blue-500">
      <div>
        <p className="font-bold text-sm">¿Instalar App?</p>
        <p className="text-xs text-gray-300">Acceso rápido y sin barras.</p>
      </div>
      <div className="flex gap-3">
        <button 
            onClick={() => setShow(false)} 
            className="text-gray-400 text-xs font-bold hover:text-white"
        >
            LUEGO
        </button>
        <button 
            onClick={handleInstallClick} 
            className="bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500 shadow-lg"
        >
            INSTALAR
        </button>
      </div>
    </div>
  );
}