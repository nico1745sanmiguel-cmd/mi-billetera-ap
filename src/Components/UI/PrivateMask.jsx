import React from 'react';

/**
 * PrivateMask renderiza una máscara visual (ej. '••••' o '****') accesible para lectores de pantalla.
 * El texto visual se oculta con aria-hidden="true" y se añade un span sr-only descriptivo.
 */
export default function PrivateMask({ placeholder = '••••', text = 'Monto oculto por privacidad', className = '' }) {
    return (
        <span className={`inline-flex items-center ${className}`}>
            <span aria-hidden="true">{placeholder}</span>
            <span className="sr-only">{text}</span>
        </span>
    );
}

export const renderHiddenAmount = (placeholder = '••••', text = 'Monto oculto por privacidad') => (
    <span className="inline-flex items-center">
        <span aria-hidden="true">{placeholder}</span>
        <span className="sr-only">{text}</span>
    </span>
);
