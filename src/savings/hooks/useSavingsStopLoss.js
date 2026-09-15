import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, or, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getCache, setCache } from '../../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../../config/constants';
import { getStopLossPercentage } from '../../utils/stopLossService';

export const useSavingsStopLoss = () => {
    const { user, userData } = useAuth();
    const [stopLosses, setStopLosses] = useState(() => getCache(CACHE_KEYS.SAVINGS_STOP_LOSSES, {}));

    const uid = user?.uid;
    const householdId = userData?.householdId;

    // Listener de Stop Losses
    useEffect(() => {
        if (!uid) return;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = householdId
            ? query(collection(db, COLLECTIONS.SAVINGS_STOP_LOSSES), or(where("householdId", "==", householdId), where("userId", "==", user.uid)))
            : query(collection(db, COLLECTIONS.SAVINGS_STOP_LOSSES), where("userId", "==", user.uid));
        const unsub = onSnapshot(q, (snap) => {
            const data = {};
            snap.docs.forEach(d => {
                const docData = d.data();
                if (docData.especie) {
                    const esp = docData.especie.toUpperCase();
                    // Calcular el precio de stop al vuelo para ser reactivo
                    const beta = parseFloat(docData.beta) || 1.20;
                    const maxPrice = parseFloat(docData.maxPrecioRegistrado) || parseFloat(docData.precioCompra) || 0;
                    const pct = getStopLossPercentage(beta);
                    const stopPrecio = maxPrice * (1 - pct);

                    data[esp] = {
                        id: d.id,
                        ...docData,
                        stopPrecio
                    };
                }
            });
            setStopLosses(data);
            setCache(CACHE_KEYS.SAVINGS_STOP_LOSSES, data);
        }, (error) => console.error("Error fetching stop losses:", error));

        return () => unsub();
    }, [uid, householdId]);

    const saveStopLoss = useCallback(async (especie, precioCompra, beta, maxPrecioRegistrado, alarmaActiva = true) => {
        if (!user) return;
        const householdId = userData?.householdId || null;
        const esp = especie.toUpperCase();
        const docId = householdId ? `${householdId}_${esp}` : `${user.uid}_${esp}`;
        
        const payload = {
            especie: esp,
            precioCompra: parseFloat(precioCompra) || 0,
            beta: parseFloat(beta) || 1.20,
            maxPrecioRegistrado: parseFloat(maxPrecioRegistrado) || parseFloat(precioCompra) || 0,
            alarmaActiva,
            userId: user.uid,
            householdId,
            updatedAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, COLLECTIONS.SAVINGS_STOP_LOSSES, docId), payload, { merge: true });
        } catch (error) {
            console.error("Error saving stop loss:", error);
            throw error;
        }
    }, [user, userData]);

    const deleteStopLoss = useCallback(async (especie) => {
        if (!user) return;
        const householdId = userData?.householdId || null;
        const esp = especie.toUpperCase();
        const docId = householdId ? `${householdId}_${esp}` : `${user.uid}_${esp}`;
        try {
            await deleteDoc(doc(db, COLLECTIONS.SAVINGS_STOP_LOSSES, docId));
        } catch (error) {
            console.error("Error deleting stop loss:", error);
            throw error;
        }
    }, [user, userData]);

    const updateMaxPrice = useCallback(async (especie, newMaxPrice) => {
        if (!user) return;
        const householdId = userData?.householdId || null;
        const esp = especie.toUpperCase();
        const docId = householdId ? `${householdId}_${esp}` : `${user.uid}_${esp}`;
        try {
            await setDoc(doc(db, COLLECTIONS.SAVINGS_STOP_LOSSES, docId), {
                maxPrecioRegistrado: parseFloat(newMaxPrice),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error updating max price in stop loss:", error);
        }
    }, [user, userData]);

    return {
        stopLosses,
        saveStopLoss,
        deleteStopLoss,
        updateMaxPrice
    };
};
