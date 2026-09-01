import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { COLLECTIONS, CACHE_KEYS } from '../../config/constants';
import { setCache } from '../../utils/cache';
import { useAuth } from '../../context/AuthContext';
import { useFinancial } from '../../context/FinancialContext';

import { useSavingsData } from '../hooks/useSavingsData';
import { useSavingsGoal } from '../hooks/useSavingsGoal';
import { useSavingsPrices } from '../hooks/useSavingsPrices';
import { useSavingsStopLoss } from '../hooks/useSavingsStopLoss';
import { useSavingsCalculations } from '../hooks/useSavingsCalculations';

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
    const { dolarBlue } = useFinancial();

    // 1. Data bruta (transacciones, carteras)
    const savingsData = useSavingsData();
    const { savingsTransactions } = savingsData;

    // 2. Goal
    const goalData = useSavingsGoal();

    // 3. Precios y Stop Losses
    const pricesData = useSavingsPrices(savingsTransactions, dolarBlue);
    const stopLossData = useSavingsStopLoss();

    // 4. Cálculos pesados
    const calculations = useSavingsCalculations(
        savingsTransactions,
        pricesData.assetPrices,
        stopLossData.stopLosses,
        dolarBlue
    );

    // Re-bind del trailing stop passing posiciones
    const { updateMaxPrice, stopLosses } = stopLossData;
    const { posiciones } = calculations;
    const lastUpdatedMaxPriceRef = React.useRef({});
    
    React.useEffect(() => {
        if (!posiciones || posiciones.length === 0 || !stopLosses) return;
        posiciones.forEach(pos => {
            const especieUpper = pos.especie?.toUpperCase();
            const stopData = stopLosses[especieUpper];
            if (stopData) {
                const currentPrice = pos.precioActualUSD;
                const maxRegistered = stopData.maxPrecioRegistrado || 0;
                const lastUpdated = lastUpdatedMaxPriceRef.current[especieUpper] || 0;
                if (currentPrice > maxRegistered && currentPrice > lastUpdated) {
                    lastUpdatedMaxPriceRef.current[especieUpper] = currentPrice;
                    updateMaxPrice(pos.especie, currentPrice);
                }
            }
        });
    }, [posiciones, stopLosses, updateMaxPrice]);

    // Clear all savings method: borrado completo de Firestore y cachés
    const clearAllSavings = useCallback(async () => {
        if (!user) return;
        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        try {
            const targetCollections = [
                COLLECTIONS.SAVINGS_TRANSACTIONS,
                COLLECTIONS.SAVINGS_GOALS,
                COLLECTIONS.SAVINGS_STOP_LOSSES,
                'savings_asset_prices',
                COLLECTIONS.SAVINGS_CARTERAS
            ].filter(Boolean);

            const deletePromises = [];

            for (const collName of targetCollections) {
                // Borrar documentos respetando la regla de seguridad (householdId si pertenece a hogar, o userId)
                try {
                    const q = query(collection(db, collName), where(queryField, "==", queryValue));
                    const snap = await getDocs(q);
                    snap.forEach(d => {
                        deletePromises.push(deleteDoc(d.ref).catch(err => console.warn(`Error deleting doc ${d.id}:`, err)));
                    });
                } catch (collErr) {
                    console.warn(`Error querying collection ${collName} during clear:`, collErr);
                }
            }

            // Eliminar los que estén cargados en memoria por ID como fallback seguro
            savingsTransactions.forEach(tx => {
                if (tx.id) {
                    deletePromises.push(deleteDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, tx.id)).catch(() => {}));
                }
            });
            if (goalData.savingsGoal?.id) {
                deletePromises.push(deleteDoc(doc(db, COLLECTIONS.SAVINGS_GOALS, goalData.savingsGoal.id)).catch(() => {}));
            }

            await Promise.all(deletePromises);

            // Limpieza de caché local
            setCache(CACHE_KEYS.SAVINGS_TRANSACTIONS, []);
            setCache(CACHE_KEYS.SAVINGS_CARTERAS, []);
            setCache(CACHE_KEYS.SAVINGS_STOP_LOSSES, {});
            setCache('savings_goal_data', null);
            setCache('asset_prices', {});
        } catch (error) {
            console.error("Error clearing all savings:", error);
            throw error;
        }
    }, [user, userData, savingsTransactions, goalData.savingsGoal]);

    const value = useMemo(() => ({
        ...savingsData,
        ...goalData,
        ...pricesData,
        ...stopLossData,
        ...calculations,
        clearAllSavings
    }), [
        savingsData,
        goalData,
        pricesData,
        stopLossData,
        calculations,
        clearAllSavings
    ]);

    return (
        <SavingsContext.Provider value={value}>
            {children}
        </SavingsContext.Provider>
    );
};
