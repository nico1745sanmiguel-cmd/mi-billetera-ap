import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUIDispatch } from './UIContext';
import { cleanOldCaches } from '../utils/cache';
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
    const { user, userData, loadingUser } = useAuth();
    const { showToast } = useUIDispatch();
    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

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

    const uid = user?.uid;
    const currentHouseholdId = userData?.householdId;
    const [prevAuth, setPrevAuth] = useState({ uid, householdId: currentHouseholdId });

    if (uid !== prevAuth.uid || currentHouseholdId !== prevAuth.householdId) {
        setPrevAuth({ uid, householdId: currentHouseholdId });
        if (!uid || !currentHouseholdId) {
            setNotifications([]);
        }
    }

    // Listener de Notificaciones (separado para que se re-monte cuando householdId llega)
    useEffect(() => {
        if (!uid || !currentHouseholdId) return;
        
        const qNotif = query(collection(db, 'households', currentHouseholdId, 'notifications'));
        const unsubNotifications = onSnapshot(qNotif, (snap) => {
            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setNotifications(data);
        }, (error) => {
            console.error('Offline/Error notifications:', error);
            showToastRef.current('Error de conexión al sincronizar notificaciones.', 'error');
        });

        return () => unsubNotifications();
         
    }, [uid, currentHouseholdId]);

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
