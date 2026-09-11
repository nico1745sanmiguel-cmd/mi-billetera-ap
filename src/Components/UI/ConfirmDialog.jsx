import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
    isOpen = true,
    title,
    message,
    onConfirm,
    onCancel,
    onClose,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = false
}) {
    const cancelBtnRef = useRef(null);

    const handleClose = () => {
        if (onCancel) {
            onCancel();
        } else if (onClose) {
            onClose();
        }
    };

    // Cierre con Escape y autofoco en Cancelar (seguridad contra borrado accidental)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (onCancel) onCancel();
                else if (onClose) onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Pequeño timeout para asegurar montaje en el DOM antes del foco
        const timer = setTimeout(() => {
            cancelBtnRef.current?.focus();
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [isOpen, onCancel, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={handleClose}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
        >
            <div 
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                        isDanger 
                            ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' 
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1 mt-0.5">
                        <h3 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white mb-1 leading-snug">
                            {title}
                        </h3>
                        <p id="confirm-dialog-desc" className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        ref={cancelBtnRef}
                        type="button"
                        onClick={handleClose}
                        aria-label={cancelText}
                        className="flex-1 min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={() => { onConfirm?.(); handleClose(); }}
                        aria-label={confirmText}
                        className={`flex-1 min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-white active:scale-95 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 ${
                            isDanger 
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25 focus-visible:ring-red-400' 
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 focus-visible:ring-blue-400'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export { ConfirmDialog };
