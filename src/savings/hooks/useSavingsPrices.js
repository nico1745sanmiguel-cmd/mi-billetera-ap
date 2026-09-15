import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { fetchAssetPrices } from '../../utils/priceService';

export const useSavingsPrices = (savingsTransactions = [], dolarBlue, manualPrices = null) => {
    const { user, userData } = useAuth();
    const [assetPrices, setAssetPrices] = useState({});

    // Si manualPrices viene provisto por useSavingsData (listener unificado), lo adoptamos sin abrir otro listener
    useEffect(() => {
        if (manualPrices && typeof manualPrices === 'object' && Object.keys(manualPrices).length > 0) {
            setAssetPrices(prev => ({ ...prev, ...manualPrices }));
        }
    }, [manualPrices]);

    const uid = user?.uid;
    const householdId = userData?.householdId;

    // Listener de resguardo: solo se activa si NO se pasaron manualPrices (uso standalone del hook)
    useEffect(() => {
        if (manualPrices !== null) return; // Ya provisto externamente, evitar listener duplicado
        if (!uid) return;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : uid;

        const q = query(collection(db, 'savings_asset_prices'), where(queryField, "==", queryValue));
        const unsub = onSnapshot(q, (snap) => {
            const manual = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.especie && data.precioUSD) {
                    manual[data.especie] = data.precioUSD;
                }
            });
            setAssetPrices(prev => ({...prev, ...manual}));
        });
        return () => unsub();
    }, [uid, householdId, manualPrices]);

    // Calcular especies únicas para las que necesitamos buscar precios
    const especiesWithCarteras = useMemo(() => {
        const map = {};
        (savingsTransactions || []).forEach(tx => {
            if (!tx.especie) return;
            const esp = tx.especie.toUpperCase();
            if (!map[esp]) map[esp] = new Set();
            if (tx.cartera) map[esp].add(tx.cartera);
        });
        return map;
    }, [savingsTransactions]);

    // Fetch automático de precios (externos)
    useEffect(() => {
        const keys = Object.keys(especiesWithCarteras);
        if (keys.length === 0 || !dolarBlue) return;
        
        const fetchPrecios = async () => {
            const fetched = await fetchAssetPrices(especiesWithCarteras, dolarBlue);
            setAssetPrices(prev => ({...prev, ...fetched}));
        };
        fetchPrecios();
    }, [especiesWithCarteras, dolarBlue]);

    const saveManualPrice = useCallback(async (especie, precioUSD) => {
        if (!user) return;
        const householdId = userData?.householdId || null;
        
        const docId = householdId ? `${householdId}_${especie}` : `${user.uid}_${especie}`;
        const payload = {
            especie,
            precioUSD: parseFloat(precioUSD),
            userId: user.uid,
            householdId,
            updatedAt: serverTimestamp()
        };
        try {
            await setDoc(doc(db, 'savings_asset_prices', docId), payload, { merge: true });
        } catch (error) {
            console.error("Error saving manual price:", error);
            throw error;
        }
    }, [user, userData]);

    return {
        assetPrices,
        saveManualPrice
    };
};
