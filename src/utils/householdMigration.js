import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

/**
 * Checks if the user belongs to a household.
 * If not, creates one and migrates existing data.
 */
export const checkAndMigrateToHousehold = async (user) => {
    if (!user) return;

    try {
        // 1. Check if user already has a household profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().householdId) {
            const existingId = userSnap.data().householdId;
            // Verify if it really exists
            const hhRef = doc(db, 'households', existingId);
            const hhSnap = await getDoc(hhRef);
            if (hhSnap.exists()) {
                console.log("User already in a household:", existingId);
                return existingId;
            } else {
                console.warn("User has householdId but doc is missing. Re-creating...");
                // Proceed to creation logic below...
            }
        }

        console.log("Migrating user to Household system...");

        // 2. Create a new Household
        const newHousehold = {
            name: `Hogar de ${user.displayName || user.email.split('@')[0]}`,
            ownerId: user.uid,
            members: [user.uid],
            createdAt: new Date(),
            inviteCode: Math.floor(100000 + Math.random() * 900000).toString(), // 6 digit code
            settings: {
                defaultShareSupermarket: true,
                defaultShareServices: true,
            }
        };

        // 2. Create a new Household
        const householdRef = await addDoc(collection(db, 'households'), newHousehold);
        const householdId = householdRef.id;
        console.log("Household created with ID:", householdId);

        // 3. Create/Update User Profile
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            householdId: householdId,
            role: 'admin'
        }, { merge: true });

        // 4. Batch Update
        // ... (rest of logic)

        // 4. Batch Update: Migrate existing data to this household
        const batch = writeBatch(db);
        const collectionsToMigrate = ['cards', 'transactions', 'supermarket_items', 'services'];

        for (const collName of collectionsToMigrate) {
            const q = query(collection(db, collName), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);

            snapshot.forEach((docSnap) => {
                const ref = doc(db, collName, docSnap.id);
                // Add householdId, ownerId and default shared status
                let isShared = false;
                if (collName === 'supermarket_items') isShared = true; // Supermarket always shared by default during migration
                if (collName === 'services') isShared = true; // Services always shared by default

                batch.update(ref, {
                    householdId: householdId,
                    ownerId: user.uid,
                    isShared: isShared
                });
            });
        }

        await batch.commit();
        console.log("Migration successful! Welcome to your new Household.");

        return householdId;

    } catch (error) {
        console.error("Migration failed:", error);
        return null;
    }
};
