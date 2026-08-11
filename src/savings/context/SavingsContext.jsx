import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../../config/constants';
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
    const { user } = useAuth();
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
    // Esto es un refactor menor de la dependencia cíclica:
    // Trailing stop necesita posiciones, posiciones necesita stopLosses
    // En el contexto original el useEffect vivía en el mismo archivo.
    // Como extrajimos useSavingsStopLoss, le pasamos las posiciones pero 
    // en React no podemos pasar un valor calculado después del hook.
    // Solución limpia: el trailing stop hook acepta posiciones como param.
    // Usamos un componente wrapper o lo pasamos como effect manual aquí si es necesario, 
    // pero el hook useSavingsStopLoss ya tiene el useEffect. Simplemente le pasamos las posiciones en el hook.
    
    // NOTA: Para no violar las reglas de hooks, hacemos el useEffect aquí para el trailing stop,
    // o ajustamos el hook. Como ya hicimos el useEffect en el hook, solo necesitamos asegurarnos de que reciba `posiciones`.
    // Una forma limpia en Contextos divididos es llamar otro hook interno o usar un effect aquí.
    
    // Mejor pasamos las posiciones al efecto del trailing stop en el context principal:
    const { updateMaxPrice, stopLosses } = stopLossData;
    const { posiciones } = calculations;
    
    React.useEffect(() => {
        if (!posiciones || posiciones.length === 0 || !stopLosses) return;
        posiciones.forEach(pos => {
            const stopData = stopLosses[pos.especie.toUpperCase()];
            if (stopData) {
                const currentPrice = pos.precioActualUSD;
                const maxRegistered = stopData.maxPrecioRegistrado || 0;
                if (currentPrice > maxRegistered) {
                    updateMaxPrice(pos.especie, currentPrice);
                }
            }
        });
    }, [posiciones, stopLosses, updateMaxPrice]);

    // Clear all savings method (was in context)
    const clearAllSavings = useCallback(async () => {
        if (!user) return;
        try {
            const promises = savingsTransactions.map(tx => 
                deleteDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, tx.id))
            );
            if (goalData.savingsGoal?.id) {
                promises.push(deleteDoc(doc(db, COLLECTIONS.SAVINGS_GOALS, goalData.savingsGoal.id)));
            }
            await Promise.all(promises);
        } catch (error) {
            console.error("Error clearing all savings:", error);
            throw error;
        }
    }, [user, savingsTransactions, goalData.savingsGoal]);

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
