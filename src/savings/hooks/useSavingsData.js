import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getCache, setCache } from '../../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../../config/constants';

export const useSavingsData = () => {
    const { user, userData } = useAuth();
    
    const [savingsTransactions, setSavingsTransactions] = useState(() => getCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, []));
    const [carterasPersonalizadas, setCarterasPersonalizadas] = useState(() => getCache(CACHE_KEYS.SAVINGS_CARTERAS, []));
    const [manualAssetPrices, setManualAssetPrices] = useState({});

    const uid = user?.uid;
    const householdId = userData?.householdId;

    // Listener de transacciones (depende solo de IDs primitivos para no re-suscribir en re-renders)
    useEffect(() => {
        if (!uid) return;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = query(collection(db, COLLECTIONS.SAVINGS_TRANSACTIONS), where(queryField, "==", queryValue));
        const unsubSavings = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSavingsTransactions(data);
            setCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, data);
        }, (error) => console.error(`Offline/Error for ${COLLECTIONS.SAVINGS_TRANSACTIONS}:`, error));

        return () => unsubSavings();
    }, [uid, householdId]);

    // Listener unificado de 'savings_asset_prices' (carteras y overrides de precios manuales juntos)
    useEffect(() => {
        if (!uid) return;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = query(collection(db, 'savings_asset_prices'), where(queryField, "==", queryValue));
        const unsub = onSnapshot(q, (snap) => {
            const carteras = [];
            const manual = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.tipo === 'cartera') {
                    carteras.push({ id: d.id, ...data });
                }
                if (data.especie && data.precioUSD) {
                    manual[data.especie] = data.precioUSD;
                }
            });
            setCarterasPersonalizadas(carteras);
            setCache(CACHE_KEYS.SAVINGS_CARTERAS, carteras);
            setManualAssetPrices(manual);
        }, (error) => console.error("Error fetching savings carteras / asset prices:", error));

        return () => unsub();
    }, [uid, householdId]);

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

    const updateSavingsTransaction = useCallback(async (id, data) => {
        if (!user || !id) return;
        try {
            await setDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, id), {
                ...data,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error updating savings transaction:", error);
            throw error;
        }
    }, [user]);

    const deleteSavingsTransaction = useCallback(async (id) => {
        if (!user || !id) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, id));
        } catch (error) {
            console.error("Error deleting savings transaction:", error);
            throw error;
        }
    }, [user]);

    const addCartera = useCallback(async (nombre) => {
        if (!user || !nombre) return;
        const payload = {
            tipo: 'cartera',
            nombre: nombre.trim(),
            userId: user.uid,
            householdId: userData?.householdId || null,
            createdAt: serverTimestamp()
        };
        try {
            await addDoc(collection(db, 'savings_asset_prices'), payload);
        } catch (error) {
            console.error("Error adding cartera:", error);
            throw error;
        }
    }, [user, userData]);

    const deleteCartera = useCallback(async (id) => {
        if (!user || !id) return;
        try {
            await deleteDoc(doc(db, 'savings_asset_prices', id));
        } catch (error) {
            console.error("Error deleting cartera:", error);
            throw error;
        }
    }, [user]);

    const migrateCarteraTransactions = useCallback(async (oldName, newName) => {
        if (!user || !oldName || !newName) return;
        try {
            const txsToMigrate = savingsTransactions.filter(tx => tx.cartera === oldName);
            const promises = txsToMigrate.map(tx => 
                setDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, tx.id), {
                    cartera: newName,
                    updatedAt: serverTimestamp()
                }, { merge: true })
            );
            await Promise.all(promises);
        } catch (error) {
            console.error("Error migrating cartera transactions:", error);
            throw error;
        }
    }, [user, savingsTransactions]);

    return {
        savingsTransactions,
        carterasPersonalizadas,
        manualAssetPrices,
        addSavingsTransaction,
        updateSavingsTransaction,
        deleteSavingsTransaction,
        addCartera,
        deleteCartera,
        migrateCarteraTransactions
    };
};
