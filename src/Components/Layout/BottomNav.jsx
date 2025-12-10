import React from 'react';

export default function BottomNav({ currentView, setView }) {
  
  // Función temporal para el botón central
  // (Pronto abrirá el menú de "Nuevo Ingreso / Nuevo Gasto / Nueva Tarjeta")
  const handleCentralClick = () => {
    setView('purchase');
  };

  const NavItem = ({ id, icon, label }) => {
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

  return (
    <div className="fixed bottom-0 left-0 w-full z-50">
      
      {/* 1. EL BOTÓN FLOTANTE (CENTRAL) */}
      {/* Lo sacamos del flujo normal para que "flote" de verdad sobre el borde */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <button 
            onClick={handleCentralClick}
            className="
                w-14 h-14 rounded-full 
                bg-[#3483fa] text-white 
                shadow-lg shadow-blue-500/30 
                flex items-center justify-center 
                border-4 border-[#f3f4f6] 
                transition-transform active:scale-90
            "
        >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* 2. LA BARRA SÓLIDA (Fondo Blanco Puro) */}
      <div className="h-16 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex justify-between items-center px-2">
        
        {/* LADO IZQUIERDO */}
        <div className="flex-1 flex justify-around pr-8">
            <NavItem 
                id="dashboard" 
                label="Inicio" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} 
            />
            <NavItem 
                id="cards" 
                label="Tarjetas" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} 
            />
        </div>

        {/* ESPACIO CENTRAL VACÍO (Para el botón flotante) */}
        <div className="w-12"></div>

        {/* LADO DERECHO */}
        <div className="flex-1 flex justify-around pl-8">
            <NavItem 
                id="super" 
                label="Super" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h16.5M4.5 3l.75 12h13.5l.75-12M9.75 3v12m4.5-12v12" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 21a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>} 
            />
            <NavItem 
                id="stats" 
                label="Análisis" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
            />
        </div>

      </div>
    </div>
  );
}