/**
 * supermarketRepository.js
 *
 * Capa de acceso a datos para la colección 'supermarket_items'.
 */

import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

const COL = COLLECTIONS.SUPERMARKET;

/**
 * Agrega un ítem al supermercado.
 * @param {Object} payload
 */
export const addSuperItem = (payload) =>
    addDoc(collection(db, COL), {
        ...payload,
        createdAt: new Date().toISOString(),
    });

/**
 * Elimina un ítem por ID.
 * @param {string} id
 */
export const deleteSuperItem = (id) =>
    deleteDoc(doc(db, COL, id));

/**
 * Actualiza el precio de un ítem.
 * @param {string} id
 * @param {number} price
 */
export const updateSuperPrice = (id, price) =>
    updateDoc(doc(db, COL, id), { price: Number(price) });

/**
 * Actualiza la cantidad de un ítem.
 * @param {string} id
 * @param {number} quantity
 */
export const updateSuperQuantity = (id, quantity) =>
    updateDoc(doc(db, COL, id), { quantity });

/**
 * Alterna el estado checked de un ítem.
 * @param {string} id
 * @param {boolean} checked
 */
export const toggleSuperChecked = (id, checked) =>
    updateDoc(doc(db, COL, id), { checked });

/**
 * Actualiza múltiples campos a la vez en un ítem.
 * Útil para undo (revertir precio + checked en una sola operación).
 * @param {string} id
 * @param {Object} fields
 */
export const updateSuperFields = (id, fields) =>
    updateDoc(doc(db, COL, id), fields);
