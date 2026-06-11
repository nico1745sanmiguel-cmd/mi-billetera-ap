import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';

const SupermarketContext = createContext();

export const useSupermarket = () => {
    const context = useContext(SupermarketContext);
    if (!context) {
        throw new Error('useSupermarket must be used within a SupermarketProvider');
    }
    return context;
};

export const SupermarketProvider = ({ children }) => {
    const { user, userData } = useAuth();

    const [superItems, setSuperItems] = useState(() => getCache(CACHE_KEYS.SUPER_ITEMS, []));
    const [freshItems, setFreshItems] = useState(() => getCache(CACHE_KEYS.FRESH_ITEMS, []));
    const [plannerCategories, setPlannerCategories] = useState(() => getCache(CACHE_KEYS.PLANNER_CATEGORIES, []));

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
                setCache(cacheKey, data);
            }, (error) => console.error(`Offline/Error for ${collectionName}:`, error));
        };

        const unsubSuper = syncData(COLLECTIONS.SUPERMARKET, setSuperItems, CACHE_KEYS.SUPER_ITEMS);
        const unsubFresh = syncData(COLLECTIONS.FRESH_PURCHASES, setFreshItems, CACHE_KEYS.FRESH_ITEMS);
        const unsubPlannerCat = syncData(COLLECTIONS.PLANNER_CATEGORIES, setPlannerCategories, CACHE_KEYS.PLANNER_CATEGORIES);

        return () => {
            unsubSuper();
            unsubFresh();
            unsubPlannerCat();
        };
    }, [user, userData]);

    const ENABLE_HOUSEHOLD = true; // Mantener la constante

    const visibleSuperItems = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return superItems;
        return superItems.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [superItems, userData, user]);

    // freshItems y plannerCategories por ahora no necesitan filtrado isShared, pero si hiciera falta lo aplicamos.
    // De momento, en App.jsx original no se filtraban con filterByHousehold.
    
    const value = useMemo(() => ({
        superItems: visibleSuperItems,
        freshItems,
        plannerCategories
    }), [visibleSuperItems, freshItems, plannerCategories]);

    return (
        <SupermarketContext.Provider value={value}>
            {children}
        </SupermarketContext.Provider>
    );
};
