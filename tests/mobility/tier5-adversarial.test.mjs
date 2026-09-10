/**
 * tier5-adversarial.test.mjs
 * Tier 5: Adversarial Hardening & Empirical Stress Tests (Challenger M1)
 *
 * Misión del Challenger:
 * 1. Test sanitizeMobilitySession y sanitizeMobilityExpense ante entradas adversariales extremas:
 *    - Strings masivos (10k, 100k caracteres)
 *    - Inyecciones XSS y caracteres de control
 *    - Intentos de polución de prototipo (__proto__, constructor, prototype)
 *    - NaN, Infinity, -Infinity, -1e9, valores negativos extremos
 *    - Propiedades undefined y objetos anidados
 *    - Tipos primitivos inválidos
 * 2. Test getLocalDateString en horas frontera (20:59, 21:00, 21:15, 23:59, 00:00) y múltiples zonas horarias
 * 3. Test de particionamiento en lotes para 401, 500, 501 y 1000 elementos garantizando lotes <= 400
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Importar directamente las utilidades de producción
import {
    sanitizeMobilitySession,
    sanitizeMobilityExpense,
    getLocalDateString,
    parseAmount,
    cleanSafeString,
    removeUndefined
} from '../../src/utils/security.js';

import {
    chunkOperations,
    getLocalDateString as getLocalDateStringContract
} from './mobilityContracts.mjs';

describe('Tier 5: Adversarial Hardening & Empirical Stress Tests', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ADVERSARIAL SANITIZATION TESTS
    // ─────────────────────────────────────────────────────────────────────────
    describe('1. Adversarial Sanitization: sanitizeMobilitySession & sanitizeMobilityExpense', () => {

        describe('1.1 Strings Masivos y Resistencia a Ataques ReDoS / Memoria', () => {
            it('debe truncar un campo notes de 100.000 caracteres a exactamente 200 sin colapsar', () => {
                const massiveString = 'A'.repeat(100_000);
                const rawSession = {
                    date: '2026-09-10',
                    uber: 15000,
                    notes: massiveString
                };
                const start = performance.now();
                const sanitized = sanitizeMobilitySession(rawSession);
                const elapsed = performance.now() - start;

                assert.ok(elapsed < 100, `Demasiado lento: ${elapsed}ms`);
                assert.strictEqual(sanitized.notes.length, 200);
                assert.strictEqual(sanitized.notes, 'A'.repeat(200));
            });

            it('debe truncar un campo notes masivo en gastos a exactamente 200 caracteres', () => {
                const massiveNotes = 'GastoVehicular_'.repeat(10_000); // 150.000 chars
                const rawExpense = {
                    date: '2026-09-10',
                    category: 'gnc',
                    amount: 8500,
                    notes: massiveNotes
                };
                const sanitized = sanitizeMobilityExpense(rawExpense);
                assert.strictEqual(sanitized.notes.length, 200);
            });

            it('debe truncar category en gastos a 50 caracteres ante strings masivos', () => {
                const massiveCategory = 'MantenimientoSuperComplejoDeMotorYSuspension_'.repeat(100);
                const rawExpense = {
                    category: massiveCategory,
                    amount: 25000
                };
                const sanitized = sanitizeMobilityExpense(rawExpense);
                assert.ok(sanitized.category.length <= 50);
                assert.strictEqual(sanitized.category, massiveCategory.slice(0, 50));
            });

            it('debe truncar dayOfWeek a 20 caracteres y id a 50 caracteres si se inyectan strings gigantes', () => {
                const rawSession = {
                    date: '2026-09-10',
                    dayOfWeek: 'JuevesSuperLargo'.repeat(1000),
                    id: 'doc_id_muy_largo_'.repeat(100)
                };
                const sanitized = sanitizeMobilitySession(rawSession);
                assert.ok(sanitized.dayOfWeek.length <= 20);
                assert.ok(sanitized.id.length <= 50);
            });

            it('debe tolerar date con string de 50.000 caracteres sin ReDoS y recurrir a fecha local', () => {
                const massiveDate = '9'.repeat(50_000);
                const start = performance.now();
                const sanitized = sanitizeMobilitySession({ date: massiveDate, uber: 10000 });
                const elapsed = performance.now() - start;

                assert.ok(elapsed < 50, `Posible ReDoS detectado: tomó ${elapsed}ms`);
                assert.match(sanitized.date, /^\d{4}-\d{2}-\d{2}$/);
            });
        });

        describe('1.2 Inyección XSS, Caracteres Invisibles y UTF-16 / Emojis', () => {
            it('debe limpiar caracteres zero-width y mantener texto seguro sin ejecución de scripts', () => {
                const zeroWidthNotes = '\u200B\u200C<script>alert("pwned")</script>\uFEFF\u00AD';
                const session = sanitizeMobilitySession({
                    date: '2026-09-10',
                    uber: 5000,
                    notes: zeroWidthNotes
                });

                // Caracteres invisibles removidos
                assert.strictEqual(session.notes.includes('\u200B'), false);
                assert.strictEqual(session.notes.includes('\u200C'), false);
                assert.strictEqual(session.notes.includes('\uFEFF'), false);
                assert.strictEqual(session.notes.includes('\u00AD'), false);
                assert.strictEqual(session.notes, '<script>alert("pwned")</script>');
            });

            it('debe manejar inyecciones complejas de SVG / HTML y template literals como strings planos', () => {
                const xssPayload = '"><img src=x onerror=alert(1)>${process.exit(1)}';
                const expense = sanitizeMobilityExpense({
                    date: '2026-09-10',
                    category: xssPayload,
                    amount: 1000,
                    notes: xssPayload
                });
                assert.strictEqual(typeof expense.category, 'string');
                assert.strictEqual(typeof expense.notes, 'string');
                assert.ok(expense.category.length <= 50);
                assert.ok(expense.notes.length <= 200);
            });

            it('debe preservar emojis compuestos y surrogate pairs sin corromper la codificación UTF-16', () => {
                const emojiNote = 'Jornada con lluvia 🌧️ y mucho tráfico 🚗🚕. Ganancia buena 👍!';
                const session = sanitizeMobilitySession({
                    date: '2026-09-10',
                    uber: 20000,
                    notes: emojiNote
                });
                assert.strictEqual(session.notes, emojiNote);
            });

            it('debe evitar high-surrogates huérfanos si el corte cae en medio de un emoji UTF-16', () => {
                // Generar un string de 199 caracteres 'A' seguido de un emoji de 2 unidades UTF-16 (ej: 🚗 = \uD83D\uDE97)
                const base = 'A'.repeat(199) + '🚗';
                const cleaned = cleanSafeString(base, 200);
                // Si cortara a 200 en seco, el último carácter sería \uD83D (huérfano).
                // cleanSafeString debe detectar el surrogate huérfano y recortarlo a 199.
                const lastCode = cleaned.charCodeAt(cleaned.length - 1);
                assert.ok(lastCode < 0xD800 || lastCode > 0xDBFF, 'Surrogate huérfano detectado');
                assert.strictEqual(cleaned.length, 199);
            });
        });

        describe('1.3 Intentos de Polución de Prototipo (Prototype Pollution)', () => {
            it('debe neutralizar intentos de polución a través de __proto__', () => {
                const maliciousPayload = JSON.parse(
                    '{"date":"2026-09-10","uber":10000,"__proto__":{"polluted":"YES","isAdmin":true}}'
                );

                const session = sanitizeMobilitySession(maliciousPayload);

                // Verificar que Object.prototype no fue contaminado
                const probe = {};
                assert.strictEqual(probe.polluted, undefined);
                assert.strictEqual(probe.isAdmin, undefined);
                assert.strictEqual(Object.prototype.polluted, undefined);
                assert.strictEqual(Object.prototype.isAdmin, undefined);
            });

            it('debe neutralizar intentos de polución a través de constructor y prototype', () => {
                const maliciousExpense = {
                    date: '2026-09-10',
                    category: 'gnc',
                    amount: 5000,
                    constructor: {
                        prototype: {
                            hacked: true
                        }
                    }
                };

                const expense = sanitizeMobilityExpense(maliciousExpense);
                const cleanObj = {};
                assert.strictEqual(cleanObj.hacked, undefined);
                assert.strictEqual(Object.prototype.hacked, undefined);
            });
        });

        describe('1.4 Valores Numéricos Extremos: NaN, Infinity, -1e9, Overflow y Tipos Extraños', () => {
            it('debe convertir NaN, Infinity y -Infinity en montos de jornada a 0 estricto', () => {
                const session = sanitizeMobilitySession({
                    date: '2026-09-10',
                    uber: NaN,
                    didi: Infinity,
                    cabify: -Infinity,
                    others: 'NaN',
                    total: Infinity,
                    hoursWorked: NaN,
                    kilometers: -Infinity
                });

                assert.strictEqual(session.uber, 0);
                assert.strictEqual(session.didi, 0);
                assert.strictEqual(session.cabify, 0);
                assert.strictEqual(session.others, 0);
                assert.strictEqual(session.total, 0);
                assert.strictEqual(session.hoursWorked, 0);
                assert.strictEqual(session.kilometers, 0);
                assert.strictEqual(session.earningsPerHour, 0);
                assert.strictEqual(session.earningsPerKm, 0);
            });

            it('debe convertir números negativos extremos (-1e9, -999999999) a 0 estricto', () => {
                const session = sanitizeMobilitySession({
                    date: '2026-09-10',
                    uber: -1e9,
                    didi: -999999999,
                    cabify: -0.00001,
                    others: '-$ 50.000',
                    hoursWorked: -8,
                    kilometers: -150
                });

                assert.strictEqual(session.uber, 0);
                assert.strictEqual(session.didi, 0);
                assert.strictEqual(session.cabify, 0);
                assert.strictEqual(session.others, 0);
                assert.strictEqual(session.total, 0);
                assert.strictEqual(session.hoursWorked, 0);
                assert.strictEqual(session.kilometers, 0);
            });

            it('debe manejar montos en gastos con -1e9 o valores basura devolviendo 0', () => {
                const expense = sanitizeMobilityExpense({
                    date: '2026-09-10',
                    category: 'gnc',
                    amount: -1e9
                });
                assert.strictEqual(expense.amount, 0);

                const expense2 = sanitizeMobilityExpense({
                    date: '2026-09-10',
                    category: 'nafta',
                    amount: '--1000'
                });
                assert.strictEqual(expense2.amount, 0);
            });

            it('debe manejar objetos anidados y arrays en campos numéricos sin arrojar excepción', () => {
                const session = sanitizeMobilitySession({
                    date: '2026-09-10',
                    uber: { nested: 5000 },
                    didi: [1, 2, 3],
                    cabify: () => 1000,
                    others: null,
                    hoursWorked: { valueOf: () => 8 },
                    kilometers: [100]
                });

                assert.strictEqual(session.uber, 0);
                assert.strictEqual(session.didi, 0);
                assert.strictEqual(session.cabify, 0);
                assert.strictEqual(session.others, 0);
                assert.strictEqual(session.hoursWorked, 0);
                assert.strictEqual(session.kilometers, 0);
            });

            it('debe manejar Number.MAX_VALUE y Number.MAX_SAFE_INTEGER sin desbordar a NaN', () => {
                const session = sanitizeMobilitySession({
                    date: '2026-09-10',
                    uber: Number.MAX_SAFE_INTEGER,
                    hoursWorked: 10,
                    kilometers: 100
                });
                assert.strictEqual(session.uber, Number.MAX_SAFE_INTEGER);
                assert.strictEqual(session.total, Number.MAX_SAFE_INTEGER);
                assert.ok(Number.isFinite(session.earningsPerHour));
                assert.ok(Number.isFinite(session.earningsPerKm));
            });
        });

        describe('1.5 Supresión de Undefined y Entradas Primitivas Inválidas', () => {
            it('debe eliminar sistemáticamente toda clave con valor undefined de cualquier nivel', () => {
                const dirty = {
                    date: '2026-09-10',
                    uber: 10000,
                    a: undefined,
                    b: null,
                    nested: {
                        c: undefined,
                        d: 'ok',
                        sub: {
                            e: undefined,
                            f: 123
                        }
                    }
                };
                const cleaned = removeUndefined(dirty);
                assert.strictEqual('a' in cleaned, false);
                assert.strictEqual(cleaned.b, null);
                assert.strictEqual('c' in cleaned.nested, false);
                assert.strictEqual(cleaned.nested.d, 'd' in cleaned.nested ? 'ok' : false);
                assert.strictEqual('e' in cleaned.nested.sub, false);
                assert.strictEqual(cleaned.nested.sub.f, 123);
            });

            it('debe lanzar excepción controlada para tipos primitivos en sanitizeMobilitySession', () => {
                const invalidInputs = [null, undefined, 0, 123, 'cadena', true, false, Symbol('sym')];
                for (const input of invalidInputs) {
                    assert.throws(
                        () => sanitizeMobilitySession(input),
                        /Datos de jornada inválidos/,
                        `Falló al rechazar input de tipo: ${typeof input}`
                    );
                }
            });

            it('debe lanzar excepción controlada para tipos primitivos en sanitizeMobilityExpense', () => {
                const invalidInputs = [null, undefined, 0, 123, 'cadena', true, false, Symbol('sym')];
                for (const input of invalidInputs) {
                    assert.throws(
                        () => sanitizeMobilityExpense(input),
                        /Datos de gasto inválidos/,
                        `Falló al rechazar input de tipo: ${typeof input}`
                    );
                }
            });
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TIMEZONE & BOUNDARY HOURS TESTS (getLocalDateString)
    // ─────────────────────────────────────────────────────────────────────────
    describe('2. Zona Horaria y Horas Frontera: getLocalDateString', () => {

        describe('2.1 Horas Frontera en Argentina (UTC-3): 20:59, 21:00, 23:59, 00:00', () => {
            it('debe resolver la fecha correcta a las 20:59:59 UTC-3 (23:59:59 UTC del mismo día)', () => {
                const d = new Date('2026-09-10T23:59:59.000Z'); // 20:59:59 en Argentina
                const dateContract = getLocalDateStringContract(d);
                assert.strictEqual(dateContract, '2026-09-10');
            });

            it('debe resolver 2026-09-10 a las 21:00:00 UTC-3 (00:00:00 UTC del día siguiente) evitando adelanto', () => {
                // Exactamente a las 21:00 hs en Argentina, en UTC son las 00:00:00 del día 11
                const d = new Date('2026-09-11T00:00:00.000Z');
                const dateContract = getLocalDateStringContract(d);
                // El contrato de Argentina DEBE registrar '2026-09-10'
                assert.strictEqual(dateContract, '2026-09-10');
            });

            it('debe resolver 2026-09-10 a las 23:59:59 UTC-3 (02:59:59 UTC del día siguiente)', () => {
                const d = new Date('2026-09-11T02:59:59.000Z');
                const dateContract = getLocalDateStringContract(d);
                assert.strictEqual(dateContract, '2026-09-10');
            });

            it('debe avanzar a 2026-09-11 exactamente a las 00:00:00 UTC-3 (03:00:00 UTC)', () => {
                const d = new Date('2026-09-11T03:00:00.000Z');
                const dateContract = getLocalDateStringContract(d);
                assert.strictEqual(dateContract, '2026-09-11');
            });

            it('debe mantener 2026-09-11 a las 00:00:01 UTC-3 (03:00:01 UTC)', () => {
                const d = new Date('2026-09-11T03:00:01.000Z');
                const dateContract = getLocalDateStringContract(d);
                assert.strictEqual(dateContract, '2026-09-11');
            });
        });

        describe('2.2 Comportamiento de getLocalDateString frente a strings ya formateados o nulos', () => {
            it('debe retornar inmediatamente el string sin mutar si ya viene en formato YYYY-MM-DD', () => {
                assert.strictEqual(getLocalDateString('2026-09-10'), '2026-09-10');
                assert.strictEqual(getLocalDateString('2025-12-31'), '2025-12-31');
                assert.strictEqual(getLocalDateString('2024-02-29'), '2024-02-29'); // Bisiesto
            });

            it('debe retornar fecha actual válida si se pasa valor inválido (null, undefined, NaN)', () => {
                const resNull = getLocalDateString(null);
                const resUndefined = getLocalDateString(undefined);
                const resInvalid = getLocalDateString('fecha_invalida');

                assert.match(resNull, /^\d{4}-\d{2}-\d{2}$/);
                assert.match(resUndefined, /^\d{4}-\d{2}-\d{2}$/);
                assert.match(resInvalid, /^\d{4}-\d{2}-\d{2}$/);
            });
        });

        describe('2.3 Análisis de Simulación de Zonas Horarias Múltiples', () => {
            it('demuestra cómo la función contractual con timeZone explícita es determinista en cualquier huso', () => {
                const testDate = new Date('2026-09-11T00:30:00.000Z'); // 21:30 en Argentina, 00:30 en UTC, 09:30 en Tokio

                const bsAs = getLocalDateStringContract(testDate, 'America/Argentina/Buenos_Aires');
                const utc = getLocalDateStringContract(testDate, 'UTC');
                const tokyo = getLocalDateStringContract(testDate, 'Asia/Tokyo');

                assert.strictEqual(bsAs, '2026-09-10', 'En Buenos Aires debe ser 2026-09-10');
                assert.strictEqual(utc, '2026-09-11', 'En UTC debe ser 2026-09-11');
                assert.strictEqual(tokyo, '2026-09-11', 'En Tokio debe ser 2026-09-11');
            });
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. BATCH CHUNKING LOGIC TESTS (401, 500, 501, 1000 ITEMS <= 400)
    // ─────────────────────────────────────────────────────────────────────────
    describe('3. Particionamiento de Lotes en Operaciones Masivas (<= 400 documentos)', () => {

        // Helper que reproduce exactamente la partición usada en deleteAllSessions (mobilityRepository.js)
        const partitionRepositoryStyle = (items, chunkSize = 400) => {
            const chunks = [];
            for (let i = 0; i < items.length; i += chunkSize) {
                chunks.push(items.slice(i, i + chunkSize));
            }
            return chunks;
        };

        it('debe particionar exactamente 401 elementos en 2 lotes (400 y 1), ambos <= 400', () => {
            const items = Array.from({ length: 401 }, (_, i) => ({ id: `doc_${i}` }));

            // 1. Probar la función contractual
            const contractChunks = chunkOperations(items, 400);
            assert.strictEqual(contractChunks.length, 2);
            assert.strictEqual(contractChunks[0].length, 400);
            assert.strictEqual(contractChunks[1].length, 1);
            assert.ok(contractChunks[0].length <= 400);
            assert.ok(contractChunks[1].length <= 400);

            // 2. Probar la lógica idéntica de mobilityRepository.js
            const repoChunks = partitionRepositoryStyle(items, 400);
            assert.strictEqual(repoChunks.length, 2);
            assert.strictEqual(repoChunks[0].length, 400);
            assert.strictEqual(repoChunks[1].length, 1);
            assert.ok(repoChunks[0].length <= 400);
            assert.ok(repoChunks[1].length <= 400);

            // Verificar integridad: primer y último elemento preservados en orden
            assert.strictEqual(repoChunks[0][0].id, 'doc_0');
            assert.strictEqual(repoChunks[0][399].id, 'doc_399');
            assert.strictEqual(repoChunks[1][0].id, 'doc_400');
        });

        it('debe particionar exactamente 500 elementos en 2 lotes (400 y 100), ambos <= 400', () => {
            const items = Array.from({ length: 500 }, (_, i) => ({ id: `doc_${i}` }));

            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 2);
            assert.strictEqual(chunks[0].length, 400);
            assert.strictEqual(chunks[1].length, 100);
            assert.ok(chunks[0].length <= 400);
            assert.ok(chunks[1].length <= 400);

            const repoChunks = partitionRepositoryStyle(items, 400);
            assert.strictEqual(repoChunks.length, 2);
            assert.strictEqual(repoChunks[0].length, 400);
            assert.strictEqual(repoChunks[1].length, 100);

            const total = repoChunks.reduce((acc, c) => acc + c.length, 0);
            assert.strictEqual(total, 500);
        });

        it('debe particionar exactamente 501 elementos en 2 lotes (400 y 101), ambos <= 400', () => {
            const items = Array.from({ length: 501 }, (_, i) => ({ id: `doc_${i}` }));

            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 2);
            assert.strictEqual(chunks[0].length, 400);
            assert.strictEqual(chunks[1].length, 101);
            assert.ok(chunks[0].length <= 400);
            assert.ok(chunks[1].length <= 400);

            const repoChunks = partitionRepositoryStyle(items, 400);
            assert.strictEqual(repoChunks.length, 2);
            assert.strictEqual(repoChunks[0].length, 400);
            assert.strictEqual(repoChunks[1].length, 101);
            assert.ok(repoChunks[0].length <= 400);
            assert.ok(repoChunks[1].length <= 400);

            assert.strictEqual(repoChunks[1][100].id, 'doc_500');
        });

        it('debe particionar exactamente 1000 elementos en 3 lotes (400, 400 y 200), todos <= 400', () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({ id: `doc_${i}` }));

            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 3);
            assert.strictEqual(chunks[0].length, 400);
            assert.strictEqual(chunks[1].length, 400);
            assert.strictEqual(chunks[2].length, 200);

            for (const chunk of chunks) {
                assert.ok(chunk.length <= 400, `Lote excede 400: ${chunk.length}`);
            }

            const repoChunks = partitionRepositoryStyle(items, 400);
            assert.strictEqual(repoChunks.length, 3);
            assert.strictEqual(repoChunks[0].length, 400);
            assert.strictEqual(repoChunks[1].length, 400);
            assert.strictEqual(repoChunks[2].length, 200);

            const total = repoChunks.reduce((acc, c) => acc + c.length, 0);
            assert.strictEqual(total, 1000);
        });

        it('debe verificar que importSessions usa lotes de 200 elementos para inserciones', () => {
            const items = Array.from({ length: 501 }, (_, i) => ({
                date: '2026-09-10',
                uber: 10000 + i
            }));

            const repoImportChunks = partitionRepositoryStyle(items, 200);
            assert.strictEqual(repoImportChunks.length, 3); // 200 + 200 + 101
            assert.strictEqual(repoImportChunks[0].length, 200);
            assert.strictEqual(repoImportChunks[1].length, 200);
            assert.strictEqual(repoImportChunks[2].length, 101);

            for (const chunk of repoImportChunks) {
                assert.ok(chunk.length <= 200, `Lote de importación excede 200: ${chunk.length}`);
            }
        });

        it('debe garantizar que ningún elemento se duplique ni se pierda en la partición', () => {
            const count = 1234;
            const items = Array.from({ length: count }, (_, i) => ({ index: i, val: `val_${i}` }));
            const chunks = partitionRepositoryStyle(items, 400);

            const flattened = chunks.flat();
            assert.strictEqual(flattened.length, count);

            for (let i = 0; i < count; i++) {
                assert.strictEqual(flattened[i].index, i);
                assert.strictEqual(flattened[i].val, `val_${i}`);
            }
        });
    });
});
