import React from 'react';

export default function Navbar({ currentView, setView, privacyMode, setPrivacyMode }) {
  
  const navItems = [
    { id: 'dashboard', label: 'Resumen Financiero', icon: '📊' },
    { id: 'purchase', label: 'Nueva Compra', icon: '➕' },
    { id: 'cards', label: 'Mis Tarjetas', icon: '💳' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Mi Billetera</h1>
        </div>
        
        <div className="flex items-center gap-4">
            {/* BOTÓN DE PRIVACIDAD DESKTOP */}
            <button 
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${privacyMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
                {privacyMode ? (
                   <>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                     <span className="text-xs font-bold">Oculto</span>
                   </>
                ) : (
                   <>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                     <span className="text-xs font-bold">Visible</span>
                   </>
                )}
            </button>

            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex gap-1">
                {navItems.map((item) => (
                    <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${currentView === item.id 
                        ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                    >
                    <span>{item.icon}</span>
                    {item.label}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </nav>
  );
}