import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, setDoc, deleteDoc, limit } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getCache, setCache } from '../../utils/cache';
import { COLLECTIONS } from '../../config/constants';

export const useSavingsGoal = () => {
    const { user, userData } = useAuth();
    
    const [savingsGoal, setSavingsGoalState] = useState(() => getCache('savings_goal_data', null));
    const [goalLoading, setGoalLoading] = useState(true);

    // Listener del objetivo (Firestore, compartido por household)
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

    const deleteSavingsGoal = useCallback(async () => {
        if (!user || !savingsGoal?.id) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.SAVINGS_GOALS, savingsGoal.id));
        } catch (error) {
            console.error("Error deleting savings goal:", error);
            throw error;
        }
    }, [user, savingsGoal]);

    return {
        savingsGoal,
        goalLoading,
        saveSavingsGoal,
        deleteSavingsGoal
    };
};
