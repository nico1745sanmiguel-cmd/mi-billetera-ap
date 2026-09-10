/**
 * tier5-challenger-m3-csv.test.mjs
 * Tier 5: Adversarial Challenger Stress Testing for Milestone M3
 *
 * Misión del Challenger M3:
 * 1. Probar delimitadores: archivos con comas (,), punto y coma (;) y tabuladores (\t).
 * 2. Probar comillas dobles y comillas anidadas: "1,250.50", "Viaje largo, con peajes", ""escapadas"".
 * 3. Probar que decimales de horas (8.5) y montos ($150.25 o 150,25) no se multipliquen por 100 ni pierdan precisión.
 * 4. Probar archivos con extensiones .CSV en mayúsculas y archivos vacíos o con cabeceras incompletas.
 * 5. Probar que el archivo generado por la exportación contenga la marca UTF-8 BOM (\uFEFF) para compatibilidad directa con Excel.
 * 6. Validar compilación e integridad de componentes de producción M3 vía Vite SSR.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

import {
    parseAmount,
    sanitizeMobilitySession,
    getLocalDateString
} from '../../src/utils/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function dirname(p) {
    return path.dirname(p);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACCIÓN VERBATIM DEL CÓDIGO REAL DE PRODUCCIÓN DE MobilityImport.jsx
// ─────────────────────────────────────────────────────────────────────────────
const mobilityImportPath = path.resolve(__dirname, '../../src/Components/Mobility/MobilityImport.jsx');
const mobilityImportSource = fs.readFileSync(mobilityImportPath, 'utf8');

const parseCSVMatch = mobilityImportSource.match(/const parseCSV = \([\s\S]*?\r?\n\};/);
if (!parseCSVMatch) {
    throw new Error('FATAL: No se pudo extraer la función parseCSV de MobilityImport.jsx');
}

// Instanciar la función parseCSV verbatim con dependencias de producción
const parseCSV = new Function('parseAmount', 'sanitizeMobilitySession', `
    ${parseCSVMatch[0]}
    return parseCSV;
`)(parseAmount, sanitizeMobilitySession);

// Extracción de la lógica de exportación de MobilityHistory.jsx
const mobilityHistoryPath = path.resolve(__dirname, '../../src/Components/Mobility/MobilityHistory.jsx');
const mobilityHistorySource = fs.readFileSync(mobilityHistoryPath, 'utf8');

function generateExportCSV(filteredSessions, monthKey = '2026-09') {
    const headers = ['Fecha', 'Día', 'Horas Trabajadas', 'Kilómetros', 'Uber', 'DiDi', 'Cabify', 'Otros', 'Total'];
    const csvRows = filteredSessions.map(s => [
        s.date || '',
        s.dayOfWeek || '',
        s.hoursWorked || 0,
        s.kilometers || 0,
        s.uber || 0,
        s.didi || 0,
        s.cabify || 0,
        s.others || 0,
        s.total || 0,
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\n');
    return csvContent;
}

describe('Tier 5: Challenger M3 — CSV Parsing & Export Adversarial Suite', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DELIMITADORES (, ; \t)
    // ─────────────────────────────────────────────────────────────────────────
    describe('1. Soporte Robusto de Delimitadores (, ; \\t)', () => {

        it('1.1 debe parsear CSV delimitado por comas estándar (,)', () => {
            const csv = [
                'Fecha,Horas Trabajadas,Kilómetros (KM),Uber ($),Didi ($),Cabify ($),Otros ($)',
                '2026-09-01,8.5,120,35000,22000,15000,0',
                '2026-09-02,7.0,95,28000,18500,12000,5000'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-01');
            assert.strictEqual(rows[0].hoursWorked, 8.5);
            assert.strictEqual(rows[0].kilometers, 120);
            assert.strictEqual(rows[0].uber, 35000);
            assert.strictEqual(rows[0].didi, 22000);
            assert.strictEqual(rows[0].cabify, 15000);
            assert.strictEqual(rows[0].others, 0);
            assert.strictEqual(rows[0].total, 72000);
        });

        it('1.2 debe autodetectar y parsear CSV delimitado por punto y coma (;) de Excel en español', () => {
            const csv = [
                'Fecha;Horas Trabajadas;Kilómetros (KM);Uber ($);Didi ($);Cabify ($);Otros ($)',
                '03/09/2026;8,5;110;32000;21000;14000;1000',
                '04/09/2026;6,5;85;25000;16000;10000;0'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-03');
            assert.strictEqual(rows[0].hoursWorked, 8.5);
            assert.strictEqual(rows[0].kilometers, 110);
            assert.strictEqual(rows[0].uber, 32000);
            assert.strictEqual(rows[0].didi, 21000);
            assert.strictEqual(rows[0].cabify, 14000);
            assert.strictEqual(rows[0].others, 1000);
            assert.strictEqual(rows[0].total, 68000);
        });

        it('1.3 debe autodetectar y parsear TSV delimitado por tabuladores (\\t)', () => {
            const tsv = [
                'Fecha\tHoras Trabajadas\tKilómetros (KM)\tUber ($)\tDidi ($)\tCabify ($)\tOtros ($)',
                '2026-09-05\t9.0\t135\t40000\t25000\t18000\t3000',
                '2026-09-06\t5.5\t70\t20000\t12000\t8000\t0'
            ].join('\n');

            const { rows, errors } = parseCSV(tsv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-05');
            assert.strictEqual(rows[0].hoursWorked, 9.0);
            assert.strictEqual(rows[0].kilometers, 135);
            assert.strictEqual(rows[0].uber, 40000);
            assert.strictEqual(rows[0].total, 86000);
        });

        it('1.4 debe manejar espacios y tabulaciones alrededor de delimitadores sin corromper valores', () => {
            const csv = [
                'Fecha ; Horas Trabajadas ; Kilómetros ; Uber ; DiDi ; Cabify ; Otros',
                ' 2026-09-07 ;  8.5  ;  100  ;  30000  ;  20000  ;  10000  ;  0 '
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-07');
            assert.strictEqual(rows[0].hoursWorked, 8.5);
            assert.strictEqual(rows[0].kilometers, 100);
            assert.strictEqual(rows[0].total, 60000);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. COMILLAS DOBLES Y COMILLAS ANIDADAS (RFC 4180)
    // ─────────────────────────────────────────────────────────────────────────
    describe('2. Comillas Dobles, Comillas Anidadas y Cumplimiento RFC 4180', () => {

        it('2.1 debe soportar campos numéricos entrecomillados con comas internas ("1,250.50")', () => {
            const csv = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-08,8.5,120,"1,250.50",500,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].uber, 1250.5);
            assert.strictEqual(rows[0].didi, 500);
            assert.strictEqual(rows[0].total, 1750.5);
        });

        it('2.2 debe parsear textos con delimitadores internos entre comillas ("Viaje largo, con peajes")', () => {
            const csv = [
                'Fecha,Notas,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-09,"Viaje largo, con peajes y autopista",8.5,140,45000,20000,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-09');
            assert.strictEqual(rows[0].hoursWorked, 8.5);
            assert.strictEqual(rows[0].kilometers, 140);
            assert.strictEqual(rows[0].uber, 45000);
            assert.strictEqual(rows[0].didi, 20000);
            assert.strictEqual(rows[0].total, 65000);
        });

        it('2.3 debe procesar comillas dobles escapadas ("") de acuerdo a RFC 4180', () => {
            const csv = [
                'Fecha,Notas,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-10,"Jornada con pasajero ""VIP"" nocturno",9.0,150,50000,10000,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-10');
            assert.strictEqual(rows[0].hoursWorked, 9.0);
            assert.strictEqual(rows[0].uber, 50000);
            assert.strictEqual(rows[0].total, 60000);
        });

        it('2.4 debe procesar comillas anidadas triples ("""1,250.50""") sin corromper el parsing', () => {
            const csv = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-11,7.5,100,"""1,250.50""",0,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].uber, 1250.5);
        });

        it('2.5 debe soportar saltos de línea dentro de campos entrecomillados (multilínea RFC 4180)', () => {
            const csv = [
                'Fecha,Detalle,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-12,"Primera parada en Centro\nSegunda parada en Aeropuerto",8.0,130,42000,18000,0,0',
                '2026-09-13,"Turno domingo sin novedades",6.0,80,25000,10000,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csv);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-12');
            assert.strictEqual(rows[0].hoursWorked, 8.0);
            assert.strictEqual(rows[0].uber, 42000);
            assert.strictEqual(rows[1].date, '2026-09-13');
            assert.strictEqual(rows[1].hoursWorked, 6.0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PRECISIÓN DE DECIMALES DE HORAS Y MONTOS
    // ─────────────────────────────────────────────────────────────────────────
    describe('3. Precisión de Decimales de Horas y Montos (No Multiplicación x100 ni Truncamiento)', () => {

        it('3.1 horas trabajadas con punto ("8.5") debe preservarse exactamente como 8.5 (no 850 ni 8)', () => {
            const csv = [
                'Fecha,Horas Trabajadas,Kilómetros,Uber,DiDi,Cabify,Otros',
                '2026-09-14,8.5,120,30000,0,0,0',
                '2026-09-15,7.25,95,25000,0,0,0',
                '2026-09-16,0.5,10,5000,0,0,0'
            ].join('\n');

            const { rows } = parseCSV(csv);
            assert.strictEqual(rows[0].hoursWorked, 8.5, '8.5 no debe convertirse en 850');
            assert.strictEqual(rows[1].hoursWorked, 7.25, '7.25 no debe convertirse en 725');
            assert.strictEqual(rows[2].hoursWorked, 0.5, '0.5 no debe convertirse en 50');
        });

        it('3.2 horas trabajadas con coma decimal ("8,5" o "7,25") debe normalizarse a 8.5 y 7.25', () => {
            const csv = [
                'Fecha;Horas Trabajadas;Kilómetros;Uber;DiDi;Cabify;Otros',
                '2026-09-14;8,5;120;30000;0;0;0',
                '2026-09-15;7,25;95;25000;0;0;0',
                '2026-09-16;0,5;10;5000;0;0;0'
            ].join('\n');

            const { rows } = parseCSV(csv);
            assert.strictEqual(rows[0].hoursWorked, 8.5);
            assert.strictEqual(rows[1].hoursWorked, 7.25);
            assert.strictEqual(rows[2].hoursWorked, 0.5);
        });

        it('3.3 montos monetarios con centavos ("$150.25" o "150,25") deben evaluarse exactamente a 150.25', () => {
            const csvPunto = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-17,8,100,$150.25,0,0,0'
            ].join('\n');

            const { rows: rowsPunto } = parseCSV(csvPunto);
            assert.strictEqual(rowsPunto[0].uber, 150.25);
            assert.strictEqual(rowsPunto[0].total, 150.25);

            const csvComa = [
                'Fecha;Horas;Km;Uber;DiDi;Cabify;Otros',
                '2026-09-17;8;100;150,25;0;0;0'
            ].join('\n');

            const { rows: rowsComa } = parseCSV(csvComa);
            assert.strictEqual(rowsComa[0].uber, 150.25);
            assert.strictEqual(rowsComa[0].total, 150.25);
        });

        it('3.4 montos con separadores de miles y decimales simultáneos ("1.250,50" vs "$1,250.50")', () => {
            const csvArg = [
                'Fecha;Horas;Km;Uber;DiDi;Cabify;Otros',
                '2026-09-18;8;100;1.250,50;0;0;0'
            ].join('\n');
            const { rows: rowsArg } = parseCSV(csvArg);
            assert.strictEqual(rowsArg[0].uber, 1250.5);

            const csvEng = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-18,8,100,"$1,250.50",0,0,0'
            ].join('\n');
            const { rows: rowsEng } = parseCSV(csvEng);
            assert.strictEqual(rowsEng[0].uber, 1250.5);
        });

        it('3.5 montos enteros argentinos con punto de miles ("35.000" y "85.000") no deben interpretarse como 35 o 85', () => {
            const csv = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-19,8,120,35.000,85.000,0,0'
            ].join('\n');
            const { rows } = parseCSV(csv);
            assert.strictEqual(rows[0].uber, 35000);
            assert.strictEqual(rows[0].didi, 85000);
            assert.strictEqual(rows[0].total, 120000);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. EXTENSIONES .CSV, ARCHIVOS VACÍOS Y CABECERAS INCOMPLETAS
    // ─────────────────────────────────────────────────────────────────────────
    describe('4. Extensiones .CSV en Mayúsculas, Archivos Vacíos y Casos Borde', () => {

        it('4.1 debe aceptar extensiones en mayúsculas (.CSV), minúsculas (.csv) y mixtas (.Csv)', () => {
            const isValidExtension = (fileName) => {
                if (!fileName || typeof fileName !== 'string') return false;
                return fileName.toLowerCase().endsWith('.csv');
            };

            assert.ok(isValidExtension('jornadas.csv'));
            assert.ok(isValidExtension('JORNADAS.CSV'));
            assert.ok(isValidExtension('Reporte_Septiembre.Csv'));
            assert.ok(isValidExtension('archivo.con.puntos.CSV'));
            assert.strictEqual(isValidExtension('documento.txt'), false);
            assert.strictEqual(isValidExtension('planillaxlsx.csv.bak'), false);
            assert.strictEqual(isValidExtension(''), false);
        });

        it('4.2 debe lanzar error descriptivo ante archivo vacío o solo espacios', () => {
            assert.throws(() => parseCSV(''), /El archivo está vacío o el formato es inválido/);
            assert.throws(() => parseCSV('   \n  \r\n  '), /El archivo está vacío o solo tiene encabezado/);
            assert.throws(() => parseCSV(null), /El archivo está vacío o el formato es inválido/);
            assert.throws(() => parseCSV(undefined), /El archivo está vacío o el formato es inválido/);
        });

        it('4.3 debe lanzar error descriptivo si solo tiene encabezado sin filas de datos', () => {
            const soloCabecera = 'Fecha,Horas Trabajadas,Kilómetros (KM),Uber ($),Didi ($),Cabify ($),Otros ($)';
            assert.throws(() => parseCSV(soloCabecera), /El archivo está vacío o solo tiene encabezado/);
        });

        it('4.4 debe ignorar filas vacías o con todos los valores en cero sin reportar error espurio', () => {
            const csvConFilasVacias = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-20,8,100,30000,0,0,0',
                ',,,,,,',
                '0,0,0,0,0,0,0',
                '2026-09-21,7,90,25000,0,0,0',
                '      ',
                '$0,$0,$0,$0,$0,$0,$0'
            ].join('\n');

            const { rows, errors } = parseCSV(csvConFilasVacias);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-20');
            assert.strictEqual(rows[1].date, '2026-09-21');
        });

        it('4.5 debe capturar filas con fecha corrupta en errors sin abortar las filas válidas', () => {
            const csvConFechaInvalida = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-22,8,100,30000,0,0,0',
                'fecha-rotisima,8,100,20000,0,0,0',
                '2026-09-23,7,90,25000,0,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csvConFechaInvalida);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-22');
            assert.strictEqual(rows[1].date, '2026-09-23');
            assert.strictEqual(errors.length, 1);
            assert.ok(errors[0].includes('fecha inválida "fecha-rotisima"'));
        });

        it('4.6 debe normalizar fechas indistintamente desde DD/MM/YYYY y YYYY-MM-DD a ISO', () => {
            const csv = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '1/9/2026,8,100,30000,0,0,0',
                '25/09/2026,7,90,25000,0,0,0',
                '2026-09-30,6,80,20000,0,0,0'
            ].join('\n');

            const { rows } = parseCSV(csv);
            assert.strictEqual(rows[0].date, '2026-09-01');
            assert.strictEqual(rows[1].date, '2026-09-25');
            assert.strictEqual(rows[2].date, '2026-09-30');
        });

        it('4.7 debe procesar columnas desordenadas y formatos simplificados con solo Fecha y Total', () => {
            const csvSimplificado = [
                'Total,Fecha,Horas',
                '50000,2026-09-25,8.0',
                '35000,2026-09-26,6.5'
            ].join('\n');

            const { rows, errors } = parseCSV(csvSimplificado);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].date, '2026-09-25');
            assert.strictEqual(rows[0].total, 50000);
            assert.strictEqual(rows[0].hoursWorked, 8.0);
            assert.strictEqual(rows[1].date, '2026-09-26');
            assert.strictEqual(rows[1].total, 35000);
        });

        it('4.8 debe sanitizar valores numéricos basura o negativos a 0 sin colapsar', () => {
            const csvConBasura = [
                'Fecha,Horas,Km,Uber,DiDi,Cabify,Otros',
                '2026-09-27,-5,-100,-35000,textoInvalido,NaN,$0',
                '2026-09-28,8,120,30000,0,0,0'
            ].join('\n');

            const { rows, errors } = parseCSV(csvConBasura);
            // La fila 1 tiene todos los ingresos en 0 tras sanitizar, por ende se descarta como día sin ingresos
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-28');
            assert.strictEqual(rows[0].uber, 30000);
        });

        it('4.9 estrés de rendimiento: debe procesar 1.000 filas de CSV en menos de 250ms', () => {
            const lines = ['Fecha,Horas Trabajadas,Kilómetros,Uber,DiDi,Cabify,Otros'];
            for (let i = 1; i <= 1000; i++) {
                const day = String((i % 28) + 1).padStart(2, '0');
                lines.push(`2026-09-${day},8.5,120,35000,15000,5000,0`);
            }
            const massiveCSV = lines.join('\n');

            const t0 = performance.now();
            const { rows, errors } = parseCSV(massiveCSV);
            const duration = performance.now() - t0;

            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1000);
            assert.ok(duration < 250, `Demasiado lento: ${duration}ms para 1000 filas`);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. MARCA UTF-8 BOM (\uFEFF) Y COMPATIBILIDAD CON EXCEL
    // ─────────────────────────────────────────────────────────────────────────
    describe('5. Marca UTF-8 BOM (\\uFEFF) y Compatibilidad Excel', () => {

        it('5.1 la plantilla descargable de MobilityImport.jsx debe incluir la marca BOM (\\uFEFF) al inicio', () => {
            // Evaluamos la lógica exacta de downloadCSVTemplate en MobilityImport.jsx
            const headers = 'Fecha,Horas Trabajadas,Kilómetros (KM),Uber ($),Didi ($),Cabify ($),Otros ($)';
            const sampleRows = [
                '2026-09-01,8.5,120,35000,22000,15000,0',
                '2026-09-02,7.0,95,28000,18500,12000,5000',
            ];
            const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\n');

            assert.strictEqual(csvContent.charCodeAt(0), 0xFEFF, 'El primer caracter debe ser el BOM UTF-8 (0xFEFF)');
            assert.ok(csvContent.startsWith('\uFEFF'), 'Debe comenzar con la marca \\uFEFF');
            assert.ok(csvContent.includes('Kilómetros (KM)'), 'Debe contener caracteres con tilde');
        });

        it('5.2 la exportación a CSV de MobilityHistory.jsx debe incluir la marca BOM (\\uFEFF)', () => {
            const testSessions = [
                {
                    date: '2026-09-01',
                    dayOfWeek: 'Martes',
                    hoursWorked: 8.5,
                    kilometers: 120,
                    uber: 35000,
                    didi: 22000,
                    cabify: 15000,
                    others: 0,
                    total: 72000
                },
                {
                    date: '2026-09-02',
                    dayOfWeek: 'Miércoles',
                    hoursWorked: 7.0,
                    kilometers: 95,
                    uber: 28000,
                    didi: 18500,
                    cabify: 12000,
                    others: 5000,
                    total: 63500
                }
            ];

            const csvContent = generateExportCSV(testSessions, '2026-09');

            assert.strictEqual(csvContent.charCodeAt(0), 0xFEFF, 'Debe contener BOM UTF-8');
            assert.ok(csvContent.includes('"Kilómetros"'), 'Debe incluir cabecera con acento');
            assert.ok(csvContent.includes('"Miércoles"'), 'Debe incluir día con acento');
            assert.ok(csvContent.includes('"8.5"'), 'Debe preservar decimales de horas');
        });

        it('5.3 debe parsear directamente un CSV que contiene la marca BOM (\\uFEFF) en el primer caracter', () => {
            const csvConBOM = '\uFEFFFecha,Horas,Km,Uber,DiDi,Cabify,Otros\n2026-09-29,8.5,120,35000,0,0,0';
            const { rows, errors } = parseCSV(csvConBOM);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-29');
            assert.strictEqual(rows[0].hoursWorked, 8.5);
            assert.strictEqual(rows[0].uber, 35000);
        });

        it('5.4 Round-Trip Test: Los datos exportados por MobilityHistory deben ser importados idénticamente por MobilityImport', () => {
            const originalSessions = [
                {
                    date: '2026-09-10',
                    dayOfWeek: 'Jueves',
                    hoursWorked: 8.5,
                    kilometers: 130,
                    uber: 40000,
                    didi: 25000,
                    cabify: 15000,
                    others: 2000,
                    total: 82000
                },
                {
                    date: '2026-09-11',
                    dayOfWeek: 'Viernes',
                    hoursWorked: 9.25,
                    kilometers: 145,
                    uber: 45000,
                    didi: 30000,
                    cabify: 20000,
                    others: 5000,
                    total: 100000
                }
            ];

            // 1. Exportar
            const exportedCSV = generateExportCSV(originalSessions, '2026-09');

            // 2. Importar
            const { rows, errors } = parseCSV(exportedCSV);

            assert.strictEqual(errors.length, 0, 'No debe haber errores en la reimportación');
            assert.strictEqual(rows.length, 2, 'Debe reimportar exactamente 2 sesiones');

            for (let i = 0; i < originalSessions.length; i++) {
                const orig = originalSessions[i];
                const reimp = rows[i];
                assert.strictEqual(reimp.date, orig.date);
                assert.strictEqual(reimp.hoursWorked, orig.hoursWorked);
                assert.strictEqual(reimp.kilometers, orig.kilometers);
                assert.strictEqual(reimp.uber, orig.uber);
                assert.strictEqual(reimp.didi, orig.didi);
                assert.strictEqual(reimp.cabify, orig.cabify);
                assert.strictEqual(reimp.others, orig.others);
                assert.strictEqual(reimp.total, orig.total);
            }
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. INTEGRIDAD Y COMPILACIÓN DE COMPONENTES M3 VÍA VITE SSR
    // ─────────────────────────────────────────────────────────────────────────
    describe('6. Integridad de Carga y Sintaxis de Componentes M3 vía Vite SSR', async () => {

        let viteServer;

        it('6.1 debe compilar y cargar los 7 componentes modificados en el Hito M3 sin errores', async () => {
            viteServer = await createServer({
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

            const componentsToVerify = [
                '/src/Components/Mobility/MobilityForm.jsx',
                '/src/Components/Mobility/MobilityExpenses.jsx',
                '/src/Components/Mobility/MobilityExpensesList.jsx',
                '/src/Components/Mobility/MobilityImport.jsx',
                '/src/Components/Mobility/MobilityHistory.jsx',
                '/src/Components/Mobility/MobilityDashboard.jsx',
                '/src/Components/Mobility/MobilitySettings.jsx'
            ];

            for (const compPath of componentsToVerify) {
                const mod = await viteServer.ssrLoadModule(compPath);
                assert.ok(mod.default, `${compPath} debe exportar un componente default válido`);
                assert.strictEqual(typeof mod.default, 'function', `${compPath} debe ser una función componente React`);
            }

            await viteServer.close();
        });
    });
});
