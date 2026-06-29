import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getCache, setCache } from '../utils/cache';
import { useFinancial } from './FinancialContext';
import { useUIDispatch } from './UIContext';
import { getLatestSalary } from '../utils/salaryUtils';

// ─── Contextos separados (patrón del proyecto) ─────────────────────────────
const SalaryStateContext = createContext(null);
const SalaryDispatchContext = createContext(null);

export const useSalaryState = () => {
    const ctx = useContext(SalaryStateContext);
    if (!ctx) throw new Error('useSalaryState must be used within a SalaryProvider');
    return ctx;
};

export const useSalaryDispatch = () => {
    const ctx = useContext(SalaryDispatchContext);
    if (!ctx) throw new Error('useSalaryDispatch must be used within a SalaryProvider');
    return ctx;
};

// Retro-compat
export const useSalary = () => ({ ...useSalaryState(), ...useSalaryDispatch() });

// ─── Helpers ───────────────────────────────────────────────────────────────
const currentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const CACHE_KEY = 'salary_config_v1';

// ─── Provider ──────────────────────────────────────────────────────────────
export const SalaryProvider = ({ children }) => {
    const { user } = useFinancial();
    const { showToast } = useUIDispatch();

    const monthKey = currentMonthKey();

    // Config del mes: fuentes + sobres + aprobación household
    const [config, setConfig] = useState(() => getCache(CACHE_KEY) || null);
    const [loading, setLoading] = useState(true);
    // Historial de sueldos (viene del doc del usuario, ya existente)
    const [salaryHistory, setSalaryHistory] = useState([]);

    // ─── Listener Firebase ───────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        // 1. Leer historial de sueldo del doc de usuario (salaryHistory ya existe)
        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                setSalaryHistory(snap.data().salaryHistory || []);
            }
        });

        // 2. Leer config del mes (sobres, fuentes, household approval)
        const configRef = doc(db, 'users', user.uid, 'salary_config', monthKey);
        const unsubConfig = onSnapshot(configRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setConfig(data);
                setCache(CACHE_KEY, data);
            } else {
                // No hay config para este mes todavía
                setConfig(null);
            }
            setLoading(false);
        }, (err) => {
            console.error('SalaryContext error:', err);
            setLoading(false);
        });

        return () => {
            unsubUser();
            unsubConfig();
        };
    }, [user, monthKey]);

    // ─── Sueldo base (el más reciente del historial ya existente) ────────
    const baseSalary = useMemo(() => getLatestSalary(salaryHistory), [salaryHistory]);

    // ─── Totales ─────────────────────────────────────────────────────────
    const totalIncome = useMemo(() => {
        if (!config?.sources?.length) return baseSalary;
        return config.sources.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    }, [config, baseSalary]);

    const totalBudgeted = useMemo(() => {
        const envelopes = config?.envelopes || [];
        const householdAmount = config?.householdApproved ? (config?.householdAmount || 0) : 0;
        return envelopes.reduce((acc, e) => acc + (Number(e.budgeted) || 0), 0) + householdAmount;
    }, [config]);

    const totalFree = useMemo(() => totalIncome - totalBudgeted, [totalIncome, totalBudgeted]);

    // ─── Acciones ────────────────────────────────────────────────────────
    const saveConfig = useCallback(async (newConfig) => {
        if (!user) return;
        try {
            const ref = doc(db, 'users', user.uid, 'salary_config', monthKey);
            await setDoc(ref, { ...newConfig, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
            console.error('Error guardando salary config:', e);
            showToast('Error al guardar. Revisá tu conexión.', 'error');
        }
    }, [user, monthKey, showToast]);

    // Guardar fuentes de ingreso
    const saveSources = useCallback(async (sources) => {
        const updated = { ...config, sources };
        setConfig(updated); // optimistic
        await saveConfig({ sources });
        showToast('Fuentes de ingreso actualizadas', 'success');
    }, [config, saveConfig, showToast]);

    // Guardar sobres
    const saveEnvelopes = useCallback(async (envelopes) => {
        const updated = { ...config, envelopes };
        setConfig(updated);
        await saveConfig({ envelopes });
    }, [config, saveConfig]);

    // Aprobar / rechazar gastos familiares
    const approveHouseholdAmount = useCallback(async (amount) => {
        const updated = { ...config, householdApproved: true, householdAmount: amount };
        setConfig(updated);
        await saveConfig({ householdApproved: true, householdAmount: amount });
        showToast('Gastos familiares asignados al plan', 'success');
    }, [config, saveConfig, showToast]);

    const removeHouseholdApproval = useCallback(async () => {
        const updated = { ...config, householdApproved: false, householdAmount: 0 };
        setConfig(updated);
        await saveConfig({ householdApproved: false, householdAmount: 0 });
    }, [config, saveConfig]);

    // Agregar o editar un sobre
    const upsertEnvelope = useCallback(async (envelope) => {
        const current = config?.envelopes || [];
        const exists = current.find(e => e.id === envelope.id);
        const updated = exists
            ? current.map(e => e.id === envelope.id ? envelope : e)
            : [...current, envelope];
        await saveEnvelopes(updated);
    }, [config, saveEnvelopes]);

    // Eliminar sobre
    const deleteEnvelope = useCallback(async (id) => {
        const updated = (config?.envelopes || []).filter(e => e.id !== id);
        await saveEnvelopes(updated);
        showToast('Sobre eliminado', 'info');
    }, [config, saveEnvelopes, showToast]);

    const stateValue = useMemo(() => ({
        config,
        loading,
        salaryHistory,
        baseSalary,
        totalIncome,
        totalBudgeted,
        totalFree,
        monthKey,
        envelopes: config?.envelopes || [],
        sources: config?.sources || [],
        householdApproved: config?.householdApproved || false,
        householdAmount: config?.householdAmount || 0,
    }), [config, loading, salaryHistory, baseSalary, totalIncome, totalBudgeted, totalFree, monthKey]);

    const dispatchValue = useMemo(() => ({
        saveSources,
        saveEnvelopes,
        upsertEnvelope,
        deleteEnvelope,
        approveHouseholdAmount,
        removeHouseholdApproval,
    }), [saveSources, saveEnvelopes, upsertEnvelope, deleteEnvelope, approveHouseholdAmount, removeHouseholdApproval]);

    return (
        <SalaryStateContext.Provider value={stateValue}>
            <SalaryDispatchContext.Provider value={dispatchValue}>
                {children}
            </SalaryDispatchContext.Provider>
        </SalaryStateContext.Provider>
    );
};
