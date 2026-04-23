import React from 'react';
import { Home, CreditCard, ShoppingCart, BarChart3, Plus } from 'lucide-react';

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
            <Plus size={32} />
        </button>
      </div>

      {/* 2. LA BARRA SÓLIDA (Fondo Blanco Puro) */}
      <div className="h-16 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex justify-between items-center px-2">
        
        {/* LADO IZQUIERDO */}
        <div className="flex-1 flex justify-around pr-8">
            <NavItem 
                id="dashboard" 
                label="Inicio" 
                icon={<Home size={24} />} 
            />
            <NavItem 
                id="cards" 
                label="Tarjetas" 
                icon={<CreditCard size={24} />} 
            />
        </div>

        {/* ESPACIO CENTRAL VACÍO (Para el botón flotante) */}
        <div className="w-12"></div>

        {/* LADO DERECHO */}
        <div className="flex-1 flex justify-around pl-8">
            <NavItem 
                id="super" 
                label="Super" 
                icon={<ShoppingCart size={24} />} 
            />
            <NavItem 
                id="stats" 
                label="Análisis" 
                icon={<BarChart3 size={24} />} 
            />
        </div>

      </div>
    </div>
  );
}