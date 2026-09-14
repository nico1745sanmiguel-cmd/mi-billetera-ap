import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, or, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { fetchAssetPrices } from '../../utils/priceService';

export const useSavingsPrices = (savingsTransactions = [], dolarBlue) => {
    const { user, userData } = useAuth();
    const [assetPrices, setAssetPrices] = useState({});

    // Listener de precios manuales (overrides)
    useEffect(() => {
        if (!user) return;
        const householdId = userData?.householdId;

        const q = householdId
            ? query(collection(db, 'savings_asset_prices'), or(where("householdId", "==", householdId), where("userId", "==", user.uid)))
            : query(collection(db, 'savings_asset_prices'), where("userId", "==", user.uid));
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
    }, [user, userData]);

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
