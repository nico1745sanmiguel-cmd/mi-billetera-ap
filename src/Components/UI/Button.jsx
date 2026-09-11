import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button — Componente base de botón con variantes de diseño estandarizadas,
 * garantía de touch target >= 44px en móviles y feedback accesible.
 *
 * @param {'primary' | 'secondary' | 'danger' | 'ghost' | 'glass'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    ...props
}) {
    // Variantes de color y superficie
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:bg-blue-800',
        secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25 active:bg-red-700',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:text-white/80 dark:hover:bg-white/10',
        glass: 'bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md shadow-lg shadow-black/10',
    };

    // Tamaños: todos garantizan min-h-[44px] en interacción móvil (Ley de Fitts)
    const sizes = {
        sm: 'min-h-[44px] px-3.5 py-2 text-xs rounded-xl gap-1.5',
        md: 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl gap-2',
        lg: 'min-h-[48px] px-6 py-3.5 text-base rounded-2xl gap-2.5',
    };

    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={`
                relative inline-flex items-center justify-center font-bold select-none
                transition-all duration-200 active:scale-95
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
                disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100
                ${variants[variant] || variants.primary}
                ${sizes[size] || sizes.md}
                ${className}
            `}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Cargando...</span>
                </>
            ) : (
                <>
                    {leftIcon && <span className="shrink-0">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="shrink-0">{rightIcon}</span>}
                </>
            )}
        </button>
    );
}

export { Button };
