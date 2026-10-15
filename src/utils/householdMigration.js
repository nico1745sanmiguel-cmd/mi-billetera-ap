import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { fetchUserProfile, invalidateHouseholdCache } from '../services/householdService';

/**
 * Migra los items personales del usuario (tarjetas, transacciones, super, frescos, servicios)
 * al hogar especificado para que se compartan correctamente.
 */
export const migrateUserDataToHousehold = async (uid, householdId) => {
    if (!uid || !householdId) return;

    try {
        const batch = writeBatch(db);
        const collectionsToMigrate = ['cards', 'transactions', 'supermarket_items', 'fresh_purchases', 'services'];

        // Buscar tanto por userId como por ownerId para no dejar items huérfanos
        const snapshots = await Promise.all(
            collectionsToMigrate.flatMap((collName) => [
                getDocs(query(collection(db, collName), where("userId", "==", uid))).then(snap => ({ collName, snap })),
                getDocs(query(collection(db, collName), where("ownerId", "==", uid))).then(snap => ({ collName, snap }))
            ])
        );

        const seenDocIds = new Set();
        snapshots.forEach(({ collName, snap }) => {
            snap.forEach((docSnap) => {
                if (!seenDocIds.has(docSnap.id)) {
                    seenDocIds.add(docSnap.id);
                    const ref = doc(db, collName, docSnap.id);
                    let isShared = false;
                    if (collName === 'supermarket_items' || collName === 'fresh_purchases') isShared = true;
                    if (collName === 'services') isShared = true;

                    batch.update(ref, {
                        householdId: householdId,
                        ownerId: uid,
                        isShared: isShared
                    });
                }
            });
        });

        await batch.commit();
    } catch (err) {
        console.error("Error migrating user data to household:", err);
    }
};

/**
 * Crea un nuevo hogar de manera explícita cuando el usuario lo solicita.
 */
export const createNewHousehold = async (user) => {
    if (!user) return null;

    try {
        const newHousehold = {
            name: `Hogar de ${user.displayName || user.email?.split('@')[0] || 'Familia'}`,
            ownerId: user.uid,
            members: [user.uid],
            createdAt: new Date(),
            inviteCode: Math.floor(100000 + Math.random() * 900000).toString(), // 6 digit code
            settings: {
                defaultShareSupermarket: true,
                defaultShareServices: true,
            }
        };

        const householdRef = await addDoc(collection(db, 'households'), newHousehold);
        const householdId = householdRef.id;

        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            householdId: householdId
        }, { merge: true });

        await migrateUserDataToHousehold(user.uid, householdId);
        invalidateHouseholdCache();

        return householdId;
    } catch (error) {
        console.error("Error creating new household:", error);
        return null;
    }
};

/**
 * Verifica a qué hogar pertenece el usuario.
 * IMPORTANTE: Si no tiene hogar o falla la conexión, NUNCA crea un hogar nuevo
 * automáticamente para no desvincular a los miembros de su grupo familiar.
 */
export const checkAndMigrateToHousehold = async (user) => {
    if (!user) return null;

    try {
        // 1. Verificar si el usuario ya tiene householdId en su perfil
        const userProfile = await fetchUserProfile(user.uid);

        if (userProfile && userProfile.householdId) {
            const existingId = userProfile.householdId;
            try {
                const hhRef = doc(db, 'households', existingId);
                const hhSnap = await getDoc(hhRef);
                if (hhSnap.exists()) {
                    return existingId;
                }
            } catch (hhErr) {
                // Si hay error de red o timeout, confiamos en el existingId y NO creamos otro hogar
                console.warn("Could not verify household doc (posible offline), conservando existingId:", hhErr);
                return existingId;
            }
        }

        // 2. Si no tiene householdId en su perfil de usuario, buscar si ya es miembro de algún hogar
        const q = query(collection(db, 'households'), where('members', 'array-contains', user.uid));
        const memberSnaps = await getDocs(q);
        if (!memberSnaps.empty) {
            const foundId = memberSnaps.docs[0].id;
            // Restaurar el vínculo en el documento del usuario
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { householdId: foundId }, { merge: true });
            return foundId;
        }

        // 3. No pertenece a ningún hogar aún. Devolvemos null para que el usuario pueda unirse con código o crear uno
        return null;
    } catch (error) {
        console.error("checkAndMigrateToHousehold failed:", error);
        return null;
    }
};
