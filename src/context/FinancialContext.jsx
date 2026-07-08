import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUIDispatch } from './UIContext';
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
    const { showToast } = useUIDispatch();

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
        // El código de sincronización general fue movido a sus respectivos contextos 
        // (CardsContext, SupermarketContext, etc.)
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
        }, (error) => {
            console.error('Offline/Error notifications:', error);
            showToast('Error de conexión al sincronizar notificaciones.', 'error');
        });

        return () => unsubNotifications();
    }, [user, userData?.householdId, showToast]);

    const value = useMemo(() => ({
        user,
        loadingUser,
        notifications,
        dolarBlue
    }), [user, loadingUser, notifications, dolarBlue]);

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};
