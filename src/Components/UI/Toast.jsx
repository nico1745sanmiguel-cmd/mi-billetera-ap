import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig = {
    success: {
        icon: CheckCircle2,
        bg: 'bg-slate-900/95 text-emerald-400 border-emerald-500/30',
        text: 'text-white',
    },
    error: {
        icon: AlertCircle,
        bg: 'bg-slate-900/95 text-red-400 border-red-500/30',
        text: 'text-white',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-slate-900/95 text-amber-400 border-amber-500/30',
        text: 'text-white',
    },
    info: {
        icon: Info,
        bg: 'bg-slate-900/95 text-blue-400 border-blue-500/30',
        text: 'text-white',
    }
};

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3200);
        return () => clearTimeout(timer);
    }, [onClose]);

    const cfg = toastConfig[type] || toastConfig.success;
    const Icon = cfg.icon;
    const isError = type === 'error';

    return (
        <div 
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
            aria-atomic="true"
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[150] w-auto max-w-[calc(100vw-2rem)] px-4"
        >
            <div className={`
                flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border
                animate-fade-in-up transition-all duration-300
                ${cfg.bg}
            `}>
                <Icon size={20} className="shrink-0" />
                <span className={`text-sm font-medium leading-snug ${cfg.text}`}>
                    {message}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar notificación"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 -mr-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 shrink-0"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

export { Toast };