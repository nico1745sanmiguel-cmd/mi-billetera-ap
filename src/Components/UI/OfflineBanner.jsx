import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            const timer = setTimeout(() => {
                setShowReconnected(false);
            }, 3000);
            return () => clearTimeout(timer);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Si está online y no estamos mostrando el feedback de reconexión, no renderizamos nada
    if (isOnline && !showReconnected) {
        return null;
    }

    return (
        <div 
            role="status" 
            aria-live="polite"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md pointer-events-none animate-fade-in"
        >
            <div 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all duration-300 pointer-events-auto ${
                    isOnline
                        ? 'bg-emerald-500/90 text-white border-emerald-400/40 shadow-emerald-500/20'
                        : 'bg-amber-500/90 dark:bg-amber-600/90 text-white border-amber-400/40 shadow-amber-500/20'
                }`}
            >
                <div className="flex-shrink-0 p-1 rounded-xl bg-white/20">
                    {isOnline ? (
                        <Wifi size={18} className="animate-pulse" />
                    ) : (
                        <WifiOff size={18} className="animate-bounce" />
                    )}
                </div>
                <div className="flex-1 text-xs sm:text-sm font-medium leading-tight">
                    {isOnline ? (
                        <span>Conexión restablecida. Sincronizando datos...</span>
                    ) : (
                        <span>Estás en modo sin conexión. Tus cambios se sincronizarán al reconectar.</span>
                    )}
                </div>
            </div>
        </div>
    );
}
