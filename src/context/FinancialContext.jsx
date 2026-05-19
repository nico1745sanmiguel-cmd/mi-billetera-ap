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
    const [householdMembers, setHouseholdMembers] = useState(() => getCache('householdMembers', []));
    const [loadingUser, setLoadingUser] = useState(true);

    // DATOS (Caché local para arranque instantáneo — robusto con versionado y try/catch)
    const [cards, setCards] = useState(() => getCache(CACHE_KEYS.CARDS));
    const [transactions, setTransactions] = useState(() => getCache(CACHE_KEYS.TRANSACTIONS));
    const [superItems, setSuperItems] = useState(() => getCache(CACHE_KEYS.SUPER_ITEMS));
    const [services, setServices] = useState(() => getCache(CACHE_KEYS.SERVICES));
    const [freshItems, setFreshItems] = useState(() => getCache(CACHE_KEYS.FRESH_ITEMS));
    const [plannerCategories, setPlannerCategories] = useState(() => getCache(CACHE_KEYS.PLANNER_CATEGORIES) || []);
    const [notifications, setNotifications] = useState([]);

    // Limpiar caches de versiones anteriores (solo corre una vez al montar)
    useEffect(() => { cleanOldCaches(); }, []);

    // 1. Auth Listener & Household Migration
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // 1. Si tenemos datos esenciales cacheados, podemos mostrar la UI enseguida
                const hasCache = cards.length > 0 || transactions.length > 0;
                
                // Tratar de recuperar userData (householdId) del cache
                const cachedUserData = getCache('userData', null);
                if (cachedUserData) {
                    setUserData(cachedUserData);
                    if (hasCache) {
                        setLoadingUser(false);
                    }
                }

                // 2. Traer el dato real de Firebase (y migrar si es necesario)
                const currentHouseholdId = await checkAndMigrateToHousehold(currentUser);
                if (!cachedUserData || cachedUserData.householdId !== currentHouseholdId) {
                    setUserData({ householdId: currentHouseholdId });
                    setCache('userData', { householdId: currentHouseholdId });
                }

                // 3. Si no teníamos cache, apagamos el loading acá
                if (!cachedUserData || !hasCache) {
                    setTimeout(() => setLoadingUser(false), hasCache ? 0 : LOADING_DELAY_MS);
                }

                // 4. Traer miembros en background (sin bloquear con await)
                if (currentHouseholdId) {
                    getDoc(doc(db, 'households', currentHouseholdId)).then(async (hhSnap) => {
                        if (hhSnap.exists()) {
                            const memberIds = hhSnap.data().members || [];
                            const memberPromises = memberIds.map(uid => getDoc(doc(db, 'users', uid)));
                            const memberSnaps = await Promise.all(memberPromises);
                            const members = memberSnaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id });
                            setHouseholdMembers(members);
                            setCache('householdMembers', members);
                        }
                    }).catch(e => console.error('Error loading household members:', e));
                }
            } else {
                setLoadingUser(false);
            }
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
            }, (error) => console.error(`Offline/Error for ${collectionName}:`, error));
        };

        const unsubCards    = syncData(COLLECTIONS.CARDS,        setCards,        CACHE_KEYS.CARDS);
        const unsubTrans    = syncData(COLLECTIONS.TRANSACTIONS,  setTransactions,  CACHE_KEYS.TRANSACTIONS);
        const unsubSuper    = syncData(COLLECTIONS.SUPERMARKET,   setSuperItems,    CACHE_KEYS.SUPER_ITEMS);
        const unsubServices = syncData(COLLECTIONS.SERVICES,      setServices,      CACHE_KEYS.SERVICES);
        const unsubFresh    = syncData(COLLECTIONS.FRESH_PURCHASES, setFreshItems,  CACHE_KEYS.FRESH_ITEMS);
        const unsubPlannerCat = syncData(COLLECTIONS.PLANNER_CATEGORIES, setPlannerCategories, CACHE_KEYS.PLANNER_CATEGORIES);

        // Notificaciones (solo si hay household)
        let unsubNotifications = () => {};
        if (householdId) {
            const qNotif = query(collection(db, 'households', householdId, 'notifications'));
            unsubNotifications = onSnapshot(qNotif, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                setNotifications(data);
            }, (error) => console.error('Offline/Error notifications:', error));
        }

        return () => {
            unsubCards();
            unsubTrans();
            unsubSuper();
            unsubServices();
            unsubFresh();
            unsubPlannerCat();
            unsubNotifications();
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
        plannerCategories,
        notifications,
        addTransaction
    }), [user, userData, householdMembers, loadingUser, cards, transactions, superItems, services, freshItems, plannerCategories, notifications]);

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};
