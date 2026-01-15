import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useAliases = (userId, householdId = null) => {
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setAliases([]);
            return;
        }

        // Definir dónde buscar: si hay householdId, buscamos por ese ID, sino por userId
        // NOTA: Para aliases, quizás convenga que sean personales O compartidos. 
        // Por simplicidad inicial, usemos la misma lógica que las Transactions (Household first)

        // Simplificación v1: Traer todos los aliases creados por el usuario o su hogar
        // Dependiendo de rules, acá podríamos filtrar

        // Por ahora, asumimos una colección 'merchant_aliases' plana y filtramos en cliente o query simple
        // Para no complicar indices compuestos ahora mismo.

        const q = query(collection(db, 'merchant_aliases'));

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

    const deleteAlias = async (id) => {
        try {
            await deleteDoc(doc(db, 'merchant_aliases', id));
        } catch (error) {
            console.error("Error deleting alias", error);
        }
    }

    return { aliases, loading, addAlias, findAlias, deleteAlias };
};
