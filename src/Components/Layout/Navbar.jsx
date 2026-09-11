import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, CreditCard, Eye, EyeOff, TrendingUp, Car, Puzzle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isModuleEnabled } from '../../utils/modulesUtils';

export default function Navbar({ privacyMode, setPrivacyMode, isGlass = false }) {
  // Re-render cuando el usuario activa/desactiva módulos (localStorage puede cambiar)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const mobilityEnabled = isModuleEnabled('mobility');
  const cardsEnabled    = isModuleEnabled('cards');
  const savingsEnabled  = isModuleEnabled('savings');

  const navItems = [
    { id: 'dashboard',         label: 'Resumen Financiero', icon: <BarChart3 size={18} /> },
    ...(savingsEnabled  ? [{ id: 'savings',           label: 'Ahorros',            icon: <TrendingUp size={18} /> }] : []),
    { id: 'purchase',          label: 'Nueva Compra',       icon: <Plus size={18} /> },
    ...(mobilityEnabled ? [{ id: 'mobility', label: 'Movilidad', icon: <Car size={18} /> }] : []),
    ...(cardsEnabled    ? [{ id: 'cards',    label: 'Tarjetas',   icon: <CreditCard size={18} /> }] : []),
    { id: 'settings_modules',  label: 'Módulos',           icon: <Puzzle size={18} /> },
  ];

  return (
    <nav className={`shadow-sm border-b px-6 py-3 transition-colors ${
      isGlass 
        ? 'bg-[#0f0c29]/90 backdrop-blur-md border-white/10 text-white' 
        : 'bg-white dark:bg-slate-900/95 dark:border-slate-800 border-gray-200 text-gray-800 dark:text-white'
    }`}>
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CreditCard className="text-blue-600 dark:text-blue-400" size={28} strokeWidth={2.5} />
          <h1 className={`text-xl font-bold tracking-tight ${isGlass ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            Mi Billetera
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* BOTÓN DE PRIVACIDAD DESKTOP */}
          <button 
            aria-label={privacyMode ? "Modo privado activo, mostrar datos" : "Modo privado inactivo, ocultar datos"} 
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              privacyMode 
                ? (isGlass ? 'bg-blue-500/20 border-blue-400/40 text-blue-300' : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400') 
                : (isGlass ? 'bg-white/10 border-white/15 text-white/80 hover:bg-white/20' : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800')
            }`}
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

          <div className={`h-6 w-px ${isGlass ? 'bg-white/20' : 'bg-gray-200 dark:bg-slate-700'}`}></div>

          <div className="flex gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === `/${item.id}` || (item.id === 'dashboard' && location.pathname === '/');
              return (
                <button 
                  key={item.id}
                  aria-label={item.label} 
                  type="button"
                  onClick={() => navigate(`/${item.id}`)}
                  className={`
                    flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${isActive
                      ? (isGlass ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm font-bold' : 'bg-gray-900 dark:bg-blue-600 text-white shadow-md font-bold')
                      : (isGlass ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}
                  `}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}