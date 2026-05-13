/**
 * UIContext.jsx
 *
 * Maneja todo el estado de interfaz de usuario que es global:
 *   - view / setView              → qué pantalla está activa
 *   - privacyMode / setPrivacyMode → ocultar montos
 *   - isGlass / setIsGlass        → modo dark/glass o light
 *   - currentDate / setCurrentDate → mes seleccionado en el navegador
 *
 * Separar esto de FinancialContext evita que un cambio de vista
 * o de fecha re-renderice componentes que consumen datos financieros.
 *
 * USO:
 *   import { useUI } from '../context/UIContext';
 *   const { view, setView, isGlass } = useUI();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_COLOR_GLASS, THEME_COLOR_LIGHT, CACHE_KEYS } from '../config/constants';
import { getCache, setCache } from '../utils/cache';

const UIContext = createContext(null);

export const useUI = () => {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>');
    return ctx;
};

export const UIProvider = ({ children }) => {
    const [view, setViewRaw] = useState('dashboard');
    const [privacyMode, setPrivacyMode] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [toast, setToast] = useState(null); // { message, type }

    // Inicializar isGlass desde cache (con compatibilidad al key viejo de localStorage)
    const [isGlass, setIsGlassRaw] = useState(() => {
        const cached = getCache(CACHE_KEYS.GLASS_MODE, null);
        if (cached !== null) return cached === true;
        return localStorage.getItem('glass_mode') === 'true';
    });

    // Sincronizar isGlass → meta theme-color, cache y Tailwind .dark class
    useEffect(() => {
        setCache(CACHE_KEYS.GLASS_MODE, isGlass);
        localStorage.setItem('glass_mode', isGlass); // compatibilidad legacy
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isGlass ? THEME_COLOR_GLASS : THEME_COLOR_LIGHT);
        }
        // Aplicar clase dark al HTML para Tailwind
        if (isGlass) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isGlass]);

    // Sincronizar cambios de view → historial del browser (back button mobile)
    useEffect(() => {
        if (view !== 'dashboard') {
            window.history.pushState({ page: view }, '', '');
        }
        const handleBackButton = () => setViewRaw('dashboard');
        window.addEventListener('popstate', handleBackButton);
        return () => window.removeEventListener('popstate', handleBackButton);
    }, [view]);

    // Wrapper de setView para asegurar que siempre sea un string válido
    const setView = (newView) => {
        if (typeof newView === 'string') setViewRaw(newView);
    };

    const setIsGlass = (val) => setIsGlassRaw(val);

    // Helpers de navegación
    const goBack = () => setView('dashboard');

    const changeMonth = (offset) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + offset);
            return d;
        });
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    const value = {
        view,
        setView,
        goBack,
        privacyMode,
        setPrivacyMode,
        isGlass,
        setIsGlass,
        currentDate,
        setCurrentDate,
        changeMonth,
        toast,
        showToast,
        hideToast,
    };

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
