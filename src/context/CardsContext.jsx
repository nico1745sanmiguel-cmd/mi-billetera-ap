import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUIDispatch } from './UIContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';
import { sanitizeFinancialData } from '../utils/security';

const CardsStateContext = createContext(null);
const CardsDispatchContext = createContext(null);

export const useCardsState = () => {
    const context = useContext(CardsStateContext);
    if (!context) throw new Error('useCardsState must be used within a CardsProvider');
    return context;
};

export const useCardsDispatch = () => {
    const context = useContext(CardsDispatchContext);
    if (!context) throw new Error('useCardsDispatch must be used within a CardsProvider');
    return context;
};

// Retro-compatibilidad
export const useCards = () => {
    return { ...useCardsState(), ...useCardsDispatch() };
};

export const CardsProvider = ({ children }) => {
    const { user, userData } = useAuth();
    const { showToast } = useUIDispatch();
    
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
            }, (error) => {
                console.error(`Offline/Error for ${collectionName}:`, error);
                showToast(`Error de conexión al sincronizar ${collectionName}. Verifique su internet.`, 'error');
            });
        };

        const unsubCards = syncData(COLLECTIONS.CARDS, setCards, CACHE_KEYS.CARDS);
        const unsubTrans = syncData(COLLECTIONS.TRANSACTIONS, setTransactions, CACHE_KEYS.TRANSACTIONS);

        return () => {
            unsubCards();
            unsubTrans();
        };
    }, [user, userData, showToast]);

    const ENABLE_HOUSEHOLD = true;

    const visibleCards = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return cards;
        return cards.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [cards, userData, user]);

    const visibleTransactions = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return transactions;
        return transactions.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [transactions, userData, user]);

    const addTransaction = useCallback(async (t) => {
        if (!user) return;

        // Validamos y saneamos los datos antes de enviarlos (evitar negativos, NaN)
        const safeData = sanitizeFinancialData(t, ['amount', 'installments'], false);

        const payload = { 
            ...safeData, 
            userId: user.uid,
            ownerId: user.uid,
            householdId: userData?.householdId || null,
            isShared: safeData.isShared !== undefined ? safeData.isShared : true
        };

        try {
            await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), payload);
        } catch (error) {
            console.error("Error adding transaction:", error);
            showToast("Hubo un error al guardar la transacción.", 'error');
            throw error;
        }
    }, [user, userData, showToast]);

    const stateValue = useMemo(() => ({
        cards: visibleCards,
        transactions: visibleTransactions,
    }), [visibleCards, visibleTransactions]);

    const dispatchValue = useMemo(() => ({
        addTransaction
    }), [addTransaction]);

    return (
        <CardsDispatchContext.Provider value={dispatchValue}>
            <CardsStateContext.Provider value={stateValue}>
                {children}
            </CardsStateContext.Provider>
        </CardsDispatchContext.Provider>
    );
};
