import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';
import { useFinancial } from './FinancialContext';

const MobilityContext = createContext();

export const useMobility = () => {
    const context = useContext(MobilityContext);
    if (!context) throw new Error('useMobility must be used within a MobilityProvider');
    return context;
};

export const MobilityProvider = ({ children }) => {
    const { user } = useFinancial();
    const [sessions, setSessions] = useState(() => getCache(CACHE_KEYS.MOBILITY_SESSIONS) || []);
    const [loading, setLoading] = useState(true);

    // Sincronizar en tiempo real con Firestore (igual que FinancialContext)
    useEffect(() => {
        if (!user) { setLoading(false); return; }

        const q = query(
            collection(db, COLLECTIONS.MOBILITY_SESSIONS),
            where('userId', '==', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Ordenar por fecha descendente
            data.sort((a, b) => b.date.localeCompare(a.date));
            setSessions(data);
            setCache(CACHE_KEYS.MOBILITY_SESSIONS, data);
            setLoading(false);
        }, (error) => {
            console.error('Mobility sessions error:', error);
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    // ─── CALCULAR CAMPOS DERIVADOS ────────────────────────────────────────────
    // Recibe los datos crudos y devuelve el objeto completo con totales calculados
    const buildPayload = (formData) => {
        const uber    = parseFloat(formData.uber)    || 0;
        const didi    = parseFloat(formData.didi)    || 0;
        const cabify  = parseFloat(formData.cabify)  || 0;
        const others  = parseFloat(formData.others)  || 0;
        const total   = uber + didi + cabify + others;
        const hours   = parseFloat(formData.hoursWorked) || 0;
        const km      = parseFloat(formData.kilometers)  || 0;

        return {
            date:            formData.date,
            dayOfWeek:       formData.dayOfWeek || getDayOfWeek(formData.date),
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
    };

    const getDayOfWeek = (dateStr) => {
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const d = new Date(dateStr + 'T12:00:00'); // T12 evita offset timezone
        return days[d.getDay()];
    };

    // ─── CRUD ─────────────────────────────────────────────────────────────────
    const addSession = useCallback(async (formData) => {
        if (!user) return;
        const payload = {
            ...buildPayload(formData),
            userId: user.uid,
            createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, COLLECTIONS.MOBILITY_SESSIONS), payload);
    }, [user]);

    const updateSession = useCallback(async (id, formData) => {
        if (!user) return;
        const payload = buildPayload(formData);
        await updateDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, id), payload);
    }, [user]);

    const deleteSession = useCallback(async (id) => {
        if (!user) return;
        await deleteDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, id));
    }, [user]);

    // ─── IMPORTACIÓN MASIVA (para histórico CSV) ──────────────────────────────
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
    }, [user]);

    const value = useMemo(() => ({
        sessions,
        loading,
        addSession,
        updateSession,
        deleteSession,
        importSessions,
        getDayOfWeek,
    }), [sessions, loading, addSession, updateSession, deleteSession, importSessions]);

    return (
        <MobilityContext.Provider value={value}>
            {children}
        </MobilityContext.Provider>
    );
};
