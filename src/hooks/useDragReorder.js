import { useState, useRef, useCallback } from 'react';

export function useDragReorder(initialOrder) {
  const [order, setOrder] = useState(initialOrder);
  const [draggingItem, setDraggingItem] = useState(null);
  const dragItemNode = useRef(null);

  const handleDragEnd = useCallback(() => {
    setDraggingItem(null);
    if (dragItemNode.current) {
      dragItemNode.current.classList.remove('opacity-50', 'scale-95');
    }
    dragItemNode.current = null;
  }, []);

  const handleDragStart = useCallback((e, item) => {
    dragItemNode.current = e.currentTarget;
    setDraggingItem(item);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item);
    }
    setTimeout(() => {
      if (dragItemNode.current) {
        dragItemNode.current.classList.add('opacity-50', 'scale-95');
      }
    }, 0);
  }, []);

  const handleDragEnter = useCallback((e, targetItem) => {
    e.preventDefault();
    setDraggingItem((currentDragging) => {
      if (currentDragging !== null && currentDragging !== targetItem) {
        setOrder((prevOrder) => {
          const oldIdx = prevOrder.indexOf(currentDragging);
          const newIdx = prevOrder.indexOf(targetItem);
          if (oldIdx === -1 || newIdx === -1) return prevOrder;

          const newOrder = [...prevOrder];
          newOrder.splice(oldIdx, 1);
          newOrder.splice(newIdx, 0, currentDragging);
          return newOrder;
        });
      }
      return currentDragging;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleDragEnd();
  }, [handleDragEnd]);

  const getDragProps = useCallback((id) => ({
    draggable: true,
    onDragStart: (e) => handleDragStart(e, id),
    onDragEnter: (e) => handleDragEnter(e, id),
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
    onTouchEnd: handleDragEnd,
  }), [handleDragStart, handleDragEnter, handleDragOver, handleDrop, handleDragEnd]);

  return { order, getDragProps, draggingItem, setOrder };
}
