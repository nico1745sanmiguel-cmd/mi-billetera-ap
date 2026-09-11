/**
 * freshRepository.js
 *
 * Capa de acceso a datos para la colección 'fresh_purchases'.
 * Los componentes NO deben importar `db` directamente — usan este módulo.
 *
 * Ventaja: si mañana migrás de Firebase a Supabase, cambiás solo este archivo.
 */

import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

const COL = COLLECTIONS.FRESH_PURCHASES;

/**
 * Agrega un nuevo ítem de mercado fresco.
 * @param {Object} payload - Datos del ítem (category, note, total, date, month, userId, etc.)
 * @returns {Promise<DocumentReference>}
 */
export const addFreshItem = (payload) =>
    addDoc(collection(db, COL), {
        ...payload,
        createdAt: new Date().toISOString(),
    });

/**
 * Elimina un ítem de mercado fresco por ID.
 * @param {string} id
 */
export const deleteFreshItem = (id) =>
    deleteDoc(doc(db, COL, id));

/**
 * Actualiza el monto total de un ítem.
 * @param {string} id
 * @param {number} total
 */
export const updateFreshTotal = (id, total) =>
    updateDoc(doc(db, COL, id), { total });

/**
 * Marca o desmarca un ítem como comprado.
 * @param {string} id
 * @param {boolean} completed
 */
export const toggleFreshCompleted = (id, completed) =>
    updateDoc(doc(db, COL, id), { completed });

/**
 * Actualiza la fecha de un ítem del planificador.
 * @param {string} id
 * @param {string} date - Formato "YYYY-MM-DD"
 */
export const updateFreshDate = (id, date) =>
    updateDoc(doc(db, COL, id), { 
        date, 
        month: date.slice(0, 7) 
    });

/**
 * Copia una lista de ítems a un mes nuevo (herencia de presupuesto) de forma atómica.
 * Se omiten id, createdAt y completed (se resetea a false).
 * @param {Array} items - Ítems del mes origen a copiar
 * @param {string} newMonthKey - Mes destino en formato "YYYY-MM"
 * @returns {Promise<void>}
 */
export const copyItemsToMonth = async (items, newMonthKey) => {
    if (!items || items.length === 0) return;
    const batch = writeBatch(db);
    const colRef = collection(db, COL);

    items.forEach(({ id: _id, createdAt: _createdAt, completed: _completed, date: _date, ...rest }) => {
        // Ajustamos la fecha al primer día del mes destino para mantener coherencia
        const [year, month] = newMonthKey.split('-');
        const newDate = `${year}-${month}-01`;
        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
            ...rest,
            month: newMonthKey,
            date: newDate,
            completed: false,
            createdAt: new Date().toISOString(),
        });
    });

    return batch.commit();
};

/**
 * Elimina múltiples ítems de mercado fresco de forma atómica.
 * @param {string[]} ids
 * @returns {Promise<void>}
 */
export const batchDeleteFreshItems = async (ids) => {
    if (!ids || ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(db, COL, id));
    });
    return batch.commit();
};

