/**
 * UIContext.jsx
 *
 * Maneja todo el estado de interfaz de usuario que es global:
 *   - view / setView              → qué pantalla está activa
 *   - privacyMode / setPrivacyMode → ocultar montos
 *   - theme / setTheme            → 'light' | 'dark' | 'system'
 *   - isGlass                     → computed: true si la UI debe ser dark (retrocompatibilidad)
 *   - currentDate / setCurrentDate → mes seleccionado en el navegador
 *
 * Separar esto de FinancialContext evita que un cambio de vista
 * o de fecha re-renderice componentes que consumen datos financieros.
 *
 * USO:
 *   import { useUI } from '../context/UIContext';
 *   const { isGlass, theme, setTheme } = useUI();
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

// Detecta si el sistema operativo prefiere modo oscuro
const getSystemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

// Lee el tema guardado en localStorage (migra desde el formato boolean anterior)
const readSavedTheme = () => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    // Migración desde el formato boolean anterior
    const legacyGlass = localStorage.getItem('glass_mode');
    if (legacyGlass === 'true') return 'dark';
    if (legacyGlass === 'false') return 'light';
    return 'system'; // default
};

export const UIProvider = ({ children }) => {
    const [privacyMode, setPrivacyMode] = useState(false);
    const [expenseScope, setExpenseScope] = useState('all'); // 'all', 'family', 'personal'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [toast, setToast] = useState(null);
    const [motionPreference, setMotionPreferenceRaw] = useState(() => {
        return localStorage.getItem('app_motion') || 'system';
    });

    // Nuevo estado: 'light' | 'dark' | 'system'
    const [theme, setThemeRaw] = useState(() => {
        const cached = getCache(CACHE_KEYS.GLASS_MODE, null);
        if (cached === 'light' || cached === 'dark' || cached === 'system') return cached;
        return readSavedTheme();
    });

    // Estado auxiliar para escuchar cambios del sistema en tiempo real
    const [systemIsDark, setSystemIsDark] = useState(getSystemDark);

    // Escuchar cambios de preferencia del sistema operativo
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setSystemIsDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // isGlass = true cuando la UI debe ser dark (compatibilidad con todos los componentes existentes)
    const isGlass = useMemo(() => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return systemIsDark; // 'system'
    }, [theme, systemIsDark]);

    // Aplicar clase 'dark' en <html> y meta theme-color
    useEffect(() => {
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

    // Persistir el tema elegido
    useEffect(() => {
        setCache(CACHE_KEYS.GLASS_MODE, theme);
        localStorage.setItem('app_theme', theme);
        // Mantener glass_mode para posible compatibilidad con código externo
        localStorage.setItem('glass_mode', isGlass);
    }, [theme, isGlass]);

    // Persistir preferencia de movimiento
    useEffect(() => {
        localStorage.setItem('app_motion', motionPreference);
    }, [motionPreference]);

    // Dispatch: setMotionPreference con validación
    const setMotionPreference = useCallback((val) => {
        if (val === 'on' || val === 'off' || val === 'system') {
            // react-doctor-disable-next-line react-doctor/no-impure-state-updater
            setMotionPreferenceRaw(val);
        }
    }, []);

    // Dispatch: setTheme con validación
    const setTheme = useCallback((val) => {
        if (val === 'light' || val === 'dark' || val === 'system') {
            // react-doctor-disable-next-line react-doctor/no-impure-state-updater
            setThemeRaw(val);
        }
    }, []);

    // Alias retrocompatible: setIsGlass(true) → 'dark', setIsGlass(false) → 'light'
    const setIsGlass = useCallback((val) => {
        setThemeRaw(val ? 'dark' : 'light');
    }, []);

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
        privacyMode,
        expenseScope,
        isGlass,
        theme,
        motionPreference,
        currentDate,
        toast,
    }), [privacyMode, expenseScope, isGlass, theme, motionPreference, currentDate, toast]);

    const dispatchValue = useMemo(() => ({
        setPrivacyMode,
        setExpenseScope,
        setIsGlass,
        setTheme,
        setMotionPreference,
        setCurrentDate,
        changeMonth,
        showToast,
        hideToast,
    }), [setPrivacyMode, setExpenseScope, setIsGlass, setTheme, setMotionPreference, changeMonth, showToast, hideToast]);

    return (
        <UIDispatchContext.Provider value={dispatchValue}>
            <UIStateContext.Provider value={stateValue}>
                {children}
            </UIStateContext.Provider>
        </UIDispatchContext.Provider>
    );
};
