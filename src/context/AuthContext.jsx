import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { checkAndMigrateToHousehold } from '../utils/householdMigration';
import { getCache, setCache } from '../utils/cache';
import { LOADING_DELAY_MS } from '../config/constants';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null); // userData contiene householdId
    const [householdMembers, setHouseholdMembers] = useState(() => getCache('householdMembers', []));
    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Tratar de recuperar userData (householdId) del cache
                const cachedUserData = getCache('userData', null);
                if (cachedUserData) {
                    setUserData(cachedUserData);
                }

                // Traer el dato real de Firebase (y migrar si es necesario)
                const currentHouseholdId = await checkAndMigrateToHousehold(currentUser);
                if (!cachedUserData || cachedUserData.householdId !== currentHouseholdId) {
                    setUserData({ householdId: currentHouseholdId });
                    setCache('userData', { householdId: currentHouseholdId });
                }

                // Apagar el loading de usuario (se puede usar cache o delay)
                setLoadingUser(false);

                // Traer miembros en background (sin bloquear con await)
                if (currentHouseholdId) {
                    getDoc(doc(db, 'households', currentHouseholdId)).then(async (hhSnap) => {
                        if (hhSnap.exists()) {
                            const memberIds = hhSnap.data().members || [];
                            const memberPromises = memberIds.map(uid => getDoc(doc(db, 'users', uid)));
                            const memberSnaps = await Promise.all(memberPromises);
                            const members = memberSnaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id });
                            setHouseholdMembers(members);
                            setCache('householdMembers', members);
                        }
                    }).catch(e => console.error('Error loading household members:', e));
                }
            } else {
                setUserData(null);
                setHouseholdMembers([]);
                setCache('userData', null);
                setCache('householdMembers', []);
                setLoadingUser(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const value = useMemo(() => ({
        user,
        userData,
        householdMembers,
        loadingUser
    }), [user, userData, householdMembers, loadingUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
