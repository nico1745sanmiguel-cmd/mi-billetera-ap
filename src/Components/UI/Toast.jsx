import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

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

    return (
        <div 
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-auto max-w-[calc(100vw-2rem)] px-4"
        >
            <div className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border
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
                    className="p-1 -mr-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

export { Toast };