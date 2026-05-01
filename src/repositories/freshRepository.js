/**
 * freshRepository.js
 *
 * Capa de acceso a datos para la colección 'fresh_purchases'.
 * Los componentes NO deben importar `db` directamente — usan este módulo.
 *
 * Ventaja: si mañana migrás de Firebase a Supabase, cambiás solo este archivo.
 */

import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
