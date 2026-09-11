import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS, ENABLE_HOUSEHOLD } from '../config/constants';

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

    const [loading, setLoading] = useState(() => {
        const cachedSuper = getCache(CACHE_KEYS.SUPER_ITEMS, null);
        const cachedFresh = getCache(CACHE_KEYS.FRESH_ITEMS, null);
        return !cachedSuper && !cachedFresh;
    });

    useEffect(() => {
        if (!user) return;

        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        let loadedCount = 0;
        const checkLoaded = () => {
            loadedCount += 1;
            if (loadedCount >= 3) {
                setLoading(false);
            }
        };

        const syncData = (collectionName, setState, cacheKey) => {
            const q = query(collection(db, collectionName), where(queryField, "==", queryValue));
            return onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setState(data);
                setCache(cacheKey, data);
                checkLoaded();
            }, (error) => {
                console.error(`Offline/Error for ${collectionName}:`, error);
                checkLoaded();
            });
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

    const visibleSuperItems = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return superItems;
        return superItems.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [superItems, userData, user]);

    const visibleFreshItems = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return freshItems;
        return freshItems.filter(item => !item.ownerId || item.isShared !== false || item.ownerId === user?.uid);
    }, [freshItems, userData, user]);
    
    const value = useMemo(() => ({
        superItems: visibleSuperItems,
        freshItems: visibleFreshItems,
        plannerCategories,
        loading
    }), [visibleSuperItems, visibleFreshItems, plannerCategories, loading]);

    return (
        <SupermarketContext.Provider value={value}>
            {children}
        </SupermarketContext.Provider>
    );
};
