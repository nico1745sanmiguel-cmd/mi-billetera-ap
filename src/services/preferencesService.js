import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/constants';

/**
 * Carga las preferencias del usuario (módulos, orden, tamaños) desde Firestore.
 * @param {string} uid ID del usuario actual.
 * @returns {Promise<Object|null>} El objeto preferences o null si no existe.
 */
export const loadPreferences = async (uid) => {
    if (!uid) return null;
    try {
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            return data.preferences || null;
        }
        return null;
    } catch (error) {
        console.error('Error loading preferences from Firestore:', error);
        return null;
    }
};

/**
 * Guarda o actualiza las preferencias del usuario en Firestore.
 * Hace un merge con las preferencias que ya existan.
 * @param {string} uid ID del usuario actual.
 * @param {Object} preferences Objeto con las preferencias a actualizar.
 */
export const savePreferences = async (uid, preferences) => {
    if (!uid) return;
    try {
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        // Usamos setDoc con merge: true para no borrar otros campos del usuario
        // y para crear el documento si por alguna razón no existía.
        await setDoc(userRef, { preferences }, { merge: true });
    } catch (error) {
        console.error('Error saving preferences to Firestore:', error);
    }
};
