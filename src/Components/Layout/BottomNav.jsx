import React from 'react';

const HomeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CardIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const CartIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ChartIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CalendarIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

export default function BottomNav({ currentView, setView, userLevel = 1 }) { // AHORA RECIBE EL NIVEL
  
  const navItems = [
    { id: 'dashboard', icon: <HomeIcon />, label: 'Inicio', minLevel: 1 },
    { id: 'services_manager', icon: <CalendarIcon />, label: 'Fijos', minLevel: 1 },
    { id: 'super', icon: <CartIcon />, label: 'Super', minLevel: 2 },
    { id: 'cards', icon: <CardIcon />, label: 'Tarjetas', minLevel: 3 },
    { id: 'stats', icon: <ChartIcon />, label: 'Análisis', minLevel: 4 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 z-50 shadow-lg">
      <div className="flex justify-around items-center max-w-5xl mx-auto px-2">
        {navItems.map((item) => {
            const isLocked = userLevel < item.minLevel;
            const isActive = currentView === item.id;

            return (
                <button
                    key={item.id}
                    onClick={() => {
                        if (!isLocked) {
                            setView(item.id);
                            // Vibración háptica simple en móviles
                            if (navigator.vibrate) navigator.vibrate(10);
                        }
                    }}
                    className={`flex flex-col items-center justify-center w-full py-2 transition-all active:scale-95 relative
                        ${isActive ? 'text-gray-900' : 'text-gray-400'}
                        ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                    `}
                >
                    <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive && !isLocked ? 'bg-gray-100' : ''}`}>
                        {item.icon}
                        
                        {/* Candado Flotante si está bloqueado */}
                        {isLocked && (
                            <span className="absolute -top-1 -right-1 bg-white rounded-full p-[1px] shadow-sm">
                                <span className="text-[10px]">🔒</span>
                            </span>
                        )}
                        
                        {/* Punto indicador activo */}
                        {isActive && !isLocked && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </button>
            )
        })}
      </div>
    </div>
  );
}