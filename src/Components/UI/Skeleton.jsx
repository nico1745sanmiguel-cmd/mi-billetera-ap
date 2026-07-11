import React from 'react';

const Skeleton = ({ className = '', type = 'text', width, height }) => {
  // Configuración base de estilos
  let baseStyle = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  // Tipos de esqueleto
  if (type === 'text') {
    baseStyle += ' h-4 rounded';
  } else if (type === 'title') {
    baseStyle += ' h-8 rounded';
  } else if (type === 'circle') {
    baseStyle += ' rounded-full';
  } else if (type === 'rectangular') {
    baseStyle += ' rounded-xl';
  }

  // Estilos en línea para anchos/altos específicos que no estén en Tailwind
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div 
      className={`${baseStyle} ${className}`} 
      style={style}
      aria-hidden="true"
    ></div>
  );
};

export default Skeleton;
