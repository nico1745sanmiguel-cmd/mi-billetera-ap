import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getCache, setCache } from '../utils/cache';
import { CACHE_KEYS } from '../config/constants';
import { useFinancial } from './FinancialContext';
import { useUIDispatch } from './UIContext';
import { mobilityRepository } from '../repositories/mobilityRepository';

const MobilityStateContext = createContext(null);
const MobilityDispatchContext = createContext(null);

export const useMobilityState = () => {
    const context = useContext(MobilityStateContext);
    if (!context) throw new Error('useMobilityState must be used within a MobilityProvider');
    return context;
};

export const useMobilityDispatch = () => {
    const context = useContext(MobilityDispatchContext);
    if (!context) throw new Error('useMobilityDispatch must be used within a MobilityProvider');
    return context;
};

// Retro-compatibilidad
export const useMobility = () => {
    return { ...useMobilityState(), ...useMobilityDispatch() };
};

const DEFAULT_SETTINGS = {
    weekStartDay: 1, // 0 = Domingo, 1 = Lunes, etc.
    activePlatforms: { uber: true, didi: true, cabify: true, others: true },
    expenseCategories: [
        { id: 'gnc', label: 'GNC', iconName: 'Zap', color: '#06b6d4', active: true },
        { id: 'nafta', label: 'Nafta', iconName: 'Fuel', color: '#f59e0b', active: true },
        { id: 'repuestos', label: 'Repuestos', iconName: 'Wrench', color: '#ef4444', active: true },
        { id: 'lavadero', label: 'Lavadero', iconName: 'Droplets', color: '#14b8a6', active: true },
    ],
    defaultTab: 'expenses',
    widgetTitle: 'Movilidad'
};

export const MobilityProvider = ({ children }) => {
    const { user } = useFinancial();
    const { showToast } = useUIDispatch();

    // ─── JORNADAS ─────────────────────────────────────────────────────────────
    const [sessions, setSessions] = useState(() => getCache(CACHE_KEYS.MOBILITY_SESSIONS) || []);
    const [loadingSessions, setLoadingSessions] = useState(true);

    // ─── GASTOS DEL VEHÍCULO ──────────────────────────────────────────────────
    const [expenses, setExpenses] = useState(() => getCache(CACHE_KEYS.MOBILITY_EXPENSES) || []);
    const [loadingExpenses, setLoadingExpenses] = useState(true);

    // ─── AJUSTES ──────────────────────────────────────────────────────────────
    const [settings, setSettings] = useState(() => {
        const cached = getCache(CACHE_KEYS.MOBILITY_SETTINGS);
        if (!cached) return DEFAULT_SETTINGS;
        return {
            ...DEFAULT_SETTINGS,
            ...cached,
            activePlatforms: cached.activePlatforms || DEFAULT_SETTINGS.activePlatforms,
            expenseCategories: cached.expenseCategories || DEFAULT_SETTINGS.expenseCategories,
            weekStartDay: cached.weekStartDay !== undefined ? cached.weekStartDay : DEFAULT_SETTINGS.weekStartDay,
            defaultTab: cached.defaultTab || DEFAULT_SETTINGS.defaultTab,
            widgetTitle: cached.widgetTitle || DEFAULT_SETTINGS.widgetTitle
        };
    });

    const updateSettings = useCallback((newSettings) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            setCache(CACHE_KEYS.MOBILITY_SETTINGS, updated);
            return updated;
        });
    }, []);

    const loading = loadingSessions || loadingExpenses;

    // ── Sync jornadas ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) { setLoadingSessions(false); return; }

        const unsub = mobilityRepository.subscribeToSessions(
            user.uid,
            (data) => {
                setSessions(data);
                setCache(CACHE_KEYS.MOBILITY_SESSIONS, data);
                setLoadingSessions(false);
            },
            (error) => {
                console.error('Mobility sessions error:', error);
                showToast('Error de conexión al sincronizar Jornadas de Movilidad.', 'error');
                setLoadingSessions(false);
            }
        );

        return () => unsub();
    }, [user, showToast]);

    // ── Sync gastos ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) { setLoadingExpenses(false); return; }

        const unsub = mobilityRepository.subscribeToExpenses(
            user.uid,
            (data) => {
                setExpenses(data);
                setCache(CACHE_KEYS.MOBILITY_EXPENSES, data);
                setLoadingExpenses(false);
            },
            (error) => {
                console.error('Mobility expenses error:', error);
                showToast('Error de conexión al sincronizar Gastos de Movilidad.', 'error');
                setLoadingExpenses(false);
            }
        );

        return () => unsub();
    }, [user, showToast]);

    // ─── CRUD JORNADAS ────────────────────────────────────────────────────────
    const addSession = useCallback(async (formData) => {
        if (!user) return;
        try {
            await mobilityRepository.addSession(user.uid, formData);
        } catch (error) {
            console.error('Error adding session:', error);
            showToast('Hubo un error al registrar la jornada de movilidad.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const updateSession = useCallback(async (id, formData) => {
        if (!user) return;
        try {
            await mobilityRepository.updateSession(id, formData);
        } catch (error) {
            console.error('Error updating session:', error);
            showToast('Hubo un error al actualizar la jornada.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteSession = useCallback(async (id) => {
        if (!user) return;
        try {
            await mobilityRepository.deleteSession(id);
        } catch (error) {
            console.error('Error deleting session:', error);
            showToast('Hubo un error al eliminar la jornada.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteAllSessions = useCallback(async () => {
        if (!user) return;
        try {
            await mobilityRepository.deleteAllSessions(sessions);
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            showToast('Hubo un error al eliminar las jornadas.', 'error');
            throw error;
        }
    }, [user, sessions, showToast]);

    const importSessions = useCallback(async (rows) => {
        if (!user) return { ok: 0, errors: 0 };
        return await mobilityRepository.importSessions(user.uid, rows);
    }, [user]);

    // ─── CRUD GASTOS ──────────────────────────────────────────────────────────
    const addExpense = useCallback(async (expenseData) => {
        if (!user) return;
        try {
            await mobilityRepository.addExpense(user.uid, expenseData);
        } catch (error) {
            console.error('Error adding expense:', error);
            showToast('Hubo un error al registrar el gasto.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const updateExpense = useCallback(async (id, expenseData) => {
        if (!user) return;
        try {
            await mobilityRepository.updateExpense(id, expenseData);
        } catch (error) {
            console.error('Error updating expense:', error);
            showToast('Hubo un error al actualizar el gasto.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteExpense = useCallback(async (id) => {
        if (!user) return;
        try {
            await mobilityRepository.deleteExpense(id);
        } catch (error) {
            console.error('Error deleting expense:', error);
            showToast('Hubo un error al eliminar el gasto.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const getDayOfWeek = mobilityRepository.getDayOfWeek;

    const stateValue = useMemo(() => ({
        sessions,
        expenses,
        loading,
        settings,
    }), [sessions, expenses, loading, settings]);

    const dispatchValue = useMemo(() => ({
        addSession,
        updateSession,
        deleteSession,
        deleteAllSessions,
        importSessions,
        addExpense,
        updateExpense,
        deleteExpense,
        getDayOfWeek,
        updateSettings,
    }), [addSession, updateSession, deleteSession, deleteAllSessions, importSessions, addExpense, updateExpense, deleteExpense, updateSettings, getDayOfWeek]);

    return (
        <MobilityDispatchContext.Provider value={dispatchValue}>
            <MobilityStateContext.Provider value={stateValue}>
                {children}
            </MobilityStateContext.Provider>
        </MobilityDispatchContext.Provider>
    );
};
