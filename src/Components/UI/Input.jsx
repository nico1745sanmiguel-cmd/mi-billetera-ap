import React, { useId } from 'react';

/**
 * Input — Input de formulario unificado, accesible y compatible con temas Glass / Dark / Light.
 *
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {React.ComponentType} [props.icon]
 * @param {string} [props.id]
 */
const Input = React.forwardRef(function Input({
    label,
    error,
    helperText,
    icon: Icon,
    id: explicitId,
    className = '',
    disabled = false,
    ...props
}, ref) {
    const autoId = useId();
    const inputId = explicitId || autoId;

    return (
        <div className="w-full flex flex-col gap-1.5">
            {label && (
                <label 
                    htmlFor={inputId}
                    className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/60 select-none"
                >
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {Icon && (
                    <div className="absolute left-3.5 pointer-events-none text-gray-400 dark:text-white/40">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    disabled={disabled}
                    autoComplete="off"
                    className={`
                        w-full min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-medium
                        bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white
                        border border-gray-200 dark:border-white/10
                        placeholder:text-gray-400 dark:placeholder:text-white/30
                        transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${Icon ? 'pl-10' : ''}
                        ${error ? '!border-red-500 !focus-visible:ring-red-500/30' : ''}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs font-medium text-red-500 dark:text-red-400 leading-tight">{error}</p>
            )}
            {!error && helperText && (
                <p className="text-xs text-gray-400 dark:text-white/40 leading-tight">{helperText}</p>
            )}
        </div>
    );
});

export default Input;
export { Input };
