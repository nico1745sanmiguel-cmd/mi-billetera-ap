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

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_COLOR_GLASS, THEME_COLOR_LIGHT, CACHE_KEYS } from '../config/constants';
import { getCache, setCache } from '../utils/cache';

const UIStateContext = createContext(null);
const UIDispatchContext = createContext(null);

export const useUIState = () => {
    const ctx = useContext(UIStateContext);
    if (!ctx) throw new Error('useUIState debe usarse dentro de <UIProvider>');
    return ctx;
};

export const useUIDispatch = () => {
    const ctx = useContext(UIDispatchContext);
    if (!ctx) throw new Error('useUIDispatch debe usarse dentro de <UIProvider>');
    return ctx;
};

// Hook retro-compatible para componentes que aún no fueron migrados
export const useUI = () => {
    return { ...useUIState(), ...useUIDispatch() };
};

export const UIProvider = ({ children }) => {
    const [view, setViewRaw] = useState('dashboard');
    const [privacyMode, setPrivacyMode] = useState(false);
    const [expenseScope, setExpenseScope] = useState('all'); // 'all', 'family', 'personal'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [toast, setToast] = useState(null);

    const [isGlass, setIsGlassRaw] = useState(() => {
        const cached = getCache(CACHE_KEYS.GLASS_MODE, null);
        if (cached !== null) return cached === true;
        return localStorage.getItem('glass_mode') === 'true';
    });

    useEffect(() => {
        setCache(CACHE_KEYS.GLASS_MODE, isGlass);
        localStorage.setItem('glass_mode', isGlass);
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isGlass ? THEME_COLOR_GLASS : THEME_COLOR_LIGHT);
        }
        if (isGlass) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isGlass]);

    useEffect(() => {
        if (view !== 'dashboard') {
            window.history.pushState({ page: view }, '', '');
        }
        const handleBackButton = () => setViewRaw('dashboard');
        window.addEventListener('popstate', handleBackButton);
        return () => window.removeEventListener('popstate', handleBackButton);
    }, [view]);

    // Dispatch methods
    const setView = useCallback((newView) => {
        if (typeof newView === 'string') setViewRaw(newView);
    }, []);

    const setIsGlass = useCallback((val) => setIsGlassRaw(val), []);

    const goBack = useCallback(() => setView('dashboard'), [setView]);

    const changeMonth = useCallback((offset) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + offset);
            return d;
        });
    }, []);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    const stateValue = useMemo(() => ({
        view,
        privacyMode,
        expenseScope,
        isGlass,
        currentDate,
        toast,
    }), [view, privacyMode, expenseScope, isGlass, currentDate, toast]);

    const dispatchValue = useMemo(() => ({
        setView,
        goBack,
        setPrivacyMode,
        setExpenseScope,
        setIsGlass,
        setCurrentDate,
        changeMonth,
        showToast,
        hideToast,
    }), [setView, goBack, setPrivacyMode, setExpenseScope, setIsGlass, changeMonth, showToast, hideToast]);

    return (
        <UIDispatchContext.Provider value={dispatchValue}>
            <UIStateContext.Provider value={stateValue}>
                {children}
            </UIStateContext.Provider>
        </UIDispatchContext.Provider>
    );
};
