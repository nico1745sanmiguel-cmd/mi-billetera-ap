import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    isDanger = false,
    isLoading = false,
    confirmWord = null
}) {
    const cancelBtnRef = useRef(null);
    const wordInputRef = useRef(null);
    const [inputWord, setInputWord] = useState('');

    const isWordConfirmed = !confirmWord || inputWord.trim().toUpperCase() === confirmWord.trim().toUpperCase();

    // Resetear palabra al abrir/cerrar
    useEffect(() => {
        if (!isOpen) {
            setInputWord('');
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (isLoading) return;
        if (onCancel) {
            onCancel();
        } else if (onClose) {
            onClose();
        }
    }, [isLoading, onCancel, onClose]);

    // Cierre con Escape y autofoco en Cancelar (seguridad contra borrado accidental)
    useEffect(() => {
        if (!isOpen || isLoading) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Pequeño timeout para asegurar montaje en el DOM antes del foco
        const timer = setTimeout(() => {
            if (confirmWord && wordInputRef.current) {
                wordInputRef.current.focus();
            } else {
                cancelBtnRef.current?.focus();
            }
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [isOpen, isLoading, handleClose, confirmWord]);

    if (!isOpen) return null;

    const handleConfirmClick = async () => {
        if (isLoading || !isWordConfirmed) return;
        if (onConfirm) {
            const result = onConfirm();
            if (result && typeof result.then === 'function') {
                try {
                    await result;
                } catch {
                    return;
                }
            }
        }
        if (!isLoading) {
            handleClose();
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && isWordConfirmed) {
            e.preventDefault();
            handleConfirmClick();
        }
    };

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

                {confirmWord && (
                    <div className="mb-6 space-y-2">
                        <label htmlFor="confirm-word-input" className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Escribí <span className="font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">{confirmWord}</span> para confirmar:
                        </label>
                        <input
                            ref={wordInputRef}
                            id="confirm-word-input"
                            type="text"
                            autoComplete="off"
                            value={inputWord}
                            onChange={(e) => setInputWord(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder={`Escribí ${confirmWord}`}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm font-bold tracking-wider placeholder:text-gray-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all uppercase"
                        />
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        ref={cancelBtnRef}
                        type="button"
                        disabled={isLoading}
                        onClick={handleClose}
                        aria-label={cancelText}
                        className={`flex-1 min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading || !isWordConfirmed}
                        onClick={handleConfirmClick}
                        aria-label={confirmText}
                        className={`flex-1 min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-white active:scale-95 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 flex items-center justify-center gap-2 ${
                            isLoading || !isWordConfirmed ? 'opacity-40 cursor-not-allowed' : ''
                        } ${
                            isDanger 
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25 focus-visible:ring-red-400' 
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 focus-visible:ring-blue-400'
                        }`}
                    >
                        {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export { ConfirmDialog };
