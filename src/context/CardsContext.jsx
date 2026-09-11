import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUIDispatch } from './UIContext';
import { getCache, setCache } from '../utils/cache';
import { COLLECTIONS, CACHE_KEYS, ENABLE_HOUSEHOLD } from '../config/constants';
import { sanitizeFinancialData, sanitizeCardData, sanitizeStatementData } from '../utils/security';

const CardsStateContext = createContext(null);
const CardsDispatchContext = createContext(null);

export const useCardsState = () => {
    const context = useContext(CardsStateContext);
    if (!context) throw new Error('useCardsState must be used within a CardsProvider');
    return context;
};

export const useCardsDispatch = () => {
    const context = useContext(CardsDispatchContext);
    if (!context) throw new Error('useCardsDispatch must be used within a CardsProvider');
    return context;
};

// Retro-compatibilidad
export const useCards = () => {
    return { ...useCardsState(), ...useCardsDispatch() };
};

export const CardsProvider = ({ children }) => {
    const { user, userData } = useAuth();
    const { showToast } = useUIDispatch();
    
    const [cards, setCards] = useState(() => getCache(CACHE_KEYS.CARDS, []));
    const [transactions, setTransactions] = useState(() => getCache(CACHE_KEYS.TRANSACTIONS, []));
    const [loadingCards, setLoadingCards] = useState(() => !getCache(CACHE_KEYS.CARDS, null));

    useEffect(() => {
        if (!user) {
            setLoadingCards(false);
            return;
        }

        const householdId = userData?.householdId;
        const queryField = householdId ? "householdId" : "userId";
        const queryValue = householdId ? householdId : user.uid;

        const syncData = (collectionName, setState, cacheKey, onDone) => {
            const q = query(collection(db, collectionName), where(queryField, "==", queryValue));
            return onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setState(data);
                setCache(cacheKey, data);
                if (onDone) onDone();
            }, (_error) => {
                if (onDone) onDone();
                showToast(`Error de conexión al sincronizar ${collectionName}. Verifique su internet.`, 'error');
            });
        };

        const unsubCards = syncData(COLLECTIONS.CARDS, setCards, CACHE_KEYS.CARDS, () => setLoadingCards(false));
        const unsubTrans = syncData(COLLECTIONS.TRANSACTIONS, setTransactions, CACHE_KEYS.TRANSACTIONS);

        return () => {
            unsubCards();
            unsubTrans();
        };
    }, [user, userData, showToast]);

    const visibleCards = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return cards;
        return cards.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [cards, userData, user]);

    const visibleTransactions = useMemo(() => {
        if (!ENABLE_HOUSEHOLD || !userData?.householdId) return transactions;
        return transactions.filter(item => !item.ownerId || item.isShared === true || item.ownerId === user?.uid);
    }, [transactions, userData, user]);

    const addTransaction = useCallback(async (t) => {
        if (!user) {
            showToast('Debe iniciar sesión para registrar una transacción.', 'error');
            throw new Error('Usuario no autenticado');
        }

        // Validamos y saneamos los datos antes de enviarlos (evitar negativos, NaN)
        const safeData = sanitizeFinancialData(t, ['amount', 'installments'], false);

        if (Number(safeData.amount) <= 0) {
            showToast("El monto debe ser mayor a $ 0.", 'error');
            throw new Error('Monto inválido');
        }

        const payload = { 
            ...safeData, 
            userId: user.uid,
            ownerId: user.uid,
            householdId: userData?.householdId || null,
            isShared: safeData.isShared !== undefined ? safeData.isShared : true
        };

        try {
            await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), payload);
        } catch (error) {
            console.error("Error al guardar transacción:", error);
            showToast("Hubo un error al guardar la transacción.", 'error');
            throw error;
        }
    }, [user, userData, showToast]);

    const updateTransaction = useCallback(async (transactionId, updatedData) => {
        if (!user) {
            showToast("Debe iniciar sesión para modificar una transacción.", 'error');
            throw new Error('Usuario no autenticado');
        }
        if (!transactionId) {
            showToast("ID de transacción no válido.", 'error');
            throw new Error('ID no válido');
        }

        const safeData = sanitizeFinancialData(updatedData, ['amount', 'installments'], false);

        if (safeData.amount !== undefined && Number(safeData.amount) <= 0) {
            showToast("El monto debe ser mayor a $ 0.", 'error');
            throw new Error('Monto inválido');
        }

        if (safeData.type === 'credit' && safeData.installments) {
            const safeInstallments = Math.max(1, Math.min(60, parseInt(safeData.installments, 10) || 1));
            safeData.installments = safeInstallments;
            if (safeData.amount) {
                safeData.monthlyInstallment = Math.round((Number(safeData.amount) / safeInstallments) * 100) / 100;
            }
        }

        const payload = {
            ...safeData,
            updatedAt: new Date().toISOString()
        };

        try {
            const transRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
            await updateDoc(transRef, payload);
            showToast("Transacción actualizada exitosamente.", 'success');
        } catch (error) {
            console.error("Error al actualizar transacción:", error);
            showToast("Hubo un error al actualizar la transacción.", 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteTransaction = useCallback(async (transactionId) => {
        if (!user) {
            showToast("Debe iniciar sesión para eliminar una transacción.", 'error');
            throw new Error('Usuario no autenticado');
        }
        if (!transactionId) {
            showToast("ID de transacción no válido.", 'error');
            throw new Error('ID no válido');
        }

        try {
            const transRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
            await deleteDoc(transRef);
            showToast("Transacción eliminada exitosamente.", 'success');
        } catch (error) {
            console.error("Error al eliminar transacción:", error);
            showToast("Hubo un error al eliminar la transacción.", 'error');
            throw error;
        }
    }, [user, showToast]);

    const addCard = useCallback(async (rawCard) => {
        if (!user) {
            showToast('Debe iniciar sesión para crear una tarjeta.', 'error');
            throw new Error('Usuario no autenticado');
        }

        const safeData = sanitizeCardData(rawCard);
        const householdId = userData?.householdId || null;

        const payload = {
            ...safeData,
            userId: user.uid,
            ownerId: user.uid,
            householdId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            monthlyStatements: {},
            paidPeriods: []
        };

        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.CARDS), payload);
            showToast('Tarjeta creada exitosamente.', 'success');
            return { id: docRef.id, ...payload };
        } catch (error) {
            showToast('Error al crear la tarjeta. Intente nuevamente.', 'error');
            throw error;
        }
    }, [user, userData, showToast]);

    const updateCard = useCallback(async (cardId, rawCard) => {
        if (!user || !cardId) {
            showToast('Tarjeta inválida para actualizar.', 'error');
            throw new Error('Parámetros inválidos');
        }

        const safeData = sanitizeCardData(rawCard);
        const payload = {
            ...safeData,
            updatedAt: new Date().toISOString()
        };

        // Si el usuario explícitamente borró last4, enviar deleteField a Firestore
        if (rawCard.last4 === '' || rawCard.last4 === null) {
            payload.last4 = deleteField();
        }

        try {
            await updateDoc(doc(db, COLLECTIONS.CARDS, cardId), payload);
            showToast('Tarjeta actualizada correctamente.', 'success');
        } catch (error) {
            showToast('Error al actualizar la tarjeta.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const deleteCard = useCallback(async (cardId) => {
        if (!user || !cardId) {
            showToast('Tarjeta inválida para eliminar.', 'error');
            throw new Error('Parámetros inválidos');
        }

        try {
            await deleteDoc(doc(db, COLLECTIONS.CARDS, cardId));
            showToast('Tarjeta eliminada correctamente.', 'success');
        } catch (error) {
            showToast('Error al eliminar la tarjeta.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const saveStatement = useCallback(async (cardId, monthKey, rawStatement) => {
        if (!user || !cardId || !monthKey) {
            showToast('Datos incompletos para guardar el resumen.', 'error');
            throw new Error('Parámetros inválidos');
        }

        const safeStatement = sanitizeStatementData(rawStatement);
        const cardRef = doc(db, COLLECTIONS.CARDS, cardId);

        const updates = {
            [`monthlyStatements.${monthKey}`]: {
                ...safeStatement,
                updatedAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
        };

        if (rawStatement.isPaid !== undefined) {
            if (rawStatement.isPaid) {
                updates.paidPeriods = arrayUnion(monthKey);
            } else {
                updates.paidPeriods = arrayRemove(monthKey);
            }
        }

        try {
            await updateDoc(cardRef, updates);
            showToast('Resumen guardado exitosamente.', 'success');
        } catch (error) {
            showToast('Error al guardar el resumen.', 'error');
            throw error;
        }
    }, [user, showToast]);

    const stateValue = useMemo(() => ({
        cards: visibleCards,
        transactions: visibleTransactions,
        loading: loadingCards,
        loadingCards,
    }), [visibleCards, visibleTransactions, loadingCards]);

    const dispatchValue = useMemo(() => ({
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCard,
        updateCard,
        deleteCard,
        saveStatement
    }), [addTransaction, updateTransaction, deleteTransaction, addCard, updateCard, deleteCard, saveStatement]);

    return (
        <CardsDispatchContext.Provider value={dispatchValue}>
            <CardsStateContext.Provider value={stateValue}>
                {children}
            </CardsStateContext.Provider>
        </CardsDispatchContext.Provider>
    );
};
