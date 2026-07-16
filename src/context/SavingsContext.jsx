import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection, onSnapshot, query, where, addDoc, serverTimestamp,
    doc, setDoc, deleteDoc, limit
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';

const SavingsContext = createContext();

export const useSavings = () => {
    const context = useContext(SavingsContext);
    if (!context) {
        throw new Error('useSavings must be used within a SavingsProvider');
    }
    return context;
};

export const SavingsProvider = ({ children }) => {
    const { user, userData } = useAuth();

    const [savingsTransactions, setSavingsTransactions] = useState(() => getCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, []));
    const [savingsGoal, setSavingsGoalState] = useState(() => getCache('savings_goal_data', null));
    const [goalLoading, setGoalLoading] = useState(true);

    // ─── Listener de transacciones ────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        const q = query(collection(db, COLLECTIONS.SAVINGS_TRANSACTIONS), where(queryField, "==", queryValue));
        const unsubSavings = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSavingsTransactions(data);
            setCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, data);
        }, (error) => console.error(`Offline/Error for ${COLLECTIONS.SAVINGS_TRANSACTIONS}:`, error));

        return () => unsubSavings();
    }, [user, userData]);

    // ─── Listener del objetivo (Firestore, compartido por household) ──────────
    useEffect(() => {
        if (!user) return;

        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        const q = query(
            collection(db, COLLECTIONS.SAVINGS_GOALS),
            where(queryField, "==", queryValue),
            limit(1)
        );

        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) {
                setSavingsGoalState(null);
                setCache('savings_goal_data', null);
            } else {
                const d = snap.docs[0];
                const goalData = { id: d.id, ...d.data() };
                setSavingsGoalState(goalData);
                setCache('savings_goal_data', goalData);
            }
            setGoalLoading(false);
        }, (error) => {
            console.error(`Error fetching savings goal:`, error);
            setGoalLoading(false);
        });

        return () => unsub();
    }, [user, userData]);

    // ─── Guardar/actualizar objetivo ──────────────────────────────────────────
    const saveSavingsGoal = useCallback(async (goalData) => {
        if (!user) return;

        const householdId = userData?.householdId || null;
        const payload = {
            ...goalData,
            userId: user.uid,
            householdId,
            updatedAt: serverTimestamp(),
        };

        try {
            if (savingsGoal?.id) {
                // Actualizar el doc existente
                await setDoc(doc(db, COLLECTIONS.SAVINGS_GOALS, savingsGoal.id), payload, { merge: true });
            } else {
                // Crear uno nuevo
                payload.createdAt = serverTimestamp();
                await addDoc(collection(db, COLLECTIONS.SAVINGS_GOALS), payload);
            }
        } catch (error) {
            console.error("Error saving savings goal:", error);
            throw error;
        }
    }, [user, userData, savingsGoal]);

    // ─── Eliminar objetivo ────────────────────────────────────────────────────
    const deleteSavingsGoal = useCallback(async () => {
        if (!user || !savingsGoal?.id) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.SAVINGS_GOALS, savingsGoal.id));
        } catch (error) {
            console.error("Error deleting savings goal:", error);
            throw error;
        }
    }, [user, savingsGoal]);

    // ─── Agregar transacción ──────────────────────────────────────────────────
    const addSavingsTransaction = useCallback(async (t) => {
        if (!user) return;
        const payload = {
            ...t,
            userId: user.uid,
            ownerId: user.uid,
            householdId: userData?.householdId || null,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, COLLECTIONS.SAVINGS_TRANSACTIONS), payload);
        } catch (error) {
            console.error("Error adding savings transaction:", error);
            throw error;
        }
    }, [user, userData]);

    // ─── Eliminar todos los ahorros ───────────────────────────────────────────
    const clearAllSavings = useCallback(async () => {
        if (!user) return;
        try {
            const promises = savingsTransactions.map(tx => 
                deleteDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, tx.id))
            );
            if (savingsGoal?.id) {
                promises.push(deleteDoc(doc(db, COLLECTIONS.SAVINGS_GOALS, savingsGoal.id)));
            }
            await Promise.all(promises);
        } catch (error) {
            console.error("Error clearing all savings:", error);
            throw error;
        }
    }, [user, savingsTransactions, savingsGoal]);

    const value = useMemo(() => ({
        savingsTransactions,
        addSavingsTransaction,
        savingsGoal,
        goalLoading,
        saveSavingsGoal,
        deleteSavingsGoal,
        clearAllSavings,
    }), [savingsTransactions, addSavingsTransaction, savingsGoal, goalLoading, saveSavingsGoal, deleteSavingsGoal, clearAllSavings]);

    return (
        <SavingsContext.Provider value={value}>
            {children}
        </SavingsContext.Provider>
    );
};
