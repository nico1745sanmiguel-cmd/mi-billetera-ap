import React from 'react';

export default function BottomNav({ currentView, setView }) {
  
  // Función auxiliar para saber si el botón está activo
  const isActive = (view) => currentView === view;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        
        {/* BOTÓN 1: RESUMEN (Dashboard) */}
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${isActive('dashboard') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isActive('dashboard') ? 2.5 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span className="text-[10px] font-bold">Resumen</span>
        </button>

        {/* BOTÓN 2: NUEVA COMPRA (Destacado Central) */}
        <div className="relative -top-5">
            <button 
            onClick={() => setView('purchase')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform active:scale-95 border-4 border-[#f3f4f6] ${isActive('purchase') ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}
            >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            </button>
        </div>

        {/* BOTÓN 3: TARJETAS */}
        <button 
          onClick={() => setView('cards')}
          className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${isActive('cards') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isActive('cards') ? 2.5 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <span className="text-[10px] font-bold">Tarjetas</span>
        </button>
        {/* BOTÓN SUPERMERCADO */}
<button 
  onClick={() => setView('super')}
  className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${currentView === 'super' ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
>
  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={currentView === 'super' ? 2.5 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h16.5M4.5 3l.75 12h13.5l.75-12M9.75 3v12m4.5-12v12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
  <span className="text-[10px] font-bold">Super</span>
</button>

      </div>
    </div>
  );
}