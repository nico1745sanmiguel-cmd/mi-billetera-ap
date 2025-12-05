import React from 'react';

export default function Navbar({ currentView, setView }) {
  const navItems = [
    { id: 'purchase', label: 'Nueva Compra' },
    { id: 'cards', label: 'Mis Tarjetas' },
    { id: 'dashboard', label: 'Resumen' },
  ];

  return (
    <header className="bg-[#fff159] shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-[#2d3277] font-bold text-lg">Mi Billetera</h1>
        <nav className="flex space-x-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`px-4 py-2 text-sm rounded transition-colors ${
                currentView === item.id 
                  ? 'font-medium text-[#2d3277] border-b-2 border-[#2d3277]' 
                  : 'text-gray-700 hover:bg-yellow-200/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}