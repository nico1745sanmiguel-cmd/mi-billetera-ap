import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Caché en memoria para evitar llamadas redundantes a Firestore
// cuando el usuario navega entre pantallas de Reparto, Dashboard, Servicios y Hogar.
const householdCache = new Map(); // id -> { data, timestamp }
const userProfileCache = new Map(); // uid -> { data, timestamp }
const inFlightHouseholdPromises = new Map(); // id -> Promise
const inFlightUserPromises = new Map(); // uid -> Promise

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

/**
 * Obtiene el perfil de un usuario con deduplicación de peticiones concurrentes y caché en memoria.
 */
export const fetchUserProfile = async (uid, forceRefresh = false) => {
    if (!uid) return null;

    const now = Date.now();
    const cached = userProfileCache.get(uid);
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    if (inFlightUserPromises.has(uid)) {
        return inFlightUserPromises.get(uid);
    }

    const promise = (async () => {
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            const data = userSnap.exists() ? { uid: userSnap.id, ...userSnap.data() } : null;
            userProfileCache.set(uid, { data, timestamp: Date.now() });
            return data;
        } catch (err) {
            console.error(`Error fetching user profile for ${uid}:`, err);
            return null;
        } finally {
            inFlightUserPromises.delete(uid);
        }
    })();

    inFlightUserPromises.set(uid, promise);
    return promise;
};

/**
 * Obtiene un hogar junto con los perfiles completos de sus miembros.
 * Reutiliza promesas en vuelo y cachea el resultado por 2 minutos para
 * navegación instantánea sin costos de red repetidos.
 */
export const fetchHouseholdWithMembers = async (householdId, forceRefresh = false) => {
    if (!householdId) return { household: null, members: [] };

    const now = Date.now();
    const cached = householdCache.get(householdId);
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    if (inFlightHouseholdPromises.has(householdId)) {
        return inFlightHouseholdPromises.get(householdId);
    }

    const promise = (async () => {
        try {
            const hhRef = doc(db, 'households', householdId);
            const hhSnap = await getDoc(hhRef);
            if (!hhSnap.exists()) {
                return { household: null, members: [] };
            }

            const hhData = { id: hhSnap.id, ...hhSnap.data() };
            const memberIds = hhData.members || [];

            // Leer los miembros en paralelo reutilizando la caché de perfiles
            const memberPromises = memberIds.map(async (uid) => {
                const profile = await fetchUserProfile(uid, forceRefresh);
                return profile || { uid, displayName: '?', salaryHistory: [] };
            });

            const members = await Promise.all(memberPromises);
            const result = { household: hhData, members };

            householdCache.set(householdId, { data: result, timestamp: Date.now() });
            return result;
        } catch (err) {
            console.error(`Error fetching household with members (${householdId}):`, err);
            return { household: null, members: [] };
        } finally {
            inFlightHouseholdPromises.delete(householdId);
        }
    })();

    inFlightHouseholdPromises.set(householdId, promise);
    return promise;
};

/**
 * Invalida la caché de un hogar (ej: tras crear, agregar o eliminar miembros).
 */
export const invalidateHouseholdCache = (householdId) => {
    if (householdId) {
        householdCache.delete(householdId);
    } else {
        householdCache.clear();
    }
};
