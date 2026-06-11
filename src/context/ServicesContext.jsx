import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';

const ServicesContext = createContext();

export const useServices = () => {
    const context = useContext(ServicesContext);
    if (!context) {
        throw new Error('useServices must be used within a ServicesProvider');
    }
    return context;
};

export const ServicesProvider = ({ children }) => {
    const { user, userData } = useAuth();
    
    const [services, setServices] = useState(() => getCache(CACHE_KEYS.SERVICES, []));

    useEffect(() => {
        if (!user) return;

        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        const q = query(collection(db, COLLECTIONS.SERVICES), where(queryField, "==", queryValue));
        const unsubServices = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setServices(data);
            setCache(CACHE_KEYS.SERVICES, data);
        }, (error) => console.error(`Offline/Error for ${COLLECTIONS.SERVICES}:`, error));

        return () => unsubServices();
    }, [user, userData]);

    const ENABLE_HOUSEHOLD = true; // Mantener la constante

    const visibleServices = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return services;
        return services.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [services, userData, user]);

    const value = useMemo(() => ({
        services: visibleServices
    }), [visibleServices]);

    return (
        <ServicesContext.Provider value={value}>
            {children}
        </ServicesContext.Provider>
    );
};
