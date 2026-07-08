import { useState, useEffect } from 'react';
import { getCache, setCache } from '../utils/cache';
import { CACHE_KEYS, DEFAULT_WIDGET_SIZES, WIDGET_SIZE_FIXED } from '../config/constants';

/**
 * useWidgetSizes
 * Maneja el estado de tamaño de cada widget ('full' | 'half').
 * Persiste en cache automáticamente.
 *
 * Los widgets en WIDGET_SIZE_FIXED siempre devuelven 'full' y no pueden cambiarse.
 *
 * @returns {{ sizes, toggleSize, getSize }}
 */
export function useWidgetSizes() {
    const [sizes, setSizes] = useState(() => {
        const cached = getCache(CACHE_KEYS.WIDGET_SIZES, null);
        return cached || DEFAULT_WIDGET_SIZES;
    });

    // Persistir en cache cada vez que cambia
    useEffect(() => {
        setCache(CACHE_KEYS.WIDGET_SIZES, sizes);
    }, [sizes]);

    /**
     * Alterna el tamaño de un widget entre 'full' y 'half'.
     * Si el widget está en WIDGET_SIZE_FIXED, no hace nada.
     */
    const toggleSize = (key) => {
        if (WIDGET_SIZE_FIXED.has(key)) return;
        setSizes(prev => ({
            ...prev,
            [key]: prev[key] === 'half' ? 'full' : 'half',
        }));
    };

    /**
     * Devuelve el tamaño efectivo de un widget.
     * Los widgets fijos siempre retornan 'full'.
     */
    const getSize = (key) => {
        if (WIDGET_SIZE_FIXED.has(key)) return 'full';
        return sizes[key] || 'full';
    };

    return { sizes, toggleSize, getSize };
}
