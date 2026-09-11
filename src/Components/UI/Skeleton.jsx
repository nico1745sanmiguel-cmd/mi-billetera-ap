import React from 'react';

/**
 * Skeleton — Placeholder de carga translúcido con efecto Shimmer.
 */
export default function Skeleton({ className = '', type = 'text', width, height }) {
    let baseStyle = 'relative overflow-hidden bg-gray-200/80 dark:bg-white/10 rounded-xl';

    if (type === 'text') {
        baseStyle = 'relative overflow-hidden bg-gray-200/80 dark:bg-white/10 h-4 rounded-lg';
    } else if (type === 'title') {
        baseStyle = 'relative overflow-hidden bg-gray-200/80 dark:bg-white/10 h-7 rounded-xl';
    } else if (type === 'circle') {
        baseStyle = 'relative overflow-hidden bg-gray-200/80 dark:bg-white/10 rounded-full';
    } else if (type === 'rectangular') {
        baseStyle = 'relative overflow-hidden bg-gray-200/80 dark:bg-white/10 rounded-2xl';
    }

    const style = {};
    if (width) style.width = width;
    if (height) style.height = height;

    return (
        <div 
            className={`${baseStyle} ${className}`} 
            style={style}
            aria-hidden="true"
        >
            {/* Shimmer de barrido de luz */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />
        </div>
    );
}

export { Skeleton };
