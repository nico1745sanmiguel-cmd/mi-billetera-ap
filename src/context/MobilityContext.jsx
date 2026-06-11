import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';
import { useFinancial } from './FinancialContext';
import { useUIDispatch } from './UIContext';
import { sanitizeFinancialData } from '../utils/security';

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

export const MobilityProvider = ({ children }) => {
    const { user } = useFinancial();
    const { showToast } = useUIDispatch();

    // ─── JORNADAS ─────────────────────────────────────────────────────────────
    const [sessions, setSessions] = useState(() => getCache(CACHE_KEYS.MOBILITY_SESSIONS) || []);
    const [loadingSessions, setLoadingSessions] = useState(true);

    // ─── GASTOS DEL VEHÍCULO ──────────────────────────────────────────────────
    const [expenses, setExpenses] = useState(() => getCache('mobility_expenses') || []);
    const [loadingExpenses, setLoadingExpenses] = useState(true);

    const loading = loadingSessions || loadingExpenses;

    // ── Sync jornadas ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) { setLoadingSessions(false); return; }

        const q = query(
            collection(db, COLLECTIONS.MOBILITY_SESSIONS),
            where('userId', '==', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => b.date.localeCompare(a.date));
            setSessions(data);
            setCache(CACHE_KEYS.MOBILITY_SESSIONS, data);
            setLoadingSessions(false);
        }, (error) => {
            console.error('Mobility sessions error:', error);
            showToast('Error de conexión al sincronizar Jornadas de Movilidad.', 'error');
            setLoadingSessions(false);
        });

        return () => unsub();
    }, [user, showToast]);

    // ── Sync gastos ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) { setLoadingExpenses(false); return; }

        const q = query(
            collection(db, 'mobility_expenses'),
            where('userId', '==', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => b.date.localeCompare(a.date));
            setExpenses(data);
            setCache('mobility_expenses', data);
            setLoadingExpenses(false);
        }, (error) => {
            console.error('Mobility expenses error:', error);
            showToast('Error de conexión al sincronizar Gastos de Movilidad.', 'error');
            setLoadingExpenses(false);
        });

        return () => unsub();
    }, [user, showToast]);

    // ─── CAMPOS DERIVADOS (jornadas) ──────────────────────────────────────────
    const buildPayload = useCallback((formData) => {
        const safeData = sanitizeFinancialData(formData, ['uber', 'didi', 'cabify', 'others', 'hoursWorked', 'kilometers'], false);

        const uber    = safeData.uber    || 0;
        const didi    = safeData.didi    || 0;
        const cabify  = safeData.cabify  || 0;
        const others  = safeData.others  || 0;
        const total   = uber + didi + cabify + others;
        const hours   = safeData.hoursWorked || 0;
        const km      = safeData.kilometers  || 0;

        return {
            date:            safeData.date,
            dayOfWeek:       safeData.dayOfWeek || getDayOfWeek(safeData.date),
            hoursWorked:     hours,
            kilometers:      km,
            uber,
            didi,
            cabify,
            others,
            total,
            earningsPerHour: hours > 0 ? parseFloat((total / hours).toFixed(2)) : 0,
            earningsPerKm:   km    > 0 ? parseFloat((total / km).toFixed(2))    : 0,
        };
    }, []);

    const getDayOfWeek = useCallback((dateStr) => {
        if (!dateStr) return 'lunes';
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const d = new Date(dateStr + 'T12:00:00');
        return days[d.getDay()];
    }, []);

    // ─── CRUD JORNADAS ────────────────────────────────────────────────────────
    const addSession = useCallback(async (formData) => {
        if (!user) return;
        const payload = {
            ...buildPayload(formData),
            userId: user.uid,
            createdAt: serverTimestamp(),
        };
        try {
            await addDoc(collection(db, COLLECTIONS.MOBILITY_SESSIONS), payload);
        } catch (error) {
            console.error('Error adding session:', error);
            showToast('Hubo un error al registrar la jornada de movilidad.', 'error');
            throw error;
        }
    }, [user, buildPayload, showToast]);

    const updateSession = useCallback(async (id, formData) => {
        if (!user) return;
        const payload = buildPayload(formData);
        try {
            await updateDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, id), payload);
        } catch (error) {
            console.error('Error updating session:', error);
            showToast('Hubo un error al actualizar la jornada.', 'error');
            throw error;
        }
    }, [user, buildPayload, showToast]);

    const deleteSession = useCallback(async (id) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, id));
        } catch (error) {
            console.error('Error deleting session:', error);
            showToast('Hubo un error al eliminar la jornada.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteAllSessions = useCallback(async () => {
        if (!user) return;
        try {
            for (const session of sessions) {
                await deleteDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, session.id));
            }
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            showToast('Hubo un error al eliminar las jornadas.', 'error');
            throw error;
        }
    }, [user, sessions, showToast]);

    const importSessions = useCallback(async (rows) => {
        if (!user) return { ok: 0, errors: 0 };
        let ok = 0, errors = 0;
        for (const row of rows) {
            try {
                const payload = {
                    ...buildPayload(row),
                    userId: user.uid,
                    createdAt: serverTimestamp(),
                    importedFromCSV: true,
                };
                await addDoc(collection(db, COLLECTIONS.MOBILITY_SESSIONS), payload);
                ok++;
            } catch (e) {
                console.error('Import error for row:', row, e);
                errors++;
            }
        }
        return { ok, errors };
    }, [user, buildPayload]);

    // ─── CRUD GASTOS ──────────────────────────────────────────────────────────
    const addExpense = useCallback(async ({ date, category, amount, notes = '' }) => {
        if (!user) return;
        const safeData = sanitizeFinancialData({ amount }, ['amount'], false);
        try {
            await addDoc(collection(db, 'mobility_expenses'), {
                date,
                category,
                amount: safeData.amount,
                notes,
                userId: user.uid,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error adding expense:', error);
            showToast('Hubo un error al registrar el gasto.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const updateExpense = useCallback(async (id, data) => {
        if (!user) return;
        const safeData = sanitizeFinancialData({ amount: data.amount }, ['amount'], false);
        try {
            await updateDoc(doc(db, 'mobility_expenses', id), {
                date: data.date,
                category: data.category,
                amount: safeData.amount,
                notes: data.notes || '',
            });
        } catch (error) {
            console.error('Error updating expense:', error);
            showToast('Hubo un error al actualizar el gasto.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteExpense = useCallback(async (id) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'mobility_expenses', id));
        } catch (error) {
            console.error('Error deleting expense:', error);
            showToast('Hubo un error al eliminar el gasto.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const stateValue = useMemo(() => ({
        sessions,
        expenses,
        loading,
    }), [sessions, expenses, loading]);

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
    }), [addSession, updateSession, deleteSession, deleteAllSessions, importSessions, addExpense, updateExpense, deleteExpense, getDayOfWeek]);

    return (
        <MobilityDispatchContext.Provider value={dispatchValue}>
            <MobilityStateContext.Provider value={stateValue}>
                {children}
            </MobilityStateContext.Provider>
        </MobilityDispatchContext.Provider>
    );
};
