import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { getCache, setCache } from '../utils/cache';

const CACHE_KEY = 'mi_billetera_notes_settings';

const DEFAULT_SETTINGS = {
    postItSkin: 'amber', // amber, rose, mint, cyan, glass
    notesSkin: 'dark', // dark, light, glass
    categories: ['Personal', 'Trabajo', 'Compras', 'Ideas']
};

const NotesStateContext = createContext(null);
const NotesDispatchContext = createContext(null);

export const useNotesState = () => {
    const context = useContext(NotesStateContext);
    if (!context) throw new Error('useNotesState must be used within a NotesProvider');
    return context;
};

export const useNotesDispatch = () => {
    const context = useContext(NotesDispatchContext);
    if (!context) throw new Error('useNotesDispatch must be used within a NotesProvider');
    return context;
};

export const useNotes = () => {
    return { ...useNotesState(), ...useNotesDispatch() };
};

export const NotesProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => {
        const cached = getCache(CACHE_KEY);
        if (!cached) return DEFAULT_SETTINGS;
        return {
            ...DEFAULT_SETTINGS,
            ...cached,
            categories: cached.categories || DEFAULT_SETTINGS.categories,
        };
    });

    const updateSettings = useCallback((newSettings) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            setCache(CACHE_KEY, updated);
            return updated;
        });
    }, []);

    const stateValue = useMemo(() => ({
        settings
    }), [settings]);

    const dispatchValue = useMemo(() => ({
        updateSettings
    }), [updateSettings]);

    return (
        <NotesDispatchContext.Provider value={dispatchValue}>
            <NotesStateContext.Provider value={stateValue}>
                {children}
            </NotesStateContext.Provider>
        </NotesDispatchContext.Provider>
    );
};
