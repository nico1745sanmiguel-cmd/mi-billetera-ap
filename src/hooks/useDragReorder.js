import { useState, useRef } from 'react';

export function useDragReorder(initialOrder) {
  const [order, setOrder] = useState(initialOrder);
  const [draggingItem, setDraggingItem] = useState(null);
  const dragItemNode = useRef();

  const handleDragStart = (e, item) => {
    dragItemNode.current = e.target;
    dragItemNode.current.addEventListener('dragend', handleDragEnd);
    setDraggingItem(item);
    setTimeout(() => {
        if(dragItemNode.current) dragItemNode.current.classList.add('opacity-50', 'scale-95');
    }, 0);
  };

  const handleDragEnter = (e, targetItem) => {
    if (draggingItem !== null && draggingItem !== targetItem) {
      const oldIdx = order.indexOf(draggingItem);
      const newIdx = order.indexOf(targetItem);
      
      const newOrder = [...order];
      newOrder.splice(oldIdx, 1);
      newOrder.splice(newIdx, 0, draggingItem);
      
      setOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    if(dragItemNode.current) {
        dragItemNode.current.classList.remove('opacity-50', 'scale-95');
        dragItemNode.current.removeEventListener('dragend', handleDragEnd);
    }
    dragItemNode.current = null;
  };

  const getDragProps = (id) => ({
    draggable: true,
    onDragStart: (e) => handleDragStart(e, id),
    onDragEnter: (e) => handleDragEnter(e, id),
    onTouchEnd: handleDragEnd
  });

  return { order, getDragProps, draggingItem };
}