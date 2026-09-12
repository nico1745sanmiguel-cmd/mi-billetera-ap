import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { checkAndMigrateToHousehold } from '../utils/householdMigration';
import { getCache, setCache } from '../utils/cache';
import { LOADING_DELAY_MS, CACHE_KEYS } from '../config/constants';
import { loadPreferences } from '../services/preferencesService';

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

    /**
     * Re-fetches userData and householdMembers from Firebase.
     * Use this instead of window.location.reload() when household state changes.
     */
    const refreshUserData = useCallback(async () => {
        if (!user) return;
        try {
            const currentHouseholdId = await checkAndMigrateToHousehold(user);
            setUserData({ householdId: currentHouseholdId });
            setCache('userData', { householdId: currentHouseholdId });

            if (currentHouseholdId) {
                const hhSnap = await getDoc(doc(db, 'households', currentHouseholdId));
                if (hhSnap.exists()) {
                    const memberIds = hhSnap.data().members || [];
                    const memberSnaps = await Promise.all(memberIds.map(uid => getDoc(doc(db, 'users', uid))));
                    const members = memberSnaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id });
                    setHouseholdMembers(members);
                    setCache('householdMembers', members);
                }
            } else {
                setHouseholdMembers([]);
                setCache('householdMembers', []);
            }
        } catch (e) {
            console.error('Error refreshing user data:', e);
        }
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // react-doctor-disable-next-line react-doctor/no-impure-state-updater
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

                // Sincronizar sesión con la app Android nativa si estamos dentro de WebView
                if (window.AndroidBridge) {
                    window.AndroidBridge.updateSession(currentUser.uid, currentHouseholdId || '');
                }

                // Apagar el loading de usuario (se puede usar cache o delay)
                setLoadingUser(false);

                // Traer preferencias en background
                loadPreferences(currentUser.uid).then((prefs) => {
                    if (prefs) {
                        if (prefs.enabled_modules) setCache(CACHE_KEYS.ENABLED_MODULES, prefs.enabled_modules);
                        if (prefs.widget_order) setCache(CACHE_KEYS.WIDGET_ORDER, prefs.widget_order);
                        if (prefs.widget_sizes) setCache(CACHE_KEYS.WIDGET_SIZES, prefs.widget_sizes);
                        // Disparar eventos por si la vista ya renderizó con el cache viejo
                        window.dispatchEvent(new CustomEvent('modulesChanged'));
                    }
                }).catch(e => console.error('Error loading preferences:', e));

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
                if (window.AndroidBridge) {
                    window.AndroidBridge.updateSession('', '');
                }
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
        loadingUser,
        refreshUserData
    }), [user, userData, householdMembers, loadingUser, refreshUserData]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
