import React, { useState, useEffect } from 'react';

const SIZE_COLS = {
    '2x1': 'col-span-2',
    '1x1': 'col-span-1',
};

/**
 * WPTile — Componente base de azulejo estilo Windows Phone Metro UI.
 *
 * Props:
 *   color     → hex color de fondo del tile
 *   size      → '1x1' | '2x1'
 *   front     → ReactNode (cara delantera, visible normalmente)
 *   back      → ReactNode (cara trasera, visible con el live-tile)
 *   onClick   → función disparada al tocar el tile
 *   delay     → ms de retraso antes de iniciar el flip (para staggering entre tiles)
 *   label     → aria-label del botón
 *   animDelay → delay de animación de entrada (ms)
 */
const WPTile = ({ color, size = '1x1', front, back, onClick, delay = 0, label = 'Tile', animDelay = 0 }) => {
    const [showBack, setShowBack] = useState(false);

    useEffect(() => {
        if (!back) return;
        let interval;
        const timer = setTimeout(() => {
            interval = setInterval(() => {
                setShowBack(prev => !prev);
            }, 5000);
        }, delay);
        return () => {
            clearTimeout(timer);
            if (interval) clearInterval(interval);
        };
    }, [back, delay]);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`wp-tile relative w-full text-left overflow-hidden ${SIZE_COLS[size]} h-[132px] wp-tile-appear`}
            style={{
                backgroundColor: color,
                animationDelay: `${animDelay}ms`,
                animationFillMode: 'both',
            }}
        >
            {/* ── Cara delantera ── */}
            <div
                className="absolute inset-0 p-3 flex flex-col justify-between"
                style={{
                    transform: showBack ? 'translateY(-105%)' : 'translateY(0)',
                    transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {front}
            </div>

            {/* ── Cara trasera (live tile) ── */}
            {back && (
                <div
                    className="absolute inset-0 p-3 flex flex-col justify-between"
                    style={{
                        transform: showBack ? 'translateY(0)' : 'translateY(105%)',
                        transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {back}
                </div>
            )}
        </button>
    );
};

export default WPTile;
