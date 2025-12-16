import React, { createContext, useState, useContext } from 'react';

// 1. Creamos el Contexto
const AppContext = createContext();

// 2. Creamos el Proveedor (Provider)
export const AppProvider = ({ children }) => {
  // Aquí pondremos todos los estados globales que queremos compartir.
  // Por ahora, solo la vista actual.
  const [currentView, setCurrentView] = useState('home'); // 'home', 'cards', 'new-purchase', etc.

  // El valor que será accesible por todos los componentes hijos.
  const value = {
    currentView,
    setCurrentView,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// 3. Creamos un "Hook" personalizado para usar el contexto fácilmente
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};