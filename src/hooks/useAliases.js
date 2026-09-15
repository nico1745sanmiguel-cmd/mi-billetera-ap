import { useState, useEffect } from 'react';
import { collection, query, where, or, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const deleteAlias = async (id) => {
    try {
        await deleteDoc(doc(db, 'merchant_aliases', id));
    } catch (error) {
        console.error("Error deleting alias", error);
    }
}

export const useAliases = (userId, householdId) => {
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prevUserId, setPrevUserId] = useState(null);

    // Resetear aliases localmente al cerrar sesión ANTES de que se desmonte el listener
    if (userId !== prevUserId) {
        setPrevUserId(userId);
        if (!userId) {
            setAliases([]);
        }
    }

    useEffect(() => {
        if (!userId) {
            return;
        }

        // Definir dónde buscar: si hay householdId, buscamos por ese ID, sino por userId
        const q = householdId
            ? query(collection(db, 'merchant_aliases'), or(where("householdId", "==", householdId), where("userId", "==", userId)))
            : query(collection(db, 'merchant_aliases'), where("userId", "==", userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedAliases = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filtrar en memoria por ahora (Safe MVP)
            const myAliases = loadedAliases.filter(a => {
                if (householdId && a.householdId === householdId) return true;
                if (a.userId === userId) return true;
                return false;
            });

            setAliases(myAliases);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, householdId]);

    const addAlias = async (pattern, aliasName, categoryId) => {
        try {
            await addDoc(collection(db, 'merchant_aliases'), {
                pattern: pattern.toUpperCase(), // Guardamos en mayúsculas para comparar fácil
                alias: aliasName,
                categoryId,
                userId,
                householdId, // Si es null no pasa nada
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error adding alias:", error);
            throw error;
        }
    };

    const findAlias = (rawDescription) => {
        const descUpper = rawDescription.toUpperCase();
        // Busca el primer alias cuyo patrón esté contenido en la descripción
        return aliases.find(a => descUpper.includes(a.pattern));
    };


    return { aliases, loading, addAlias, findAlias, deleteAlias };
};
