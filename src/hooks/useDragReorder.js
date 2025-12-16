import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook para reordenar elementos con drag & drop
 * Soporta touch (long press) y mouse
 * Guarda el orden en localStorage
 */
export const useDragReorder = (items, storageKey = 'widgetOrder') => {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const longPressTimer = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementRef = useRef({});

  // Restaurar orden guardado al cargar
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        const reordered = order
          .map(id => items.find(item => item.id === id))
          .filter(Boolean);
        setOrderedItems(reordered);
      } catch (e) {
        console.warn('No se pudo restaurar orden de widgets');
      }
    } else {
      setOrderedItems(items);
    }
  }, [items, storageKey]);

  // Guardar orden en localStorage
  const saveOrder = useCallback((newItems) => {
    const ids = newItems.map(item => item.id);
    localStorage.setItem(storageKey, JSON.stringify(ids));
  }, [storageKey]);

  // Detector de long press (para mobile)
  const handleTouchStart = useCallback((e, itemId) => {
    dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    
    longPressTimer.current = setTimeout(() => {
      setDraggingId(itemId);
    }, 500); // 500ms long press
  }, []);

  const handleTouchMove = useCallback((e, itemId) => {
    if (draggingId !== itemId) return;

    const deltaX = e.touches[0].clientX - dragStartPos.current.x;
    const deltaY = e.touches[0].clientY - dragStartPos.current.y;

    setDragOffset({ x: deltaX, y: deltaY });
  }, [draggingId]);

  const handleTouchEnd = useCallback((e, itemId) => {
    clearTimeout(longPressTimer.current);
    
    if (draggingId !== itemId) return;

    setDraggingId(null);
    setDragOffset({ x: 0, y: 0 });
  }, [draggingId]);

  // Handlers para mouse (desktop)
  const handleMouseDown = useCallback((e, itemId) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    
    longPressTimer.current = setTimeout(() => {
      setDraggingId(itemId);
    }, 500);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggingId) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    setDragOffset({ x: deltaX, y: deltaY });
  }, [draggingId]);

  const handleMouseUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    setDraggingId(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Reordenar elementos
  const reorderItems = useCallback((fromId, toId) => {
    if (fromId === toId) return;

    const fromIndex = orderedItems.findIndex(item => item.id === fromId);
    const toIndex = orderedItems.findIndex(item => item.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newItems = [...orderedItems];
    [newItems[fromIndex], newItems[toIndex]] = [newItems[toIndex], newItems[fromIndex]];
    
    setOrderedItems(newItems);
    saveOrder(newItems);
  }, [orderedItems, saveOrder]);

  return {
    orderedItems,
    draggingId,
    dragOffset,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
    reorderItems,
  };
};
