import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache, cleanOldCaches } from '../utils/cache';
import { getDolarBlue } from '../services/dolarApi';
import { COLLECTIONS, CACHE_KEYS, SLOW_CONNECTION_TIMEOUT_MS, LOADING_DELAY_MS } from '../config/constants';

const FinancialContext = createContext();

export const useFinancial = () => {
    const context = useContext(FinancialContext);
    if (!context) {
        throw new Error('useFinancial must be used within a FinancialProvider');
    }
    return context;
};

export const FinancialProvider = ({ children }) => {
    const { user, userData, householdMembers, loadingUser } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [dolarBlue, setDolarBlue] = useState(null);

    // Obtener cotización Dolar Blue
    useEffect(() => {
        getDolarBlue().then(data => {
            if (data && data.venta) {
                setDolarBlue(data.venta);
            }
        });
    }, []);

    // Limpiar caches de versiones anteriores (solo corre una vez al montar)
    useEffect(() => { cleanOldCaches(); }, []);

    // 2. Firebase Sync
    useEffect(() => {
        if (!user) return;

        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        const syncData = (collectionName, setState, cacheKey) => {
            const q = query(collection(db, collectionName), where(queryField, "==", queryValue));
            return onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setState(data);
                setCache(cacheKey, data); // cache robusto con versionado
            }, (error) => console.error(`Offline/Error for ${collectionName}:`, error));
        };

        return () => {
        };
    }, [user, userData]);

    // 3. Listener de Notificaciones (separado para que se re-monte cuando householdId llega)
    useEffect(() => {
        const householdId = userData?.householdId;
        if (!user || !householdId) {
            setNotifications([]);
            return;
        }
        const qNotif = query(collection(db, 'households', householdId, 'notifications'));
        const unsubNotifications = onSnapshot(qNotif, (snap) => {
            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setNotifications(data);
        }, (error) => console.error('Offline/Error notifications:', error));

        return () => unsubNotifications();
    }, [user, userData?.householdId]);

    const value = useMemo(() => ({
        user,
        notifications,
        dolarBlue
    }), [user, userData, householdMembers, loadingUser, notifications, dolarBlue]);

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};
