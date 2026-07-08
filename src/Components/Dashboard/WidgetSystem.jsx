import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
import { WIDGET_SIZE_FIXED } from '../../config/constants';

// ─── SizeMenu ─────────────────────────────────────────────────────────────────
export function SizeMenu({ currentSize, onSelect, onClose }) {
    return (
        <>
            {/* Overlay para cerrar al tocar fuera */}
            <div className="fixed inset-0 z-40" onTouchStart={onClose} onClick={onClose} role="presentation" aria-hidden="true" />

            <div className="absolute top-2 right-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 p-1.5 flex flex-col gap-1 min-w-[160px]">
                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-white/30 tracking-widest px-2 pt-1 pb-0.5">Tamaño del widget</p>

                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect('full'); onClose(); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            currentSize === 'full'
                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                                : 'text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <Maximize2 size={14} />
                        <span>Completo</span>
                        <span className="ml-auto flex gap-0.5">
                            <span className="w-3 h-2 bg-current opacity-60 rounded-sm" />
                        </span>
                    </button>

                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect('half'); onClose(); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            currentSize === 'half'
                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                                : 'text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <Minimize2 size={14} />
                        <span>Compacto</span>
                        <span className="ml-auto flex gap-0.5">
                            <span className="w-1.5 h-2 bg-current opacity-60 rounded-sm" />
                            <span className="w-1.5 h-2 bg-current opacity-20 rounded-sm" />
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── WidgetWrapper ─────────────────────────────────────────────────────────────
export function WidgetWrapper({ widgetKey, children, size, onToggleSize, getDragProps, isDragging }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isFixed = WIDGET_SIZE_FIXED.has(widgetKey);

    const { handlers: longPressHandlers, isHolding } = useLongPress(() => {
        if (!isFixed) setMenuOpen(true);
    });

    const dragProps = getDragProps(widgetKey);

    return (
        <div
            className={`relative transition-all duration-300 flex-1 flex flex-col ${isDragging ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-grab'}`}
            {...(!menuOpen ? longPressHandlers : {})}
            draggable={dragProps.draggable}
            onDragStart={dragProps.onDragStart}
            onDragEnter={dragProps.onDragEnter}
            onTouchEnd={(e) => {
                if (!menuOpen && longPressHandlers.onTouchEnd) longPressHandlers.onTouchEnd(e);
                if (dragProps.onTouchEnd) dragProps.onTouchEnd(e);
            }}
        >
            {isHolding && !isFixed && (
                <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400 dark:border-indigo-400 animate-pulse z-10 pointer-events-none" />
            )}

            {children}

            {menuOpen && (
                <SizeMenu
                    currentSize={size}
                    onSelect={(newSize) => onToggleSize(widgetKey, newSize)}
                    onClose={() => setMenuOpen(false)}
                />
            )}
        </div>
    );
}

// ─── WidgetGrid ────────────────────────────────────────────────────────────────
export function WidgetGrid({ order, getWidgetNode, getSize, toggleSize, getDragProps, draggingItem }) {
    const activeKeys = order.filter(key => !!getWidgetNode(key, 'full'));

    const rows = [];
    let i = 0;
    while (i < activeKeys.length) {
        const key = activeKeys[i];
        const size = getSize(key);
        if (size === 'half') {
            const nextKey = activeKeys[i + 1];
            const nextSize = nextKey ? getSize(nextKey) : 'full';
            if (nextSize === 'half') {
                rows.push([key, nextKey]);
                i += 2;
            } else {
                rows.push([key]); 
                i += 1;
            }
        } else {
            rows.push([key]);
            i += 1;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {rows.map((row, rowIdx) => {
                const isPair = row.length === 2;
                return (
                    <div key={rowIdx} className={`flex gap-3 ${isPair ? 'items-stretch' : ''}`}>
                        {row.map((key) => {
                            const size = getSize(key);
                            const node = getWidgetNode(key, size);
                            if (!node) return null;
                            return (
                                <div
                                    key={key}
                                    className={`${isPair || size === 'half' ? 'w-1/2' : 'w-full'} min-w-0 flex flex-col`}
                                >
                                    <WidgetWrapper
                                        widgetKey={key}
                                        size={size}
                                        onToggleSize={(k, newSize) => {
                                            const current = getSize(k);
                                            if (current !== newSize) toggleSize(k);
                                        }}
                                        getDragProps={getDragProps}
                                        isDragging={draggingItem === key}
                                    >
                                        {node}
                                    </WidgetWrapper>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
