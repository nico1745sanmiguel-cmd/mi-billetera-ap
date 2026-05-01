import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import { checkAndMigrateToHousehold } from '../utils/householdMigration';
import { getCache, setCache, cleanOldCaches } from '../utils/cache';
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
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [householdMembers, setHouseholdMembers] = useState([]);
    const [loadingUser, setLoadingUser] = useState(true);

    // DATOS (Caché local para arranque instantáneo — robusto con versionado y try/catch)
    const [cards, setCards] = useState(() => getCache(CACHE_KEYS.CARDS));
    const [transactions, setTransactions] = useState(() => getCache(CACHE_KEYS.TRANSACTIONS));
    const [superItems, setSuperItems] = useState(() => getCache(CACHE_KEYS.SUPER_ITEMS));
    const [services, setServices] = useState(() => getCache(CACHE_KEYS.SERVICES));
    const [freshItems, setFreshItems] = useState(() => getCache(CACHE_KEYS.FRESH_ITEMS));

    // Limpiar caches de versiones anteriores (solo corre una vez al montar)
    useEffect(() => { cleanOldCaches(); }, []);

    // 1. Auth Listener & Household Migration
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const currentHouseholdId = await checkAndMigrateToHousehold(currentUser);
                setUserData({ householdId: currentHouseholdId });

                if (currentHouseholdId) {
                    try {
                        const hhSnap = await getDoc(doc(db, 'households', currentHouseholdId));
                        if (hhSnap.exists()) {
                            const memberIds = hhSnap.data().members || [];
                            const memberPromises = memberIds.map(uid => getDoc(doc(db, 'users', uid)));
                            const memberSnaps = await Promise.all(memberPromises);
                            const members = memberSnaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id });
                            setHouseholdMembers(members);
                        }
                    } catch (e) {
                        console.error('Error loading household members:', e);
                    }
                }
            }
            // Small delay para asegurarnos de mostrar el cache antes de mostrar la app
            const hasCache = cards.length > 0 || transactions.length > 0;
            setTimeout(() => setLoadingUser(false), hasCache ? 0 : LOADING_DELAY_MS);
        });
        return () => unsubscribe();
    }, []);

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
            }, (error) => console.log(`Offline/Error for ${collectionName}:`, error));
        };

        const unsubCards    = syncData(COLLECTIONS.CARDS,        setCards,        CACHE_KEYS.CARDS);
        const unsubTrans    = syncData(COLLECTIONS.TRANSACTIONS,  setTransactions,  CACHE_KEYS.TRANSACTIONS);
        const unsubSuper    = syncData(COLLECTIONS.SUPERMARKET,   setSuperItems,    CACHE_KEYS.SUPER_ITEMS);
        const unsubServices = syncData(COLLECTIONS.SERVICES,      setServices,      CACHE_KEYS.SERVICES);
        const unsubFresh    = syncData(COLLECTIONS.FRESH_PURCHASES, setFreshItems,  CACHE_KEYS.FRESH_ITEMS);

        return () => {
            unsubCards();
            unsubTrans();
            unsubSuper();
            unsubServices();
            unsubFresh();
        };
    }, [user, userData]);

    const addTransaction = async (t) => {
        if (!user) return;
        const payload = { 
            ...t, 
            userId: user.uid,
            ownerId: user.uid,
            householdId: userData?.householdId || null,
            isShared: t.isShared !== undefined ? t.isShared : true
        };

        try {
            await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), payload);
        } catch (error) {
            console.error("Error adding transaction:", error);
            throw error;
        }
    };

    const value = useMemo(() => ({
        user,
        userData,
        householdMembers,
        loadingUser,
        cards,
        transactions,
        superItems,
        services,
        freshItems,
        addTransaction
    }), [user, userData, householdMembers, loadingUser, cards, transactions, superItems, services, freshItems]);

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};
