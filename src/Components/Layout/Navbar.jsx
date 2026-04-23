import React from 'react';
import { BarChart3, Plus, CreditCard, Eye, EyeOff } from 'lucide-react';

export default function Navbar({ currentView, setView, privacyMode, setPrivacyMode }) {

  const navItems = [
    { id: 'dashboard', label: 'Resumen Financiero', icon: <BarChart3 size={18} /> },
    { id: 'purchase', label: 'Nueva Compra', icon: <Plus size={18} /> },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CreditCard className="text-blue-600" size={28} strokeWidth={2.5} />
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
                <EyeOff size={16} />
                <span className="text-xs font-bold">Oculto</span>
              </>
            ) : (
              <>
                <Eye size={16} />
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