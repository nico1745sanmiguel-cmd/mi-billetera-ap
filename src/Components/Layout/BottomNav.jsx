import React, { useState } from 'react';

export default function BottomNav({ currentView, setView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Función para manejar el botón central
  const handleCentralClick = () => {
    // Por ahora, el botón central lleva a "Nueva Compra" (purchase)
    // En el futuro, aquí abriremos un menú abanico con opciones (Gasto, Super, Ingreso)
    setView('purchase');
  };

  const NavItem = ({ id, icon, label }) => {
    const isActive = currentView === id;
    return (
      <button 
        onClick={() => setView(id)}
        className={`relative flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${isActive ? 'text-blue-600 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <div className={`transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'scale-100'}`}>
            {icon}
        </div>
        <span className={`text-[10px] font-bold mt-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 scale-0 hidden md:block'}`}>
            {label}
        </span>
        {/* Puntito indicador activo */}
        {isActive && <div className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full animate-fade-in"></div>}
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none">
      
      {/* 1. CURVA SVG (El fondo blanco recortado) */}
      <div className="absolute bottom-0 w-full h-20 pointer-events-auto filter drop-shadow-[0_-5px_10px_rgba(0,0,0,0.03)]">
        <svg className="w-full h-full" viewBox="0 0 375 80" preserveAspectRatio="none">
          {/* Este path dibuja la barra con la mordida en el medio */}
          <path 
            d="M0,20 L138,20 C145,20 155,20 160,28 C168,42 187.5,65 187.5,65 C187.5,65 207,42 215,28 C220,20 230,20 237,20 L375,20 L375,80 L0,80 Z" 
            fill="white" 
          />
        </svg>
      </div>

      {/* 2. CONTENIDO DE LA BARRA */}
      <div className="absolute bottom-0 w-full h-20 flex justify-between px-6 items-start pt-4 pointer-events-auto">
        
        {/* LADO IZQUIERDO */}
        <div className="flex gap-8">
            <NavItem 
                id="dashboard" 
                label="Inicio" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} 
            />
            <NavItem 
                id="cards" 
                label="Tarjetas" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} 
            />
        </div>

        {/* LADO DERECHO */}
        <div className="flex gap-8">
            <NavItem 
                id="super" 
                label="Super" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h16.5M4.5 3l.75 12h13.5l.75-12M9.75 3v12m4.5-12v12" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 21a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>} 
            />
            {/* Placeholder para Futuro "Perfil" o "Estadísticas" */}
            <NavItem 
                id="stats" 
                label="Análisis" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
            />
        </div>

      </div>

      {/* 3. BOTÓN FLOTANTE CENTRAL (FAB) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button 
            onClick={handleCentralClick}
            className={`
                w-16 h-16 rounded-full 
                bg-gradient-to-tr from-blue-600 to-blue-500 
                text-white shadow-xl shadow-blue-500/40 
                flex items-center justify-center 
                transition-transform duration-200 active:scale-90
                border-4 border-[#f3f4f6]
            `}
        >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

    </div>
  );
}