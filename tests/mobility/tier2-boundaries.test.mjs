/**
 * tier2-boundaries.test.mjs
 * Tier 2: Boundary & Corner Cases (Casos límite, valores extremos y robustez)
 *
 * Cobertura de condiciones de frontera:
 * 1. Valores vacíos (strings vacíos, objetos vacíos, null, arrays vacíos)
 * 2. Campos y valores undefined
 * 3. Protección contra NaN e Infinity
 * 4. Valores numéricos negativos
 * 5. Fechas de fin de mes, bisiestos y desbordamiento de calendarios
 * 6. Delimitadores CSV (, y ;), comillas escapadas y celdas vacías
 * 7. Lotes y particionamiento Firestore de más de 500 documentos
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    sanitizeMobilitySession,
    sanitizeMobilityExpense,
    parseAmount,
    chunkOperations,
    parseMobilityCSV,
    getSafePrevMonthDate
} from './mobilityContracts.mjs';

describe('Tier 2: Boundary & Corner Cases', () => {

    // ─── 1. VALORES VACÍOS ───────────────────────────────────────────────────
    describe('1. Manejo de Valores Vacíos', () => {
        it('debe generar una jornada por defecto segura al recibir un objeto vacío {}', () => {
            const result = sanitizeMobilitySession({});
            assert.strictEqual(result.uber, 0);
            assert.strictEqual(result.didi, 0);
            assert.strictEqual(result.cabify, 0);
            assert.strictEqual(result.others, 0);
            assert.strictEqual(result.total, 0);
            assert.strictEqual(result.hoursWorked, 0);
            assert.strictEqual(result.kilometers, 0);
            assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
            assert.ok(result.dayOfWeek);
        });

        it('debe lanzar Error descriptivo al recibir null o tipos no-objeto en sanitizeMobilitySession', () => {
            assert.throws(() => sanitizeMobilitySession(null), /Datos de jornada inválidos/);
            assert.throws(() => sanitizeMobilitySession('string-invalido'), /Datos de jornada inválidos/);
            assert.throws(() => sanitizeMobilityExpense(null), /Datos de gasto inválidos/);
        });

        it('debe generar un gasto seguro con monto 0 y categoría "varios" al recibir un objeto vacío en sanitizeMobilityExpense', () => {
            const result = sanitizeMobilityExpense({});
            assert.strictEqual(result.amount, 0);
            assert.strictEqual(result.category, 'varios');
            assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
            assert.strictEqual(result.notes, '');
        });

        it('debe manejar strings vacíos en parseAmount devolviendo 0', () => {
            assert.strictEqual(parseAmount(''), 0);
            assert.strictEqual(parseAmount('   '), 0);
            assert.strictEqual(parseAmount('\t\n'), 0);
        });

        it('debe retornar array vacío al procesar lista vacía de operaciones en chunkOperations', () => {
            assert.deepStrictEqual(chunkOperations([]), []);
            assert.deepStrictEqual(chunkOperations(null), []);
            assert.deepStrictEqual(chunkOperations(undefined), []);
        });
    });

    // ─── 2. VALORES UNDEFINED ────────────────────────────────────────────────
    describe('2. Manejo de Valores Undefined', () => {
        it('debe eliminar propiedades explícitamente undefined del objeto de sesión resultante', () => {
            const raw = {
                date: '2026-09-10',
                uber: 20000,
                extraProperty: undefined,
                anotherUndefined: undefined
            };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(Object.prototype.hasOwnProperty.call(result, 'extraProperty'), false);
            assert.strictEqual(Object.prototype.hasOwnProperty.call(result, 'anotherUndefined'), false);
        });

        it('debe admitir campos opcionales ausentes sin fallar ni dejar undefined', () => {
            const raw = { uber: 10000 };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.didi, 0);
            assert.strictEqual(result.cabify, 0);
            assert.strictEqual(result.others, 0);
            assert.strictEqual(result.hoursWorked, 0);
            assert.strictEqual(result.kilometers, 0);
            assert.strictEqual(Object.values(result).includes(undefined), false);
        });

        it('debe retornar 0 en parseAmount cuando el argumento es undefined', () => {
            assert.strictEqual(parseAmount(undefined), 0);
        });

        it('debe asignar categoría por defecto ("varios") y notas vacías si son undefined en gastos', () => {
            const raw = { date: '2026-09-10', amount: 5000, category: undefined, notes: undefined };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.category, 'varios');
            assert.strictEqual(result.notes, '');
            assert.strictEqual(Object.values(result).includes(undefined), false);
        });

        it('debe rellenar la fecha con fecha local si data.date es undefined', () => {
            const raw = { date: undefined, uber: 15000 };
            const result = sanitizeMobilitySession(raw);
            assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
            assert.strictEqual(result.date !== 'undefined', true);
        });
    });

    // ─── 3. PROTECCIÓN CONTRA NaN E INFINITY ───────────────────────────────────
    describe('3. Protección contra NaN e Infinity', () => {
        it('debe convertir NaN a 0 en parseAmount', () => {
            assert.strictEqual(parseAmount(NaN), 0);
            assert.strictEqual(parseAmount('NaN'), 0);
            assert.strictEqual(parseAmount('texto-no-numerico'), 0);
        });

        it('debe convertir Infinity y -Infinity a 0 en parseAmount', () => {
            assert.strictEqual(parseAmount(Infinity), 0);
            assert.strictEqual(parseAmount(-Infinity), 0);
            assert.strictEqual(parseAmount('Infinity'), 0);
            assert.strictEqual(parseAmount('-Infinity'), 0);
        });

        it('debe prevenir que 1 / 0 genere Infinity en earningsPerHour si horas es 0', () => {
            const raw = { date: '2026-09-10', uber: 50000, hoursWorked: 0 };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(Number.isFinite(result.earningsPerHour), true);
            assert.strictEqual(result.earningsPerHour, 0);
        });

        it('debe prevenir que 1 / 0 genere Infinity en earningsPerKm si kilómetros es 0', () => {
            const raw = { date: '2026-09-10', uber: 50000, kilometers: 0 };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(Number.isFinite(result.earningsPerKm), true);
            assert.strictEqual(result.earningsPerKm, 0);
        });

        it('debe sanitizar montos con caracteres corruptos o divisiones inválidas en gastos', () => {
            const raw = { date: '2026-09-10', amount: 0 / 0, category: 'repuestos' };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.amount, 0);
            assert.strictEqual(Number.isFinite(result.amount), true);
        });
    });

    // ─── 4. VALORES NUMÉRICOS NEGATIVOS ──────────────────────────────────────
    describe('4. Tratamiento de Valores Negativos', () => {
        it('debe convertir ingresos negativos de cualquier plataforma a 0', () => {
            const raw = {
                date: '2026-09-10',
                uber: -15000,
                didi: -5000,
                cabify: 20000,
                others: -2000
            };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.uber, 0);
            assert.strictEqual(result.didi, 0);
            assert.strictEqual(result.cabify, 20000);
            assert.strictEqual(result.others, 0);
            assert.strictEqual(result.total, 20000);
        });

        it('debe convertir horas trabajadas negativas a 0', () => {
            const raw = { date: '2026-09-10', uber: 20000, hoursWorked: -8 };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.hoursWorked, 0);
            assert.strictEqual(result.earningsPerHour, 0);
        });

        it('debe convertir kilómetros negativos a 0', () => {
            const raw = { date: '2026-09-10', uber: 20000, kilometers: -120 };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.kilometers, 0);
            assert.strictEqual(result.earningsPerKm, 0);
        });

        it('debe forzar montos negativos en gastos a 0', () => {
            const raw = { date: '2026-09-10', amount: -9500, category: 'gnc' };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.amount, 0);
        });

        it('debe parsear cadenas con signos negativos ("-$ 5000") devolviendo 0', () => {
            assert.strictEqual(parseAmount('-$ 5000'), 0);
            assert.strictEqual(parseAmount('- 1250,50'), 0);
            assert.strictEqual(parseAmount(' -85.000 '), 0);
        });
    });

    // ─── 5. FECHAS DE FIN DE MES Y CALENDARIO ─────────────────────────────────
    describe('5. Fechas de Fin de Mes, Bisiestos y Límites de Calendario', () => {
        it('debe calcular el mes anterior de 31 de Marzo ajustando a 28 de Febrero en año no bisiesto', () => {
            // 2025 no es bisiesto -> Feb tiene 28 días
            const march31 = new Date(2025, 2, 31); // Mes 2 es Marzo en JS
            const prev = getSafePrevMonthDate(march31);
            assert.strictEqual(prev.getFullYear(), 2025);
            assert.strictEqual(prev.getMonth(), 1); // Mes 1 es Febrero
            assert.strictEqual(prev.getDate(), 28);
        });

        it('debe calcular el mes anterior de 31 de Marzo ajustando a 29 de Febrero en año bisiesto', () => {
            // 2024 es bisiesto -> Feb tiene 29 días
            const march31 = new Date(2024, 2, 31);
            const prev = getSafePrevMonthDate(march31);
            assert.strictEqual(prev.getFullYear(), 2024);
            assert.strictEqual(prev.getMonth(), 1);
            assert.strictEqual(prev.getDate(), 29);
        });

        it('debe calcular el mes anterior de 31 de Mayo ajustando a 30 de Abril', () => {
            const may31 = new Date(2026, 4, 31); // Mayo
            const prev = getSafePrevMonthDate(may31);
            assert.strictEqual(prev.getMonth(), 3); // Abril
            assert.strictEqual(prev.getDate(), 30);
        });

        it('debe retroceder de año correctamente al calcular el mes anterior de Enero (15 de Enero -> 15 de Diciembre)', () => {
            const jan15 = new Date(2026, 0, 15);
            const prev = getSafePrevMonthDate(jan15);
            assert.strictEqual(prev.getFullYear(), 2025);
            assert.strictEqual(prev.getMonth(), 11); // Diciembre
            assert.strictEqual(prev.getDate(), 15);
        });

        it('debe manejar el 31 de Enero retrocediendo a 31 de Diciembre del año previo', () => {
            const jan31 = new Date(2026, 0, 31);
            const prev = getSafePrevMonthDate(jan31);
            assert.strictEqual(prev.getFullYear(), 2025);
            assert.strictEqual(prev.getMonth(), 11);
            assert.strictEqual(prev.getDate(), 31);
        });
    });

    // ─── 6. DELIMITADORES CSV Y COMILLAS ─────────────────────────────────────
    describe('6. Delimitadores CSV, Comillas y RFC 4180', () => {
        it('debe parsear CSV delimitado por comas estándar (,)', () => {
            const csv = `Fecha,Horas,Kilometros,Uber,Didi,Cabify,Otros\n2026-09-01,8,120,30000,10000,0,0`;
            const { rows, errors } = parseMobilityCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].uber, 30000);
            assert.strictEqual(rows[0].didi, 10000);
            assert.strictEqual(rows[0].hoursWorked, 8);
        });

        it('debe autodetectar y parsear CSV delimitado por punto y coma (;) de Excel en español', () => {
            const csv = `Fecha;Horas;Kilómetros;Uber;Didi;Cabify;Otros\n01/09/2026;7,5;110;25.000;15.000;0;0`;
            const { rows, errors } = parseMobilityCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-01');
            assert.strictEqual(rows[0].hoursWorked, 7.5); // Preserva decimal 7.5
            assert.strictEqual(rows[0].uber, 25000);
            assert.strictEqual(rows[0].didi, 15000);
        });

        it('debe respetar comas dentro de campos entre comillas (RFC 4180)', () => {
            const csv = `Fecha,Horas,Kilometros,Uber,Didi,Cabify,Otros\n2026-09-02,8,150,"35,000.50",10000,0,0`;
            const { rows, errors } = parseMobilityCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].uber, 35000.50);
        });

        it('debe ignorar filas vacías o con todos los valores en cero', () => {
            const csv = `Fecha,Horas,Kilometros,Uber,Didi,Cabify,Otros\n2026-09-01,0,0,0,0,0,0\n2026-09-02,8,100,20000,0,0,0\n,,,,,,`;
            const { rows, errors } = parseMobilityCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-02');
        });

        it('debe reportar error para filas con fecha inválida sin interrumpir el resto del archivo', () => {
            const csv = `Fecha,Horas,Kilometros,Uber,Didi,Cabify,Otros\nFECHA_ROTA,8,100,20000,0,0,0\n2026-09-03,6,80,15000,0,0,0`;
            const { rows, errors } = parseMobilityCSV(csv);
            assert.strictEqual(errors.length, 1);
            assert.match(errors[0], /fecha inválida/i);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-03');
        });
    });

    // ─── 7. PARTICIONAMIENTO EN CHUNKS (>500 DOCUMENTOS FIRESTORE) ───────────
    describe('7. Particionamiento en Chunks (Límite Firestore 500 docs)', () => {
        it('debe mantener una lista de 400 elementos en un único lote', () => {
            const items = Array.from({ length: 400 }, (_, i) => ({ id: `doc_${i}` }));
            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 1);
            assert.strictEqual(chunks[0].length, 400);
        });

        it('debe particionar 501 elementos en exactamente 2 lotes (400 y 101)', () => {
            const items = Array.from({ length: 501 }, (_, i) => ({ id: `doc_${i}` }));
            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 2);
            assert.strictEqual(chunks[0].length, 400);
            assert.strictEqual(chunks[1].length, 101);
            // Ningún lote debe superar el límite estricto de Firestore (500)
            assert.ok(chunks[0].length <= 500);
            assert.ok(chunks[1].length <= 500);
        });

        it('debe particionar 1000 elementos en 3 lotes (400, 400, 200)', () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({ id: `doc_${i}` }));
            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 3);
            assert.strictEqual(chunks[0].length, 400);
            assert.strictEqual(chunks[1].length, 400);
            assert.strictEqual(chunks[2].length, 200);
            const totalElements = chunks.reduce((acc, c) => acc + c.length, 0);
            assert.strictEqual(totalElements, 1000);
        });

        it('debe forzar el límite máximo a 500 si se solicita un tamaño mayor (ej: 600)', () => {
            const items = Array.from({ length: 1200 }, (_, i) => ({ id: `doc_${i}` }));
            // Solicita chunkSize de 600, pero la función debe limitarlo a 500
            const chunks = chunkOperations(items, 600);
            for (const c of chunks) {
                assert.ok(c.length <= 500, `Lote excede 500: longitud ${c.length}`);
            }
            assert.strictEqual(chunks.length, 3); // 500 + 500 + 200
        });

        it('debe manejar 1 solo elemento retornando 1 lote con 1 elemento', () => {
            const items = [{ id: 'doc_unico' }];
            const chunks = chunkOperations(items, 400);
            assert.strictEqual(chunks.length, 1);
            assert.strictEqual(chunks[0].length, 1);
            assert.strictEqual(chunks[0][0].id, 'doc_unico');
        });
    });
});
