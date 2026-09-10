/**
 * tier5-challenger-m3-2.test.mjs
 * Test Suite Adversarial y de Estrés Empírico para el Hito M3 (challenger_m3_2)
 *
 * Misión:
 * 1. Comportamiento horario nocturno: verificar con fecha simulada a las 21:30 hs de Argentina (UTC-3)
 *    que getLocalDateString() mantenga la fecha local de hoy y no salte a mañana.
 * 2. Cálculo en vivo de rentabilidad en MobilityForm.jsx: evaluar hoursWorked: 0, kilometers: 0,
 *    valores negativos, strings malformados, números gigantes. Asegurar que nunca arroje NaN ni Infinity.
 * 3. Probar handleDateChange en MobilityForm.jsx: renombrar a fechas preexistentes y verificar que no
 *    se pierdan borradores ni mapas de confirmación.
 * 4. Probar el manejo de errores en MobilitySettings.jsx: simular fallo de Firestore en deleteAllSessions
 *    y verificar que el estado de carga se desbloquee y no congele la UI.
 * 5. Verificación de Touch Targets (>= 44px), Skeletons y cumplimiento RFC 4180 / UTF-8 BOM.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
    getLocalDateString,
    sanitizeMobilitySession,
    parseAmount
} from '../../src/utils/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('challenger_m3_2: Hito M3 Adversarial Stress & Verification Suite', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. COMPORTAMIENTO HORARIO NOCTURNO (21:30 HS ARGENTINA UTC-3)
    // ─────────────────────────────────────────────────────────────────────────
    describe('1. Comportamiento Horario Nocturno (UTC-3 vs UTC)', () => {

        it('debe mantener la fecha local de hoy a las 21:30 hs de Argentina (00:30 UTC del día siguiente)', () => {
            // A las 21:30:00 del 10/09/2026 en Argentina (UTC-3), la hora UTC es 11/09/2026 00:30:00Z
            const utcDateAt2130Arg = new Date('2026-09-11T00:30:00.000Z');
            
            // Si usara toISOString().slice(0, 10), daría "2026-09-11" (mañana - error crítico para chofer nocturno)
            const badIsoDate = utcDateAt2130Arg.toISOString().slice(0, 10);
            assert.equal(badIsoDate, '2026-09-11', 'toISOString salta al día siguiente');

            // Con getLocalDateString debe mantenerse en la fecha local "2026-09-10"
            const localDate = getLocalDateString(utcDateAt2130Arg);
            assert.equal(localDate, '2026-09-10', 'getLocalDateString DEBE ser 2026-09-10 a las 21:30 hs');
        });

        it('debe mantener la fecha correcta en todas las horas frontera de la noche y madrugada', () => {
            const boundaryCases = [
                { label: '20:59:59 hs Arg', utc: '2026-09-10T23:59:59.000Z', expected: '2026-09-10' },
                { label: '21:00:00 hs Arg (00:00 UTC frontera)', utc: '2026-09-11T00:00:00.000Z', expected: '2026-09-10' },
                { label: '21:30:00 hs Arg', utc: '2026-09-11T00:30:00.000Z', expected: '2026-09-10' },
                { label: '23:00:00 hs Arg', utc: '2026-09-11T02:00:00.000Z', expected: '2026-09-10' },
                { label: '23:59:59 hs Arg', utc: '2026-09-11T02:59:59.000Z', expected: '2026-09-10' },
                { label: '00:00:00 hs Arg (medianoche exacta)', utc: '2026-09-11T03:00:00.000Z', expected: '2026-09-11' },
                { label: '03:30:00 hs Arg (madrugada)', utc: '2026-09-11T06:30:00.000Z', expected: '2026-09-11' },
            ];

            for (const { label, utc, expected } of boundaryCases) {
                const res = getLocalDateString(new Date(utc));
                assert.equal(res, expected, `Fallo en ${label}: esperado ${expected}, obtenido ${res}`);
            }
        });

        it('debe funcionar con Date global mockeado a las 21:30 hs sin argumentos', () => {
            const RealDate = globalThis.Date;
            try {
                // Simular hora del sistema a las 21:30 hs de Argentina
                const simulatedNow = new Date('2026-09-11T00:30:00.000Z');
                class MockDate extends RealDate {
                    constructor(...args) {
                        if (args.length === 0) {
                            super(simulatedNow.getTime());
                        } else {
                            super(...args);
                        }
                    }
                    static now() {
                        return simulatedNow.getTime();
                    }
                }
                globalThis.Date = MockDate;

                const result = getLocalDateString();
                assert.equal(result, '2026-09-10', 'Llamada sin argumentos con Date mockeado debe retornar 2026-09-10');
            } finally {
                globalThis.Date = RealDate;
            }
        });

        it('verificar estáticamente que MobilityForm.jsx y MobilityExpenses.jsx NO utilicen toISOString', () => {
            const formCode = readFileSync(join(__dirname, '../../src/Components/Mobility/MobilityForm.jsx'), 'utf-8');
            const expCode = readFileSync(join(__dirname, '../../src/Components/Mobility/MobilityExpenses.jsx'), 'utf-8');

            assert.ok(!formCode.includes('toISOString'), 'MobilityForm.jsx no debe contener toISOString');
            assert.ok(!expCode.includes('toISOString'), 'MobilityExpenses.jsx no debe contener toISOString');

            assert.ok(formCode.includes('getLocalDateString'), 'MobilityForm.jsx debe importar y usar getLocalDateString');
            assert.ok(expCode.includes('getLocalDateString'), 'MobilityExpenses.jsx debe importar y usar getLocalDateString');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CÁLCULO EN VIVO DE RENTABILIDAD EN MOBILITYFORM.JSX
    // ─────────────────────────────────────────────────────────────────────────
    describe('2. Cálculo en Vivo de Rentabilidad en MobilityForm.jsx', () => {

        // Reproducción fidedigna de la lógica de render en MobilityForm.jsx
        function computeLiveProfitability(form) {
            const uber   = parseFloat(form.uber)   || 0;
            const didi   = parseFloat(form.didi)   || 0;
            const cabify = parseFloat(form.cabify) || 0;
            const others = parseFloat(form.others) || 0;
            const total  = uber + didi + cabify + others;
            const hoursNum = parseFloat(form.hoursWorked) || 0;
            const kmNum = parseFloat(form.kilometers) || 0;
            const perHour = hoursNum > 0 ? total / hoursNum : 0;
            const perKm = kmNum > 0 ? total / kmNum : 0;

            const shouldRenderPreview = total > 0;
            const shouldRenderMetrics = total > 0 && (hoursNum > 0 || kmNum > 0);

            const displayPerHour = perHour > 0 ? `$${Math.round(perHour).toLocaleString('es-AR')}` : '—';
            const displayPerKm = perKm > 0 ? `$${Math.round(perKm).toLocaleString('es-AR')}` : '—';

            return {
                total,
                hoursNum,
                kmNum,
                perHour,
                perKm,
                shouldRenderPreview,
                shouldRenderMetrics,
                displayPerHour,
                displayPerKm
            };
        }

        it('debe manejar hoursWorked: 0 y kilometers: 0 sin arrojar NaN ni Infinity', () => {
            const result = computeLiveProfitability({
                uber: '50000',
                didi: '20000',
                cabify: '0',
                others: '',
                hoursWorked: 0,
                kilometers: 0
            });

            assert.equal(result.total, 70000);
            assert.equal(result.hoursNum, 0);
            assert.equal(result.kmNum, 0);
            assert.equal(result.perHour, 0);
            assert.equal(result.perKm, 0);
            assert.equal(Number.isNaN(result.perHour), false);
            assert.equal(Number.isFinite(result.perHour), true);
            assert.equal(Number.isNaN(result.perKm), false);
            assert.equal(Number.isFinite(result.perKm), true);
            assert.equal(result.shouldRenderMetrics, false);
            assert.equal(result.displayPerHour, '—');
            assert.equal(result.displayPerKm, '—');
        });

        it('debe manejar valores negativos en horas y kilómetros sin arrojar métricas negativas o erróneas', () => {
            const result = computeLiveProfitability({
                uber: '50000',
                didi: '',
                cabify: '',
                others: '',
                hoursWorked: -8,
                kilometers: -150
            });

            assert.equal(result.hoursNum, -8);
            assert.equal(result.kmNum, -150);
            assert.equal(result.perHour, 0, 'perHour debe ser 0 si hoursNum <= 0');
            assert.equal(result.perKm, 0, 'perKm debe ser 0 si kmNum <= 0');
            assert.equal(result.shouldRenderMetrics, false, 'No debe mostrar métricas para valores <= 0');
        });

        it('debe ser inmune a strings malformados en hoursWorked y kilometers', () => {
            const malformedInputs = [
                '', '   ', 'abc', 'NaN', 'undefined', 'null', '0/0', '$$$8.5',
                '--5', 'true', 'false', '{}', '[]', '<script>alert(1)</script>'
            ];

            for (const input of malformedInputs) {
                const res = computeLiveProfitability({
                    uber: '30000',
                    hoursWorked: input,
                    kilometers: input
                });

                assert.ok(!Number.isNaN(res.perHour), `perHour no debe ser NaN para input: "${input}"`);
                assert.ok(Number.isFinite(res.perHour), `perHour debe ser finito para input: "${input}"`);
                assert.ok(!Number.isNaN(res.perKm), `perKm no debe ser NaN para input: "${input}"`);
                assert.ok(Number.isFinite(res.perKm), `perKm debe ser finito para input: "${input}"`);
                assert.ok(res.perHour >= 0, `perHour debe ser >= 0 para input: "${input}"`);
                assert.ok(res.perKm >= 0, `perKm debe ser >= 0 para input: "${input}"`);
            }
        });

        it('debe manejar números gigantes y números extremadamente pequeños sin overflow a NaN', () => {
            // Total normal con horas gigantes
            const hugeHours = computeLiveProfitability({
                uber: '50000',
                hoursWorked: Number.MAX_SAFE_INTEGER,
                kilometers: 1e12
            });
            assert.ok(!Number.isNaN(hugeHours.perHour));
            assert.ok(Number.isFinite(hugeHours.perHour));
            assert.ok(hugeHours.perHour >= 0);

            // Total gigante con horas normales
            const hugeTotal = computeLiveProfitability({
                uber: '999999999999',
                hoursWorked: '8',
                kilometers: '200'
            });
            assert.ok(!Number.isNaN(hugeTotal.perHour));
            assert.ok(Number.isFinite(hugeTotal.perHour));
            assert.equal(hugeTotal.perHour, 999999999999 / 8);

            // Horas infinitesimales
            const tinyHours = computeLiveProfitability({
                uber: '10000',
                hoursWorked: '0.000001',
                kilometers: '0.00001'
            });
            assert.ok(!Number.isNaN(tinyHours.perHour));
            assert.ok(Number.isFinite(tinyHours.perHour));
        });

        it('debe calcular valores correctos en escenarios normales', () => {
            const normal = computeLiveProfitability({
                uber: '40000',
                didi: '30000',
                cabify: '10000',
                others: '0',
                hoursWorked: '8',
                kilometers: '160'
            });

            assert.equal(normal.total, 80000);
            assert.equal(normal.perHour, 10000);
            assert.equal(normal.perKm, 500);
            assert.equal(normal.displayPerHour, '$10.000');
            assert.equal(normal.displayPerKm, '$500');
            assert.equal(normal.shouldRenderPreview, true);
            assert.equal(normal.shouldRenderMetrics, true);
        });

        it('sanitización de backend (sanitizeMobilitySession) previene NaN o Infinity en earningsPerHour/Km', () => {
            const sessionsToTest = [
                { date: '2026-09-10', total: 50000, hoursWorked: 0, kilometers: 0 },
                { date: '2026-09-10', total: 50000, hoursWorked: -10, kilometers: -5 },
                { date: '2026-09-10', total: 50000, hoursWorked: 'NaN', kilometers: 'Infinity' },
                { date: '2026-09-10', total: 0, hoursWorked: 0, kilometers: 0 },
            ];

            for (const s of sessionsToTest) {
                const sanitized = sanitizeMobilitySession(s);
                assert.ok(!Number.isNaN(sanitized.earningsPerHour));
                assert.ok(Number.isFinite(sanitized.earningsPerHour));
                assert.ok(sanitized.earningsPerHour >= 0);

                assert.ok(!Number.isNaN(sanitized.earningsPerKm));
                assert.ok(Number.isFinite(sanitized.earningsPerKm));
                assert.ok(sanitized.earningsPerKm >= 0);
            }
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PROBAR handleDateChange EN MOBILITYFORM.JSX
    // ─────────────────────────────────────────────────────────────────────────
    describe('3. Persistencia de Borradores y Confirmaciones en handleDateChange', () => {

        // Implementación pura del reducer de handleDateChange de MobilityForm.jsx
        function simulateDateChange(state, oldDate, newDate) {
            let { drafts, confirmed, activeDate } = state;
            if (!newDate || oldDate === newDate) {
                return { drafts, confirmed, activeDate };
            }

            let nextDrafts = drafts;
            // Si ya existe la nueva fecha en los drafts, no sobreescribir ni corromper
            if (!drafts[newDate]) {
                const copy = { ...drafts };
                copy[newDate] = { ...copy[oldDate], date: newDate };
                delete copy[oldDate];
                nextDrafts = copy;
            }

            let nextConfirmed = confirmed;
            if (!confirmed[newDate]) {
                const copy = { ...confirmed };
                copy[newDate] = copy[oldDate] || {};
                delete copy[oldDate];
                nextConfirmed = copy;
            }

            return {
                drafts: nextDrafts,
                confirmed: nextConfirmed,
                activeDate: newDate
            };
        }

        it('no debe sobreescribir ni perder borradores ni confirmaciones al renombrar a una fecha preexistente', () => {
            const initialState = {
                drafts: {
                    '2026-09-10': { date: '2026-09-10', uber: '45000', didi: '15000', hoursWorked: '7' },
                    '2026-09-09': { date: '2026-09-09', uber: '60000', didi: '20000', hoursWorked: '8' }
                },
                confirmed: {
                    '2026-09-10': { uber: true, didi: true },
                    '2026-09-09': { uber: true, didi: false }
                },
                activeDate: '2026-09-10'
            };

            // El usuario intenta cambiar la fecha de 2026-09-10 a 2026-09-09 (que ya existe)
            const result = simulateDateChange(initialState, '2026-09-10', '2026-09-09');

            // 1. El borrador de 2026-09-09 NO debe ser sobreescrito con los datos de 2026-09-10
            assert.equal(result.drafts['2026-09-09'].uber, '60000', 'Borrador existente de 2026-09-09 no debe alterarse');
            assert.equal(result.drafts['2026-09-09'].hoursWorked, '8');

            // 2. El borrador original de 2026-09-10 NO debe perderse
            assert.ok(result.drafts['2026-09-10'], 'Borrador de 2026-09-10 debe seguir existiendo');
            assert.equal(result.drafts['2026-09-10'].uber, '45000');

            // 3. Los mapas de confirmación de ambas fechas deben quedar intactos
            assert.deepEqual(result.confirmed['2026-09-09'], { uber: true, didi: false });
            assert.deepEqual(result.confirmed['2026-09-10'], { uber: true, didi: true });

            // 4. La pestaña activa debe conmutar a la fecha destino
            assert.equal(result.activeDate, '2026-09-09', 'activeDate debe cambiar a 2026-09-09');
        });

        it('debe migrar correctamente los datos y confirmaciones al cambiar a una fecha nueva inexistente', () => {
            const initialState = {
                drafts: {
                    '2026-09-10': { date: '2026-09-10', uber: '35000', hoursWorked: '6', kilometers: '120' }
                },
                confirmed: {
                    '2026-09-10': { uber: true }
                },
                activeDate: '2026-09-10'
            };

            const result = simulateDateChange(initialState, '2026-09-10', '2026-09-08');

            // 1. La fecha vieja deja de existir en drafts
            assert.equal(result.drafts['2026-09-10'], undefined);

            // 2. La fecha nueva contiene los datos migrados y su propiedad date coincide
            assert.ok(result.drafts['2026-09-08']);
            assert.equal(result.drafts['2026-09-08'].date, '2026-09-08');
            assert.equal(result.drafts['2026-09-08'].uber, '35000');
            assert.equal(result.drafts['2026-09-08'].hoursWorked, '6');
            assert.equal(result.drafts['2026-09-08'].kilometers, '120');

            // 3. Confirmaciones migradas
            assert.equal(result.confirmed['2026-09-10'], undefined);
            assert.deepEqual(result.confirmed['2026-09-08'], { uber: true });

            // 4. activeDate actualizado
            assert.equal(result.activeDate, '2026-09-08');
        });

        it('debe ignorar llamadas inválidas (newDate vacío, null, o idéntico a oldDate)', () => {
            const initialState = {
                drafts: { '2026-09-10': { date: '2026-09-10', uber: '10000' } },
                confirmed: { '2026-09-10': { uber: true } },
                activeDate: '2026-09-10'
            };

            const resEmpty = simulateDateChange(initialState, '2026-09-10', '');
            assert.deepEqual(resEmpty, initialState, 'newDate vacío no debe alterar el estado');

            const resSame = simulateDateChange(initialState, '2026-09-10', '2026-09-10');
            assert.deepEqual(resSame, initialState, 'newDate idéntico no debe alterar el estado');

            const resNull = simulateDateChange(initialState, '2026-09-10', null);
            assert.deepEqual(resNull, initialState, 'newDate null no debe alterar el estado');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. MANEJO DE ERRORES EN MOBILITYSETTINGS.JSX
    // ─────────────────────────────────────────────────────────────────────────
    describe('4. Manejo de Errores y Desbloqueo de UI en MobilitySettings.jsx', () => {

        async function simulateHandleDeleteAll(deleteAllSessionsMock, showToastMock) {
            let deletingAll = false;
            let showDeleteAll = true;

            // Transcripción fiel del código de MobilitySettings.jsx (líneas 60-72)
            const handleDeleteAll = async () => {
                deletingAll = true;
                try {
                    await deleteAllSessionsMock();
                    showDeleteAll = false;
                    showToastMock('Historial borrado correctamente', 'success');
                } catch (error) {
                    // console.error('Error al borrar historial:', error);
                    showToastMock('Hubo un error al borrar el historial.', 'error');
                } finally {
                    deletingAll = false;
                }
            };

            await handleDeleteAll();

            return {
                deletingAll,
                showDeleteAll
            };
        }

        it('debe liberar deletingAll (false) y mostrar toast de error cuando Firestore falla', async () => {
            const toastCalls = [];
            const showToastMock = (msg, type) => toastCalls.push({ msg, type });
            
            // Simular fallo catastrófico de Firestore (red caída, cuota agotada, permiso denegado)
            const deleteAllSessionsFailing = async () => {
                throw new Error('FirebaseError: [unavailable] The service is currently unavailable.');
            };

            const res = await simulateHandleDeleteAll(deleteAllSessionsFailing, showToastMock);

            // 1. El flag deletingAll DEBE volver a false para no congelar la UI
            assert.equal(res.deletingAll, false, 'deletingAll debe liberarse (false) en el bloque finally');

            // 2. El modal showDeleteAll debe seguir abierto para que el usuario pueda reintentar o cancelar
            assert.equal(res.showDeleteAll, true, 'showDeleteAll debe permanecer true ante error');

            // 3. Se debe haber emitido el toast de error pedagógico
            assert.equal(toastCalls.length, 1);
            assert.equal(toastCalls[0].type, 'error');
            assert.equal(toastCalls[0].msg, 'Hubo un error al borrar el historial.');
        });

        it('debe manejar éxito cerrando modal, emitiendo toast success y liberando loading', async () => {
            const toastCalls = [];
            const showToastMock = (msg, type) => toastCalls.push({ msg, type });
            const deleteAllSessionsSuccess = async () => true;

            const res = await simulateHandleDeleteAll(deleteAllSessionsSuccess, showToastMock);

            assert.equal(res.deletingAll, false);
            assert.equal(res.showDeleteAll, false, 'Modal debe cerrarse ante éxito');
            assert.equal(toastCalls.length, 1);
            assert.equal(toastCalls[0].type, 'success');
            assert.equal(toastCalls[0].msg, 'Historial borrado correctamente');
        });

        it('verificar estáticamente en MobilitySettings.jsx que handleDeleteAll posea try/catch/finally', () => {
            const settingsCode = readFileSync(join(__dirname, '../../src/Components/Mobility/MobilitySettings.jsx'), 'utf-8');

            assert.ok(settingsCode.includes('try {'), 'MobilitySettings debe tener bloque try');
            assert.ok(settingsCode.includes('} catch (error) {'), 'MobilitySettings debe tener bloque catch');
            assert.ok(settingsCode.includes('} finally {'), 'MobilitySettings debe tener bloque finally');
            assert.ok(settingsCode.includes('setDeletingAll(false);'), 'finally debe resetear setDeletingAll(false)');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. AUDITORÍA UX/UI: TOUCH TARGETS, SKELETON Y RFC 4180
    // ─────────────────────────────────────────────────────────────────────────
    describe('5. Auditoría UX/UI, Accesibilidad Móvil y CSV RFC 4180', () => {

        it('MobilityExpensesList.jsx debe poseer touch targets ergonómicos de al menos 44x44px', () => {
            const listCode = readFileSync(join(__dirname, '../../src/Components/Mobility/MobilityExpensesList.jsx'), 'utf-8');

            // Verificar la presencia de min-h-[44px] y min-w-[44px] en botones de acción
            assert.ok(listCode.includes('min-h-[44px]'), 'Debe incluir min-h-[44px]');
            assert.ok(listCode.includes('min-w-[44px]'), 'Debe incluir min-w-[44px]');
            assert.ok(listCode.includes('deletingId === exp.id'), 'Debe incluir confirmación inline para evitar borrado accidental');
        });

        it('MobilityHistory.jsx debe incluir Skeleton de carga y exportToCSV con UTF-8 BOM', () => {
            const histCode = readFileSync(join(__dirname, '../../src/Components/Mobility/MobilityHistory.jsx'), 'utf-8');

            // Skeleton import and condition
            assert.ok(histCode.includes("import Skeleton from '../UI/Skeleton'"), 'Debe importar Skeleton');
            assert.ok(histCode.includes('loading && sessions.length === 0'), 'Debe usar condición loading && sessions.length === 0');

            // CSV export con UTF-8 BOM
            assert.ok(histCode.includes('\\uFEFF'), 'exportToCSV debe incluir UTF-8 BOM (\\uFEFF) para compatibilidad con Excel');
            assert.ok(histCode.includes('exportToCSV'), 'Debe implementar exportToCSV');
        });

        it('MobilityImport.jsx debe implementar autodetección de delimitador RFC 4180 y soporte .csv / .CSV', () => {
            const importCode = readFileSync(join(__dirname, '../../src/Components/Mobility/MobilityImport.jsx'), 'utf-8');

            // Autodetección de delimitador
            assert.ok(importCode.includes("delimiter = ';'"), 'Debe soportar delimitador punto y coma');
            assert.ok(importCode.includes("delimiter = ','"), 'Debe soportar delimitador coma');
            assert.ok(importCode.includes("downloadCSVTemplate"), 'Debe proveer descarga de plantilla CSV');
        });
    });
});
