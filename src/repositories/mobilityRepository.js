import { db } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp, 
    onSnapshot,
    writeBatch
} from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';
import { 
    sanitizeMobilitySession, 
    sanitizeMobilityExpense, 
    removeUndefined 
} from '../utils/security';

export const getDayOfWeek = (dateStr) => {
    if (!dateStr) return 'lunes';
    const cleanDate = typeof dateStr === 'string' ? dateStr.slice(0, 10) : '';
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    // Ajustar el string para evitar problemas de zona horaria si viene solo como YYYY-MM-DD
    const d = new Date(cleanDate + 'T12:00:00');
    return isNaN(d.getTime()) ? 'lunes' : days[d.getDay()];
};

export const mobilityRepository = {
    // --- SUSCRIPCIONES (LISTENERS) ---
    subscribeToSessions: (userId, onUpdate, onError) => {
        if (!userId) return () => {};
        const q = query(
            collection(db, COLLECTIONS.MOBILITY_SESSIONS),
            where('userId', '==', userId)
        );
        return onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
            onUpdate(data);
        }, onError);
    },

    subscribeToExpenses: (userId, onUpdate, onError) => {
        if (!userId) return () => {};
        const q = query(
            collection(db, COLLECTIONS.MOBILITY_EXPENSES),
            where('userId', '==', userId)
        );
        return onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
            onUpdate(data);
        }, onError);
    },

    // --- CRUD JORNADAS ---
    addSession: async (userId, data) => {
        if (!userId) throw new Error('User no autenticado');
        const sanitized = sanitizeMobilitySession(data);
        delete sanitized.id;
        const payload = removeUndefined({
            ...sanitized,
            userId,
            createdAt: serverTimestamp(),
        });
        return await addDoc(collection(db, COLLECTIONS.MOBILITY_SESSIONS), payload);
    },

    updateSession: async (id, data) => {
        if (!id) throw new Error('ID de sesión requerido');
        const sanitized = sanitizeMobilitySession(data);
        delete sanitized.id;
        const payload = removeUndefined({
            ...sanitized,
            updatedAt: serverTimestamp(),
        });
        const docRef = doc(db, COLLECTIONS.MOBILITY_SESSIONS, id);
        return await updateDoc(docRef, payload);
    },

    deleteSession: async (id) => {
        if (!id) throw new Error('ID de sesión requerido');
        return await deleteDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, id));
    },

    deleteAllSessions: async (target) => {
        if (!target) return;
        let sessionDocs = [];

        if (Array.isArray(target)) {
            sessionDocs = target;
        } else if (typeof target === 'string') {
            const q = query(
                collection(db, COLLECTIONS.MOBILITY_SESSIONS),
                where('userId', '==', target)
            );
            const snap = await getDocs(q);
            sessionDocs = snap.docs.map(d => ({ id: d.id }));
        }

        if (!sessionDocs || sessionDocs.length === 0) return;

        const CHUNK_SIZE = 400;
        for (let i = 0; i < sessionDocs.length; i += CHUNK_SIZE) {
            const chunk = sessionDocs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            for (const item of chunk) {
                if (item?.id) {
                    batch.delete(doc(db, COLLECTIONS.MOBILITY_SESSIONS, item.id));
                }
            }
            await batch.commit();
        }
    },

    importSessions: async (userId, rows) => {
        if (!userId || !Array.isArray(rows) || rows.length === 0) {
            return { ok: 0, errors: 0 };
        }

        let ok = 0;
        let errors = 0;
        const validPayloads = [];

        for (const row of rows) {
            try {
                const sanitized = sanitizeMobilitySession(row);
                delete sanitized.id;
                const payload = removeUndefined({
                    ...sanitized,
                    userId,
                    createdAt: serverTimestamp(),
                    importedFromCSV: true,
                });
                validPayloads.push(payload);
            } catch (err) {
                console.error('Import row validation error:', row, err);
                errors++;
            }
        }

        const CHUNK_SIZE = 200;
        for (let i = 0; i < validPayloads.length; i += CHUNK_SIZE) {
            const chunk = validPayloads.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);

            for (const payload of chunk) {
                const newDocRef = doc(collection(db, COLLECTIONS.MOBILITY_SESSIONS));
                batch.set(newDocRef, payload);
            }

            try {
                await batch.commit();
                ok += chunk.length;
            } catch (batchErr) {
                console.error('Error committing import batch:', batchErr);
                errors += chunk.length;
            }
        }

        return { ok, errors };
    },

    // --- CRUD GASTOS ---
    addExpense: async (userId, data) => {
        if (!userId) throw new Error('User no autenticado');
        const sanitized = sanitizeMobilityExpense(data);
        delete sanitized.id;
        const payload = removeUndefined({
            ...sanitized,
            userId,
            createdAt: serverTimestamp(),
        });
        return await addDoc(collection(db, COLLECTIONS.MOBILITY_EXPENSES), payload);
    },

    updateExpense: async (id, data) => {
        if (!id) throw new Error('ID de gasto requerido');
        const sanitized = sanitizeMobilityExpense(data);
        delete sanitized.id;
        const payload = removeUndefined({
            ...sanitized,
            updatedAt: serverTimestamp(),
        });
        const docRef = doc(db, COLLECTIONS.MOBILITY_EXPENSES, id);
        return await updateDoc(docRef, payload);
    },

    deleteExpense: async (id) => {
        if (!id) throw new Error('ID de gasto requerido');
        return await deleteDoc(doc(db, COLLECTIONS.MOBILITY_EXPENSES, id));
    },

    // Utilidades expuestas si se necesitan
    getDayOfWeek
};
