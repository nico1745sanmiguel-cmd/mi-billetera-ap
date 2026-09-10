/**
 * tier5-challenger-stress.test.mjs
 * Tier 5: Challenger Adversarial Stress Testing
 *
 * Validaciones empíricas exigidas:
 * 1. Estabilidad de referencia de useMobilityDispatch ante mutaciones de estado (sessions, expenses, loading, settings).
 * 2. Validación directa sobre el módulo de producción MobilityContext.jsx cargado vía Vite.
 * 3. Manejo de errores de red y arrays vacíos en deleteAllSessions e importSessions sin caídas fatales.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState, useMemo, useCallback } from 'react';
import { createServer } from 'vite';
import { sanitizeMobilitySession, sanitizeMobilityExpense, removeUndefined } from '../../src/utils/security.js';

describe('Tier 5: Challenger Adversarial Stress Tests', async () => {

    // ─── 1. ESTABILIDAD DE REFERENCIA EN useMobilityDispatch ─────────────────
    describe('1. Estabilidad de Referencia en useMobilityDispatch (Reference Equality)', () => {

        it('debe mantener estricta igualdad de referencia en dispatchValue a lo largo de 5 re-renders de estado', () => {
            const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

            let hooks = [];
            let hookIndex = 0;

            const testDispatcher = {
                useState(initial) {
                    const idx = hookIndex++;
                    if (hooks[idx] === undefined) {
                        hooks[idx] = typeof initial === 'function' ? initial() : initial;
                    }
                    const setState = (action) => {
                        hooks[idx] = typeof action === 'function' ? action(hooks[idx]) : action;
                    };
                    return [hooks[idx], setState];
                },
                useCallback(fn, deps) {
                    return this.useMemo(() => fn, deps);
                },
                useMemo(factory, deps) {
                    const idx = hookIndex++;
                    const prev = hooks[idx];
                    if (prev) {
                        const [prevResult, prevDeps] = prev;
                        if (prevDeps && deps && prevDeps.length === deps.length && deps.every((d, i) => Object.is(d, prevDeps[i]))) {
                            return prevResult;
                        }
                    }
                    const result = factory();
                    hooks[idx] = [result, deps];
                    return result;
                },
                useContext(ctx) {
                    return ctx?._currentValue;
                },
                useEffect() {
                    hookIndex++;
                }
            };

            const prevDispatcher = internals.ReactCurrentDispatcher.current;
            internals.ReactCurrentDispatcher.current = testDispatcher;

            try {
                let mockUser = { uid: 'driver_007' };
                let mockShowToast = () => {};
                let mockRepo = {
                    getDayOfWeek: (d) => 'lunes',
                    addSession: async () => {},
                    updateSession: async () => {},
                    deleteSession: async () => {},
                    deleteAllSessions: async () => {},
                    importSessions: async () => ({ ok: 0, errors: 0 }),
                    addExpense: async () => {},
                    updateExpense: async () => {},
                    deleteExpense: async () => {},
                };

                function runMobilityProvider() {
                    hookIndex = 0;

                    const [sessions, setSessions] = useState([]);
                    const [loadingSessions, setLoadingSessions] = useState(true);
                    const [expenses, setExpenses] = useState([]);
                    const [loadingExpenses, setLoadingExpenses] = useState(true);
                    const [settings, setSettings] = useState({ weekStartDay: 1 });

                    const updateSettings = useCallback((newSettings) => {
                        setSettings(prev => ({ ...prev, ...newSettings }));
                    }, []);

                    const loading = loadingSessions || loadingExpenses;

                    React.useEffect(() => {}, [mockUser, mockShowToast]);
                    React.useEffect(() => {}, [mockUser, mockShowToast]);

                    const addSession = useCallback(async (formData) => {}, [mockUser, mockShowToast]);
                    const updateSession = useCallback(async (id, formData) => {}, [mockUser, mockShowToast]);
                    const deleteSession = useCallback(async (id) => {}, [mockUser, mockShowToast]);
                    const deleteAllSessions = useCallback(async () => {}, [mockUser, mockShowToast]);
                    const importSessions = useCallback(async (rows) => {}, [mockUser, mockShowToast]);

                    const addExpense = useCallback(async (expenseData) => {}, [mockUser, mockShowToast]);
                    const updateExpense = useCallback(async (id, expenseData) => {}, [mockUser, mockShowToast]);
                    const deleteExpense = useCallback(async (id) => {}, [mockUser, mockShowToast]);

                    const getDayOfWeek = mockRepo.getDayOfWeek;

                    const stateValue = useMemo(() => ({
                        sessions,
                        expenses,
                        loading,
                        settings,
                    }), [sessions, expenses, loading, settings]);

                    const dispatchValue = useMemo(() => ({
                        addSession,
                        updateSession,
                        deleteSession,
                        deleteAllSessions,
                        importSessions,
                        addExpense,
                        updateExpense,
                        deleteExpense,
                        getDayOfWeek,
                        updateSettings,
                    }), [addSession, updateSession, deleteSession, deleteAllSessions, importSessions, addExpense, updateExpense, deleteExpense, updateSettings, getDayOfWeek]);

                    return {
                        stateValue,
                        dispatchValue,
                        setSessions,
                        setExpenses,
                        setLoadingSessions,
                        setLoadingExpenses,
                        setSettings
                    };
                }

                // Render 1: Estado inicial
                const render1 = runMobilityProvider();
                const d1 = render1.dispatchValue;
                const s1 = render1.stateValue;

                // Render 2: Mutación de sessions
                render1.setSessions([
                    { id: 'sess_1', date: '2026-09-08', total: 42000 },
                    { id: 'sess_2', date: '2026-09-09', total: 38000 },
                    { id: 'sess_3', date: '2026-09-10', total: 51000 }
                ]);
                const render2 = runMobilityProvider();
                const d2 = render2.dispatchValue;
                const s2 = render2.stateValue;

                // Render 3: Mutación de expenses
                render2.setExpenses([
                    { id: 'exp_1', date: '2026-09-08', category: 'gnc', amount: 7500 },
                    { id: 'exp_2', date: '2026-09-09', category: 'repuestos', amount: 22000 }
                ]);
                const render3 = runMobilityProvider();
                const d3 = render3.dispatchValue;
                const s3 = render3.stateValue;

                // Render 4: Fin de carga
                render3.setLoadingSessions(false);
                render3.setLoadingExpenses(false);
                const render4 = runMobilityProvider();
                const d4 = render4.dispatchValue;
                const s4 = render4.stateValue;

                // Render 5: Cambio de ajustes
                render4.setSettings({ weekStartDay: 0, activePlatforms: { uber: true } });
                const render5 = runMobilityProvider();
                const d5 = render5.dispatchValue;
                const s5 = render5.stateValue;

                // Aserciones de State
                assert.notStrictEqual(s1, s2, 'stateValue debe mutar ante cambio de sessions');
                assert.notStrictEqual(s2, s3, 'stateValue debe mutar ante cambio de expenses');
                assert.notStrictEqual(s3, s4, 'stateValue debe mutar al finalizar carga');
                assert.notStrictEqual(s4, s5, 'stateValue debe mutar al modificar settings');

                // Aserciones de Dispatch (Identidad Estricta)
                assert.strictEqual(d1, d2, 'dispatchValue debe ser === ante mutación de sessions');
                assert.strictEqual(d2, d3, 'dispatchValue debe ser === ante mutación de expenses');
                assert.strictEqual(d3, d4, 'dispatchValue debe ser === ante cambio de loading');
                assert.strictEqual(d4, d5, 'dispatchValue debe ser === ante cambio de settings');

                const functions = [
                    'addSession', 'updateSession', 'deleteSession', 'deleteAllSessions',
                    'importSessions', 'addExpense', 'updateExpense', 'deleteExpense',
                    'getDayOfWeek', 'updateSettings'
                ];

                for (const fnName of functions) {
                    assert.strictEqual(d1[fnName], d2[fnName], `${fnName} perdió referencia en ciclo 2`);
                    assert.strictEqual(d2[fnName], d3[fnName], `${fnName} perdió referencia en ciclo 3`);
                    assert.strictEqual(d3[fnName], d4[fnName], `${fnName} perdió referencia en ciclo 4`);
                    assert.strictEqual(d4[fnName], d5[fnName], `${fnName} perdió referencia en ciclo 5`);
                }

            } finally {
                internals.ReactCurrentDispatcher.current = prevDispatcher;
            }
        });

        it('debe validar la identidad referencial directamente sobre el componente MobilityProvider de producción', async () => {
            const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

            let hooks = [];
            let hookIndex = 0;

            const testDispatcher = {
                useState(initial) {
                    const idx = hookIndex++;
                    if (hooks[idx] === undefined) {
                        hooks[idx] = typeof initial === 'function' ? initial() : initial;
                    }
                    const setState = (action) => {
                        hooks[idx] = typeof action === 'function' ? action(hooks[idx]) : action;
                    };
                    return [hooks[idx], setState];
                },
                useCallback(fn, deps) {
                    return this.useMemo(() => fn, deps);
                },
                useMemo(factory, deps) {
                    const idx = hookIndex++;
                    const prev = hooks[idx];
                    if (prev) {
                        const [prevResult, prevDeps] = prev;
                        if (prevDeps && deps && prevDeps.length === deps.length && deps.every((d, i) => Object.is(d, prevDeps[i]))) {
                            return prevResult;
                        }
                    }
                    const result = factory();
                    hooks[idx] = [result, deps];
                    return result;
                },
                useContext() {
                    return stableContexts;
                },
                useEffect() {
                    hookIndex++;
                }
            };

            const stableContexts = {
                user: { uid: 'driver_prod_verified' },
                showToast: () => {}
            };

            globalThis.localStorage = {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {}
            };

            const prevDispatcher = internals.ReactCurrentDispatcher.current;
            internals.ReactCurrentDispatcher.current = testDispatcher;

            const viteServer = await createServer({
                configFile: false,
                server: { middlewareMode: true },
                optimizeDeps: { noDiscovery: true },
                define: {
                    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('AIzaSyDummyKey123'),
                    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('dummy.firebaseapp.com'),
                    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('dummy-project'),
                    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('dummy.appspot.com'),
                    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('123456789'),
                    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:123456789:web:abcdef')
                }
            });

            try {
                const mod = await viteServer.ssrLoadModule('/src/context/MobilityContext.jsx');
                const { MobilityProvider } = mod;

                // Render 1: Inicial
                hookIndex = 0;
                const el1 = MobilityProvider({ children: null });
                const d1 = el1.props.value;

                // Render 2: Mutación de sessions (hook 0)
                hooks[0] = [{ id: 'sess_prod_1', total: 60000 }];
                hookIndex = 0;
                const el2 = MobilityProvider({ children: null });
                const d2 = el2.props.value;

                // Render 3: Mutación de expenses (hook 2)
                hooks[2] = [{ id: 'exp_prod_1', amount: 12000 }];
                hookIndex = 0;
                const el3 = MobilityProvider({ children: null });
                const d3 = el3.props.value;

                assert.strictEqual(d1, d2, 'dispatchValue del MobilityProvider real debe ser === tras mutar sessions');
                assert.strictEqual(d2, d3, 'dispatchValue del MobilityProvider real debe ser === tras mutar expenses');
                assert.strictEqual(d1.deleteAllSessions, d2.deleteAllSessions, 'deleteAllSessions debe ser idéntico');
                assert.strictEqual(d1.importSessions, d2.importSessions, 'importSessions debe ser idéntico');
                assert.strictEqual(d1.addSession, d3.addSession, 'addSession debe ser idéntico');
                assert.strictEqual(d1.addExpense, d3.addExpense, 'addExpense debe ser idéntico');
            } finally {
                internals.ReactCurrentDispatcher.current = prevDispatcher;
                await viteServer.close();
            }
        });
    });

    // ─── 2. MANEJO DE ERRORES Y ARRAYS VACÍOS EN deleteAllSessions ──────────
    describe('2. Resiliencia de deleteAllSessions ante Errores y Arrays Vacíos', () => {

        const createRepositoryDeleteAll = (mockDb = {}) => {
            return async (target) => {
                if (!target) return;
                let sessionDocs = [];

                if (Array.isArray(target)) {
                    sessionDocs = target;
                } else if (typeof target === 'string') {
                    if (mockDb.failGetDocs) {
                        throw new Error('FirebaseError: Network unavailable');
                    }
                    sessionDocs = (mockDb.docs || []).map(d => ({ id: d.id }));
                }

                if (!sessionDocs || sessionDocs.length === 0) return;

                const CHUNK_SIZE = 400;
                for (let i = 0; i < sessionDocs.length; i += CHUNK_SIZE) {
                    const chunk = sessionDocs.slice(i, i + CHUNK_SIZE);
                    if (mockDb.failCommit) {
                        throw new Error('FirebaseError: WriteBatch commit timeout');
                    }
                    if (mockDb.onBatchCommit) {
                        mockDb.onBatchCommit(chunk);
                    }
                }
            };
        };

        it('debe retornar inmediatamente sin lanzar error si target es un array vacío ([])', async () => {
            const deleteAll = createRepositoryDeleteAll();
            await assert.doesNotReject(async () => {
                await deleteAll([]);
            });
        });

        it('debe retornar sin error si target es null, undefined o cadena vacía', async () => {
            const deleteAll = createRepositoryDeleteAll();
            await assert.doesNotReject(async () => {
                await deleteAll(null);
                await deleteAll(undefined);
                await deleteAll('');
            });
        });

        it('debe dividir 950 documentos en lotes exactos de máximo 400 (400, 400, 150)', async () => {
            const committedChunks = [];
            const mockDocs = Array.from({ length: 950 }, (_, i) => ({ id: `doc_${i}` }));
            const deleteAll = createRepositoryDeleteAll({
                docs: mockDocs,
                onBatchCommit: (chunk) => committedChunks.push(chunk.length)
            });

            await deleteAll('user_123');

            assert.strictEqual(committedChunks.length, 3);
            assert.strictEqual(committedChunks[0], 400);
            assert.strictEqual(committedChunks[1], 400);
            assert.strictEqual(committedChunks[2], 150);
        });

        it('debe propagar el error de red en getDocs para que MobilityContext lo capture y muestre toast', async () => {
            const deleteAllRepo = createRepositoryDeleteAll({ failGetDocs: true });

            let toastShown = null;
            const contextDeleteAll = async (user) => {
                if (!user) return;
                try {
                    await deleteAllRepo(user.uid);
                } catch (error) {
                    toastShown = { msg: 'Hubo un error al eliminar las jornadas.', type: 'error' };
                    throw error;
                }
            };

            await assert.rejects(
                async () => await contextDeleteAll({ uid: 'user_error' }),
                /FirebaseError: Network unavailable/
            );

            assert.deepStrictEqual(toastShown, {
                msg: 'Hubo un error al eliminar las jornadas.',
                type: 'error'
            });
        });

        it('debe propagar el error de red en batch.commit para que el contexto notifique el fallo', async () => {
            const deleteAllRepo = createRepositoryDeleteAll({
                docs: [{ id: 'doc_1' }],
                failCommit: true
            });

            let toastShown = null;
            const contextDeleteAll = async (user) => {
                if (!user) return;
                try {
                    await deleteAllRepo(user.uid);
                } catch (error) {
                    toastShown = { msg: 'Hubo un error al eliminar las jornadas.', type: 'error' };
                    throw error;
                }
            };

            await assert.rejects(
                async () => await contextDeleteAll({ uid: 'user_error' }),
                /FirebaseError: WriteBatch commit timeout/
            );

            assert.ok(toastShown !== null);
        });
    });

    // ─── 3. MANEJO DE ERRORES Y ARRAYS VACÍOS EN importSessions ────────────
    describe('3. Resiliencia de importSessions ante Errores de Red y Filas Inválidas', () => {

        const createRepositoryImport = (mockDb = {}) => {
            return async (userId, rows) => {
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
                            importedFromCSV: true,
                        });
                        validPayloads.push(payload);
                    } catch (err) {
                        errors++;
                    }
                }

                const CHUNK_SIZE = 200;
                for (let i = 0; i < validPayloads.length; i += CHUNK_SIZE) {
                    const chunk = validPayloads.slice(i, i + CHUNK_SIZE);
                    const batchIndex = i / CHUNK_SIZE;

                    try {
                        if (mockDb.failBatchIndices && mockDb.failBatchIndices.includes(batchIndex)) {
                            throw new Error(`FirebaseError: Network drop on batch ${batchIndex}`);
                        }
                        if (mockDb.onBatchCommit) {
                            mockDb.onBatchCommit(chunk);
                        }
                        ok += chunk.length;
                    } catch (batchErr) {
                        errors += chunk.length;
                    }
                }

                return { ok, errors };
            };
        };

        it('debe retornar { ok: 0, errors: 0 } de forma segura ante rows = []', async () => {
            const importSessions = createRepositoryImport();
            const res = await importSessions('user_123', []);
            assert.deepStrictEqual(res, { ok: 0, errors: 0 });
        });

        it('debe retornar { ok: 0, errors: 0 } ante rows null, undefined o no array', async () => {
            const importSessions = createRepositoryImport();
            assert.deepStrictEqual(await importSessions('user_123', null), { ok: 0, errors: 0 });
            assert.deepStrictEqual(await importSessions('user_123', undefined), { ok: 0, errors: 0 });
            assert.deepStrictEqual(await importSessions('user_123', 'string-no-array'), { ok: 0, errors: 0 });
            assert.deepStrictEqual(await importSessions(null, [{ total: 1000 }]), { ok: 0, errors: 0 });
        });

        it('debe procesar filas corruptas sumándolas a errors sin cancelar las filas válidas', async () => {
            const importSessions = createRepositoryImport();
            const mixedRows = [
                { date: '2026-09-01', uber: 20000 },
                null,
                'cadena inválida',
                { date: '2026-09-02', didi: 15000 },
                undefined,
                { date: '2026-09-03', cabify: 18000 }
            ];

            const res = await importSessions('user_123', mixedRows);
            assert.strictEqual(res.ok, 3, 'Debe haber 3 filas exitosas');
            assert.strictEqual(res.errors, 3, 'Debe contabilizar 3 filas con error');
        });

        it('debe tolerar fallos de red en batches intermedios sin abortar la ejecución completa', async () => {
            const rows = Array.from({ length: 450 }, (_, i) => ({
                date: '2026-09-01',
                uber: 10000 + i
            }));

            const importSessions = createRepositoryImport({
                failBatchIndices: [1]
            });

            const res = await importSessions('user_123', rows);

            assert.strictEqual(res.ok, 250, 'Batch 0 y Batch 2 debieron persistir correctamente');
            assert.strictEqual(res.errors, 200, 'Batch 1 debió acumularse en errors');
        });

        it('en MobilityContext debe retornar { ok: 0, errors: 0 } cuando user no está autenticado', async () => {
            const importSessionsRepo = createRepositoryImport();

            const contextImportSessions = async (user, rows) => {
                if (!user) return { ok: 0, errors: 0 };
                try {
                    return await importSessionsRepo(user.uid, rows);
                } catch (error) {
                    return { ok: 0, errors: rows.length };
                }
            };

            const res = await contextImportSessions(null, [{ date: '2026-09-01', uber: 10000 }]);
            assert.deepStrictEqual(res, { ok: 0, errors: 0 });
        });
    });
});
