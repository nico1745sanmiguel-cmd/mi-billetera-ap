import React from 'react';
import { useUI } from '../../context/UIContext';

/**
 * Componente estandarizado para mostrar estados vacíos a lo largo de la app.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Componente de ícono (ej. de lucide-react)
 * @param {string} props.title - Título principal del estado vacío
 * @param {string} props.description - Texto secundario explicando la situación
 * @param {React.ReactNode} [props.action] - Botón u otra acción a renderizar debajo
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
    const { isGlass } = useUI();

    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-dashed transition-all animate-fade-in ${
            isGlass ? 'bg-white/5 border-white/20' : 'bg-gray-50 border-gray-300'
        }`}>
            <div className={`p-4 rounded-full mb-4 shadow-inner ${
                isGlass ? 'bg-white/10 text-indigo-300 shadow-black/20' : 'bg-white text-indigo-500 shadow-gray-200'
            }`}>
                {Icon}
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                {title}
            </h3>
            <p className={`text-sm mb-6 max-w-xs ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                {description}
            </p>
            {action && (
                <div className="w-full sm:w-auto">
                    {action}
                </div>
            )}
        </div>
    );
}
