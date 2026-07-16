import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection, onSnapshot, query, where, addDoc, serverTimestamp,
    doc, setDoc, deleteDoc, limit
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS } from '../config/constants';
import { fetchAssetPrices } from '../utils/priceService';
import { useFinancial } from './FinancialContext';

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
    
    // FASE 1: Asset Prices & Posiciones
    const [assetPrices, setAssetPrices] = useState({}); // { [especie]: precioUSD }
    const { dolarBlue } = useFinancial();

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

    // Listener de precios manuales de assets (guardados por el usuario)
    useEffect(() => {
        if (!user) return;
        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        // Asumimos que los guardamos en una colección nueva "savings_asset_prices"
        const q = query(collection(db, 'savings_asset_prices'), where(queryField, "==", queryValue));
        const unsub = onSnapshot(q, (snap) => {
            const manual = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.especie && data.precioUSD) {
                    manual[data.especie] = data.precioUSD;
                }
            });
            // Update cache/state with manual overrides
            setAssetPrices(prev => ({...prev, ...manual}));
        });
        return () => unsub();
    }, [user, userData]);

    // Compute especiesWithCarteras
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

    // Fetch automático de precios
    useEffect(() => {
        const keys = Object.keys(especiesWithCarteras);
        if (keys.length === 0 || !dolarBlue) return;
        
        const fetchPrecios = async () => {
            const fetched = await fetchAssetPrices(especiesWithCarteras, dolarBlue);
            setAssetPrices(prev => ({...prev, ...fetched}));
        };
        fetchPrecios();
    }, [especiesWithCarteras, dolarBlue]);


    // Calcular posiciones actuales (holdings)
    const posiciones = useMemo(() => {
        const result = {};
        
        (savingsTransactions || []).forEach(tx => {
            const { cartera, especie, tipo, cantidad, precioUnitario, monedaPrecio } = tx;
            const cant = parseFloat(cantidad) || 0;
            const precio = parseFloat(precioUnitario) || 0;
            
            const key = `${cartera}-${especie}`;
            if (!result[key]) {
                result[key] = {
                    cartera,
                    especie,
                    cantidad: 0,
                    inversionTotalUSD: 0,
                    operaciones: []
                };
            }

            const pos = result[key];
            const rate = dolarBlue || 1000;
            
            let valorOperacionUSD = 0;
            if (precio > 0) {
                if (monedaPrecio === 'ARS') valorOperacionUSD = (cant * precio) / rate;
                else if (monedaPrecio === 'USD') valorOperacionUSD = (cant * precio);
            }

            if (tipo === 'compra' || tipo === 'deposito' || tipo === 'ingreso') {
                pos.cantidad += cant;
                pos.inversionTotalUSD += valorOperacionUSD;
            } else if (tipo === 'venta' || tipo === 'retiro' || tipo === 'egreso') {
                if (pos.cantidad > 0) {
                    const proporcion = cant / pos.cantidad;
                    pos.inversionTotalUSD -= (pos.inversionTotalUSD * proporcion);
                }
                pos.cantidad -= cant;
            } else if (tipo === 'ajuste') {
                pos.cantidad += cant; 
            }
            pos.operaciones.push(tx);
        });

        const rate = dolarBlue || 1000;
        return Object.values(result)
            .filter(p => p.cantidad > 0)
            .map(pos => {
                let currentPriceUSD = 0;
                if (pos.especie === 'USD') currentPriceUSD = 1;
                else if (pos.especie === 'ARS') currentPriceUSD = 1 / rate;
                else currentPriceUSD = assetPrices[pos.especie] || 0;
                
                const valorActualUSD = pos.cantidad * currentPriceUSD;
                const gananciaPérdidaUSD = valorActualUSD - pos.inversionTotalUSD;
                const gananciaPorcentaje = pos.inversionTotalUSD > 0 ? (gananciaPérdidaUSD / pos.inversionTotalUSD) * 100 : 0;

                return {
                    ...pos,
                    precioActualUSD: currentPriceUSD,
                    valorActualUSD,
                    gananciaPérdidaUSD,
                    gananciaPorcentaje
                };
            });
    }, [savingsTransactions, assetPrices, dolarBlue]);

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

    // ─── Actualizar transacción ───────────────────────────────────────────────
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

    // ─── Eliminar transacción ─────────────────────────────────────────────────
    const deleteSavingsTransaction = useCallback(async (id) => {
        if (!user || !id) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.SAVINGS_TRANSACTIONS, id));
        } catch (error) {
            console.error("Error deleting savings transaction:", error);
            throw error;
        }
    }, [user]);

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

    // ─── Guardar precio manual ───────────────────────────────────────────────
    const saveManualPrice = useCallback(async (especie, precioUSD) => {
        if (!user) return;
        const householdId = userData?.householdId || null;
        
        // Usamos la especie como ID del doc para facilitar upserts
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

    const value = useMemo(() => ({
        savingsTransactions,
        addSavingsTransaction,
        updateSavingsTransaction,
        deleteSavingsTransaction,
        savingsGoal,
        goalLoading,
        saveSavingsGoal,
        deleteSavingsGoal,
        clearAllSavings,
        // Nuevos valores FASE 1
        assetPrices,
        posiciones,
        saveManualPrice
    }), [savingsTransactions, addSavingsTransaction, updateSavingsTransaction, deleteSavingsTransaction, savingsGoal, goalLoading, saveSavingsGoal, deleteSavingsGoal, clearAllSavings, assetPrices, posiciones, saveManualPrice]);

    return (
        <SavingsContext.Provider value={value}>
            {children}
        </SavingsContext.Provider>
    );
};
