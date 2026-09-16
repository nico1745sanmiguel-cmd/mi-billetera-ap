import React, { useState, useEffect, useRef, memo } from 'react';
import {
  BarChart3,
  Plus,
  CreditCard,
  Eye,
  EyeOff,
  TrendingUp,
  Car,
  Puzzle,
  CalendarDays,
  ShoppingCart,
  Briefcase,
  Users,
  PieChart,
  StickyNote,
  ChevronDown
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isModuleEnabled } from '../../utils/modulesUtils';

function Navbar({ privacyMode, setPrivacyMode, isGlass = false }) {
  // Re-render cuando el usuario activa/desactiva módulos
  const [, forceUpdate] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('storage', handler);
    window.addEventListener('modulesChanged', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('modulesChanged', handler);
    };
  }, []);

  // Cerrar dropdown al hacer click afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // Módulos dinámicos según configuración activa
  const mobilityEnabled = isModuleEnabled('mobility');
  const cardsEnabled    = isModuleEnabled('cards');
  const savingsEnabled  = isModuleEnabled('savings');
  const servicesEnabled = isModuleEnabled('agenda') || isModuleEnabled('planner');
  const superEnabled    = isModuleEnabled('supermarket');
  const salaryEnabled   = isModuleEnabled('salary');
  const sharedEnabled   = isModuleEnabled('household');
  const statsEnabled    = isModuleEnabled('stats');
  const notesEnabled    = isModuleEnabled('notes');

  // Enlaces directos principales para mantener la barra limpia
  const primaryNavItems = [
    { id: 'dashboard',         label: 'Resumen Financiero', icon: <BarChart3 size={18} /> },
    { id: 'purchase',          label: 'Nueva Compra',       icon: <Plus size={18} /> },
    ...(cardsEnabled    ? [{ id: 'cards',            label: 'Tarjetas',           icon: <CreditCard size={18} /> }] : []),
    ...(savingsEnabled  ? [{ id: 'savings',          label: 'Ahorros',            icon: <TrendingUp size={18} /> }] : []),
    ...(servicesEnabled ? [{ id: 'services_manager', label: 'Servicios',          icon: <CalendarDays size={18} /> }] : []),
  ];

  // Módulos contextuales agrupados en menú "Más módulos"
  const moreNavItems = [
    ...(superEnabled    ? [{ id: 'super',            label: 'Supermercado',       icon: <ShoppingCart size={18} /> }] : []),
    ...(salaryEnabled   ? [{ id: 'salary',           label: 'Sueldos',            icon: <Briefcase size={18} /> }] : []),
    ...(sharedEnabled   ? [{ id: 'reparto',          label: 'Gastos Compartidos', icon: <Users size={18} /> }] : []),
    ...(mobilityEnabled ? [{ id: 'mobility',         label: 'Movilidad',          icon: <Car size={18} /> }] : []),
    ...(statsEnabled    ? [{ id: 'stats',            label: 'Estadísticas',       icon: <PieChart size={18} /> }] : []),
    ...(notesEnabled    ? [{ id: 'notes',            label: 'Notas',              icon: <StickyNote size={18} /> }] : []),
    { id: 'settings_modules', label: 'Configurar Módulos', icon: <Puzzle size={18} /> },
  ];

  const isMoreActive = moreNavItems.some(item => 
    location.pathname === `/${item.id}` || location.pathname.startsWith(`/${item.id}/`)
  );

  const handleNavigate = (path) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  return (
    <nav className={`shadow-sm border-b px-6 py-3 transition-colors ${
      isGlass 
        ? 'bg-[#0f0c29]/90 backdrop-blur-md border-white/10 text-white' 
        : 'bg-white dark:bg-slate-900/95 dark:border-slate-800 border-gray-200 text-gray-800 dark:text-white'
    }`}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CreditCard className="text-blue-600 dark:text-blue-400" size={28} strokeWidth={2.5} />
          <h1 className={`text-xl font-bold tracking-tight ${isGlass ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            Mi Billetera
          </h1>
        </div>

        <div className="flex items-center gap-3">
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

          {/* ENLACES PRINCIPALES */}
          <div className="flex gap-1 items-center">
            {primaryNavItems.map((item) => {
              const isActive = location.pathname === `/${item.id}` || (item.id === 'dashboard' && location.pathname === '/');
              return (
                <button 
                  key={item.id}
                  aria-label={item.label} 
                  type="button"
                  onClick={() => handleNavigate(`/${item.id}`)}
                  className={`
                    flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${isActive
                      ? (isGlass ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm font-bold' : 'bg-gray-900 dark:bg-blue-600 text-white shadow-md font-bold')
                      : (isGlass ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}
                  `}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* MENÚ DESPLEGABLE CONTEXTUAL "MÁS MÓDULOS" */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                aria-label="Más módulos y opciones"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className={`
                  flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${isMoreActive || isDropdownOpen
                    ? (isGlass ? 'bg-white/20 text-white shadow-sm font-bold' : 'bg-gray-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800')
                    : (isGlass ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}
                `}
              >
                <Puzzle size={18} />
                <span>Más</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border py-2 z-50 animate-fade-in ${
                    isGlass
                      ? 'bg-[#181438]/95 backdrop-blur-xl border-white/15 text-white'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-800 dark:text-white'
                  }`}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Módulos Activos
                  </div>

                  {moreNavItems.map((item) => {
                    const isActive = location.pathname === `/${item.id}` || location.pathname.startsWith(`/${item.id}/`);
                    return (
                      <button
                        key={item.id}
                        role="menuitem"
                        type="button"
                        aria-label={item.label}
                        onClick={() => handleNavigate(`/${item.id}`)}
                        className={`w-full flex items-center gap-3 px-3.5 min-h-[44px] text-sm text-left transition-colors ${
                          isActive
                            ? (isGlass ? 'bg-white/20 text-white font-bold' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold')
                            : (isGlass ? 'hover:bg-white/10 text-white/80' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200')
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);