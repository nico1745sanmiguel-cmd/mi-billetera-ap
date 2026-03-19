import React from 'react';

/**
 * Componente NavItem para la navegación inferior.
 * 
 * @param {string} id - Identificador de la vista
 * @param {string} label - Etiqueta del botón
 * @param {React.ReactNode} icon - Ícono del botón
 * @param {string} currentView - Vista actual
 * @param {Function} setView - Función para cambiar de vista
 */
const NavItem = ({ id, icon, label, currentView, setView }) => {
  const isActive = currentView === id;
  return (
    <button
      onClick={() => setView(id)}
      className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`transition-transform duration-200 ${isActive ? '-translate-y-1' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold mt-1 ${isActive ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
        {label}
      </span>
    </button>
  );
};

export default NavItem;
