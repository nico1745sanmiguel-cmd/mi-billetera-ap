import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS, ENABLE_HOUSEHOLD } from '../config/constants';

const ServicesContext = createContext();

export const useServices = () => {
    const context = useContext(ServicesContext);
    if (!context) {
        throw new Error('useServices must be used within a ServicesProvider');
    }
    return context;
};

export const ServicesProvider = ({ children }) => {
    const { user, userData, loadingUser } = useAuth();
    
    const [services, setServices] = useState(() => getCache(CACHE_KEYS.SERVICES, []));
    const [loading, setLoading] = useState(() => !getCache(CACHE_KEYS.SERVICES, null));

    const uid = user?.uid;
    const householdId = userData?.householdId;

    useEffect(() => {
        if (loadingUser) {
            setLoading(true);
            return;
        }
        if (!uid) {
            setLoading(false);
            return;
        }

        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = query(collection(db, COLLECTIONS.SERVICES), where(queryField, "==", queryValue));
        const unsubServices = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setServices(data);
            setLoading(false);
            setCache(CACHE_KEYS.SERVICES, data);
        }, (error) => {
            console.error(`Offline/Error for ${COLLECTIONS.SERVICES}:`, error);
            setLoading(false);
        });

        return () => unsubServices();
    }, [uid, householdId, loadingUser]);

    const visibleServices = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !householdId) return services;
        return services.filter(item => !item.ownerId || item.isShared === true || item.ownerId === uid);
    }, [services, householdId, uid]);

    const value = useMemo(() => ({
        services: visibleServices,
        loading
    }), [visibleServices, loading]);

    return (
        <ServicesContext.Provider value={value}>
            {children}
        </ServicesContext.Provider>
    );
};
