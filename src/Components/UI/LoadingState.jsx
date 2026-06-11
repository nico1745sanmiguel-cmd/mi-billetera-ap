import React from 'react';
import { useUI } from '../../context/UIContext';
import { Loader2 } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} [props.message="Cargando..."] - Mensaje a mostrar junto al spinner.
 * @param {boolean} [props.fullScreen=false] - Si es true, el cargador ocupará toda la pantalla.
 */
export default function LoadingState({ message = "Cargando...", fullScreen = false }) {
    const { isGlass } = useUI();

    const containerClass = fullScreen 
        ? `fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm ${isGlass ? 'bg-black/60' : 'bg-white/80'}`
        : "flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in";

    return (
        <div className={containerClass}>
            <Loader2 
                className={`animate-spin ${fullScreen ? 'w-12 h-12' : 'w-8 h-8'} ${isGlass ? 'text-indigo-400' : 'text-indigo-600'}`} 
            />
            <p className={`font-bold animate-pulse ${fullScreen ? 'text-lg' : 'text-sm'} ${isGlass ? 'text-indigo-200' : 'text-gray-600'}`}>
                {message}
            </p>
        </div>
    );
}
