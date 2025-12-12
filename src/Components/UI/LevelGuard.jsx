import React from 'react';

export default function LevelGuard({ children, isLocked, title, subtext }) {
  // Si NO está bloqueado, mostramos el contenido normal
  if (!isLocked) return children;

  return (
    <div className="relative group overflow-hidden rounded-2xl select-none">
      {/* 1. CONTENIDO REAL (Boroso e inactivo) */}
      <div className="filter blur-[4px] grayscale opacity-40 pointer-events-none transition-all duration-500 transform scale-[0.98]">
        {children}
      </div>

      {/* 2. EL CANDADO (Overlay) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-50/20 backdrop-blur-[1px] p-4 text-center">
        
        <div className="bg-white p-3 rounded-full shadow-xl mb-2 border border-gray-100 animate-bounce-slow">
            <span className="text-2xl">🔒</span>
        </div>
        
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-0.5">
                {title}
            </p>
            <p className="text-[10px] text-gray-500 font-medium leading-tight max-w-[150px]">
                {subtext}
            </p>
        </div>

      </div>
    </div>
  );
}