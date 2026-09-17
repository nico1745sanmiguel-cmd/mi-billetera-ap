import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, or, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getCache, setCache } from '../../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../../config/constants';

export const useSavingsData = () => {
    const { user, userData, loadingUser } = useAuth();
    
    const [savingsTransactions, setSavingsTransactions] = useState(() => getCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, []));
    const [loading, setLoading] = useState(() => !getCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, null));
    const [carterasPersonalizadas, setCarterasPersonalizadas] = useState(() => getCache(CACHE_KEYS.SAVINGS_CARTERAS, []));
    const [manualAssetPrices, setManualAssetPrices] = useState({});

    const uid = user?.uid;
    const householdId = userData?.householdId;

    // Listener de transacciones (depende solo de IDs primitivos para no re-suscribir en re-renders)
    useEffect(() => {
        if (loadingUser) {
            setLoading(true);
            return;
        }
        if (!uid) {
            setLoading(false);
            return;
        }
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = householdId
            ? query(collection(db, COLLECTIONS.SAVINGS_TRANSACTIONS), or(where("householdId", "==", householdId), where("userId", "==", user.uid)))
            : query(collection(db, COLLECTIONS.SAVINGS_TRANSACTIONS), where("userId", "==", user.uid));
        const unsubSavings = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSavingsTransactions(data);
            setLoading(false);
            setCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, data);
        }, (error) => {
            console.error(`Offline/Error for ${COLLECTIONS.SAVINGS_TRANSACTIONS}:`, error);
            setLoading(false);
        });

        return () => unsubSavings();
    }, [uid, householdId, loadingUser]);

    // Listener unificado de 'savings_asset_prices' (carteras y overrides de precios manuales juntos)
    useEffect(() => {
        if (!uid) return;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = householdId
            ? query(collection(db, 'savings_asset_prices'), or(where("householdId", "==", householdId), where("userId", "==", user.uid)))
            : query(collection(db, 'savings_asset_prices'), where("userId", "==", user.uid));
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

    const addBatchSavingsTransactions = useCallback(async (transactionsList) => {
        if (!user || !Array.isArray(transactionsList) || transactionsList.length === 0) return;
        const batch = writeBatch(db);
        const colRef = collection(db, COLLECTIONS.SAVINGS_TRANSACTIONS);
        
        transactionsList.forEach(t => {
            const newDocRef = doc(colRef);
            batch.set(newDocRef, {
                ...t,
                userId: user.uid,
                ownerId: user.uid,
                householdId: userData?.householdId || null,
                createdAt: serverTimestamp()
            });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error adding batch savings transactions:", error);
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
        loading,
        carterasPersonalizadas,
        manualAssetPrices,
        addSavingsTransaction,
        addBatchSavingsTransactions,
        updateSavingsTransaction,
        deleteSavingsTransaction,
        addCartera,
        deleteCartera,
        migrateCarteraTransactions
    };
};
