import { useState, useRef } from 'react';

export function useDragReorder(initialOrder) {
  const [order, setOrder] = useState(initialOrder);
  const [draggingItem, setDraggingItem] = useState(null);
  const dragItemNode = useRef();

  const handleDragStart = (e, item) => {
    dragItemNode.current = e.target;
    dragItemNode.current.addEventListener('dragend', handleDragEnd);
    setDraggingItem(item);
    // Un pequeño timeout para que el elemento no desaparezca visualmente al instante
    setTimeout(() => {
        if(dragItemNode.current) dragItemNode.current.classList.add('opacity-50', 'scale-95');
    }, 0);
  };

  const handleDragEnter = (e, targetItem) => {
    // Si entramos a otro item diferente al que arrastramos, intercambiamos lugar
    if (draggingItem !== null && draggingItem !== targetItem) {
      const oldIdx = order.indexOf(draggingItem);
      const newIdx = order.indexOf(targetItem);
      
      // Creamos el nuevo orden
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

  // Props listas para pegar en el componente
  const getDragProps = (id) => ({
    draggable: true,
    onDragStart: (e) => handleDragStart(e, id),
    onDragEnter: (e) => handleDragEnter(e, id),
    // Prevenir el comportamiento default en móviles para permitir scroll si no se arrastra
    onTouchEnd: handleDragEnd
  });

  return { order, getDragProps, draggingItem };
}