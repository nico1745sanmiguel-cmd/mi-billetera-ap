import { db } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp, 
    onSnapshot,
    writeBatch
} from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

/**
 * Convierte un valor a número, asegurando que no sea NaN y sea 0 por defecto.
 * @param {any} val - Valor a parsear.
 * @returns {number} Número parseado o 0.
 */
const parseNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const parsed = Number(val);
    return isNaN(parsed) ? 0 : parsed;
};

const getDayOfWeek = (dateStr) => {
    if (!dateStr) return 'lunes';
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    // Ajustar el string para evitar problemas de zona horaria si viene solo como YYYY-MM-DD
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
};

const buildSessionPayload = (data) => {
    const uber = parseNumber(data.uber);
    const didi = parseNumber(data.didi);
    const cabify = parseNumber(data.cabify);
    const others = parseNumber(data.others);
    const total = uber + didi + cabify + others;
    
    const hoursWorked = parseNumber(data.hoursWorked);
    const kilometers = parseNumber(data.kilometers);

    return {
        date: data.date,
        dayOfWeek: data.dayOfWeek || getDayOfWeek(data.date),
        hoursWorked,
        kilometers,
        uber,
        didi,
        cabify,
        others,
        total,
        earningsPerHour: hoursWorked > 0 ? parseFloat((total / hoursWorked).toFixed(2)) : 0,
        earningsPerKm: kilometers > 0 ? parseFloat((total / kilometers).toFixed(2)) : 0,
    };
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
            data.sort((a, b) => b.date.localeCompare(a.date));
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
            data.sort((a, b) => b.date.localeCompare(a.date));
            onUpdate(data);
        }, onError);
    },

    // --- CRUD JORNADAS ---
    addSession: async (userId, data) => {
        if (!userId) throw new Error('User no autenticado');
        const payload = {
            ...buildSessionPayload(data),
            userId,
            createdAt: serverTimestamp(),
        };
        return await addDoc(collection(db, COLLECTIONS.MOBILITY_SESSIONS), payload);
    },

    updateSession: async (id, data) => {
        if (!id) throw new Error('ID de sesión requerido');
        const payload = buildSessionPayload(data);
        const docRef = doc(db, COLLECTIONS.MOBILITY_SESSIONS, id);
        return await updateDoc(docRef, payload);
    },

    deleteSession: async (id) => {
        if (!id) throw new Error('ID de sesión requerido');
        return await deleteDoc(doc(db, COLLECTIONS.MOBILITY_SESSIONS, id));
    },

    deleteAllSessions: async (sessions) => {
        if (!sessions || sessions.length === 0) return;
        const batch = writeBatch(db);
        for (const session of sessions) {
            batch.delete(doc(db, COLLECTIONS.MOBILITY_SESSIONS, session.id));
        }
        return await batch.commit();
    },

    importSessions: async (userId, rows) => {
        if (!userId) return { ok: 0, errors: 0 };
        let ok = 0;
        let errors = 0;
        const promises = rows.map(async (row) => {
            try {
                const payload = {
                    ...buildSessionPayload(row),
                    userId,
                    createdAt: serverTimestamp(),
                    importedFromCSV: true,
                };
                await addDoc(collection(db, COLLECTIONS.MOBILITY_SESSIONS), payload);
                return { status: 'fulfilled' };
            } catch (e) {
                console.error('Import error for row:', row, e);
                return { status: 'rejected' };
            }
        });
        
        const results = await Promise.all(promises);
        results.forEach(res => {
            if (res.status === 'fulfilled') ok++;
            else errors++;
        });
        return { ok, errors };
    },

    // --- CRUD GASTOS ---
    addExpense: async (userId, { date, category, amount, notes = '' }) => {
        if (!userId) throw new Error('User no autenticado');
        const parsedAmount = parseNumber(amount);
        return await addDoc(collection(db, COLLECTIONS.MOBILITY_EXPENSES), {
            date,
            category,
            amount: parsedAmount,
            notes,
            userId,
            createdAt: serverTimestamp(),
        });
    },

    updateExpense: async (id, data) => {
        if (!id) throw new Error('ID de gasto requerido');
        const parsedAmount = parseNumber(data.amount);
        const docRef = doc(db, COLLECTIONS.MOBILITY_EXPENSES, id);
        return await updateDoc(docRef, {
            date: data.date,
            category: data.category,
            amount: parsedAmount,
            notes: data.notes || '',
        });
    },

    deleteExpense: async (id) => {
        if (!id) throw new Error('ID de gasto requerido');
        return await deleteDoc(doc(db, COLLECTIONS.MOBILITY_EXPENSES, id));
    },

    // Utilidades expuestas si se necesitan
    getDayOfWeek
};
