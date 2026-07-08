import { useRef, useState, useCallback } from 'react';

const LONG_PRESS_DELAY = 600; // ms
const MOVE_THRESHOLD = 10;    // px — más que esto = drag, no hold

/**
 * useLongPress
 * Detecta un "long press" en mobile diferenciándolo del drag.
 *
 * @param {Function} onLongPress - callback que se llama al completarse el hold
 * @returns {{ handlers, isHolding }} - handlers para aplicar al elemento, y estado de holding
 *
 * Uso:
 *   const { handlers, isHolding } = useLongPress(() => console.log('long press!'));
 *   <div {...handlers} style={{ opacity: isHolding ? 0.7 : 1 }}>...</div>
 */
export function useLongPress(onLongPress) {
    const timerRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const [isHolding, setIsHolding] = useState(false);

    const start = useCallback((e) => {
        const touch = e.touches?.[0] || e;
        startPosRef.current = { x: touch.clientX, y: touch.clientY };

        setIsHolding(true);
        timerRef.current = setTimeout(() => {
            setIsHolding(false);
            onLongPress();
        }, LONG_PRESS_DELAY);
    }, [onLongPress]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsHolding(false);
    }, []);

    const move = useCallback((e) => {
        if (!timerRef.current) return;
        const touch = e.touches?.[0] || e;
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);
        // Si el usuario se movió más del umbral, asumimos que es scroll/drag y cancelamos
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
            cancel();
        }
    }, [cancel]);

    const handlers = {
        onTouchStart: start,
        onTouchMove: move,
        onTouchEnd: cancel,
        onTouchCancel: cancel,
    };

    return { handlers, isHolding };
}
