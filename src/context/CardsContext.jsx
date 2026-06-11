import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';

const CardsContext = createContext();

export const useCards = () => {
    const context = useContext(CardsContext);
    if (!context) {
        throw new Error('useCards must be used within a CardsProvider');
    }
    return context;
};

export const CardsProvider = ({ children }) => {
    const { user, userData } = useAuth();
    
    const [cards, setCards] = useState(() => getCache(CACHE_KEYS.CARDS, []));
    const [transactions, setTransactions] = useState(() => getCache(CACHE_KEYS.TRANSACTIONS, []));

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

        const unsubCards = syncData(COLLECTIONS.CARDS, setCards, CACHE_KEYS.CARDS);
        const unsubTrans = syncData(COLLECTIONS.TRANSACTIONS, setTransactions, CACHE_KEYS.TRANSACTIONS);

        return () => {
            unsubCards();
            unsubTrans();
        };
    }, [user, userData]);

    const ENABLE_HOUSEHOLD = true; // Mantener la misma constante de App.jsx

    const visibleCards = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return cards;
        return cards.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [cards, userData, user]);

    const visibleTransactions = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return transactions;
        return transactions.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [transactions, userData, user]);

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
        cards: visibleCards,
        transactions: visibleTransactions,
        addTransaction
    }), [visibleCards, visibleTransactions]);

    return (
        <CardsContext.Provider value={value}>
            {children}
        </CardsContext.Provider>
    );
};
