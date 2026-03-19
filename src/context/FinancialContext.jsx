import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import { checkAndMigrateToHousehold } from '../utils/householdMigration';

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

    // DATOS (Caché local para arranque instantáneo)
    const [cards, setCards] = useState(() => JSON.parse(localStorage.getItem('cache_cards')) || []);
    const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('cache_transactions')) || []);
    const [superItems, setSuperItems] = useState(() => JSON.parse(localStorage.getItem('cache_superItems')) || []);
    const [services, setServices] = useState(() => JSON.parse(localStorage.getItem('cache_services')) || []);

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
            // Small delay to ensure cache is used first if available
            const hasCache = cards.length > 0 || transactions.length > 0;
            setTimeout(() => setLoadingUser(false), hasCache ? 0 : 500);
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
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setState(data);
                localStorage.setItem(cacheKey, JSON.stringify(data));
            }, (error) => console.log(`Offline/Error for ${collectionName}:`, error));
        };

        const unsubCards = syncData('cards', setCards, 'cache_cards');
        const unsubTrans = syncData('transactions', setTransactions, 'cache_transactions');
        const unsubSuper = syncData('supermarket_items', setSuperItems, 'cache_superItems');
        const unsubServices = syncData('services', setServices, 'cache_services');

        return () => {
            unsubCards();
            unsubTrans();
            unsubSuper();
            unsubServices();
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
            await addDoc(collection(db, 'transactions'), payload);
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
        addTransaction
    }), [user, userData, householdMembers, loadingUser, cards, transactions, superItems, services]);

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};
