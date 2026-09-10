/**
 * testTimezones.mjs
 * Test exhaustivo de getLocalDateString frente a diferentes zonas horarias y horas frontera
 */
import { getLocalDateString } from '../../src/utils/security.js';
import { getLocalDateString as getLocalDateStringContract } from './mobilityContracts.mjs';

console.log('=== TEST DE ZONAS HORARIAS Y HORAS FRONTERA ===');

// 1. Horas frontera en Argentina (UTC-3)
// 21:00 hs Argentina = 00:00 UTC (día siguiente)
// 23:59 hs Argentina = 02:59 UTC (día siguiente)
// 00:00 hs Argentina = 03:00 UTC (mismo día en UTC)

const testCases = [
    { label: 'Tarde (18:00 UTC-3 / 21:00 UTC)', utcStr: '2026-09-10T21:00:00.000Z', expectedBsAs: '2026-09-10' },
    { label: 'Frontera 20:59:59 UTC-3 / 23:59:59 UTC', utcStr: '2026-09-10T23:59:59.000Z', expectedBsAs: '2026-09-10' },
    { label: 'Frontera exacta 21:00:00 UTC-3 / 00:00:00 UTC', utcStr: '2026-09-11T00:00:00.000Z', expectedBsAs: '2026-09-10' },
    { label: 'Frontera 23:59:59 UTC-3 / 02:59:59 UTC', utcStr: '2026-09-11T02:59:59.000Z', expectedBsAs: '2026-09-10' },
    { label: 'Frontera exacta 00:00:00 UTC-3 / 03:00:00 UTC', utcStr: '2026-09-11T03:00:00.000Z', expectedBsAs: '2026-09-11' },
    { label: 'Madrugada 03:30:00 UTC-3 / 06:30:00 UTC', utcStr: '2026-09-11T06:30:00.000Z', expectedBsAs: '2026-09-11' },
];

console.log('\n--- 1. Pruebas con hora local del sistema actual (getLocalDateString) ---');
for (const tc of testCases) {
    const d = new Date(tc.utcStr);
    const actual = getLocalDateString(d);
    console.log(`${tc.label}:`);
    console.log(`  UTC: ${tc.utcStr} -> Resultado: ${actual} (Esperado BsAs: ${tc.expectedBsAs})`);
    if (actual !== tc.expectedBsAs) {
        console.warn(`  [ALERTA] Diferencia detectada: ${actual} vs ${tc.expectedBsAs}`);
    }
}

console.log('\n--- 2. Pruebas contractuales forzando America/Argentina/Buenos_Aires ---');
for (const tc of testCases) {
    const d = new Date(tc.utcStr);
    const actual = getLocalDateStringContract(d, 'America/Argentina/Buenos_Aires');
    console.log(`${tc.label}:`);
    console.log(`  UTC: ${tc.utcStr} -> Resultado: ${actual} (Esperado BsAs: ${tc.expectedBsAs})`);
    if (actual !== tc.expectedBsAs) {
        console.error(`  [FALLO] No coincide: ${actual} !== ${tc.expectedBsAs}`);
    }
}

console.log('\n--- 3. Pruebas de simulación de diferentes offsets horarios ---');
const simulatedZones = [
    { zone: 'America/Argentina/Buenos_Aires', offsetName: 'UTC-3', testUTC: '2026-09-11T00:15:00.000Z', expected: '2026-09-10' },
    { zone: 'America/Sao_Paulo', offsetName: 'UTC-3', testUTC: '2026-09-11T00:15:00.000Z', expected: '2026-09-10' },
    { zone: 'America/New_York', offsetName: 'UTC-4 (EDT)', testUTC: '2026-09-11T00:15:00.000Z', expected: '2026-09-10' },
    { zone: 'UTC', offsetName: 'UTC+0', testUTC: '2026-09-11T00:15:00.000Z', expected: '2026-09-11' },
    { zone: 'Asia/Tokyo', offsetName: 'UTC+9', testUTC: '2026-09-11T00:15:00.000Z', expected: '2026-09-11' },
];

for (const sz of simulatedZones) {
    const d = new Date(sz.testUTC);
    const formatted = d.toLocaleDateString('en-CA', { timeZone: sz.zone });
    console.log(`Zona ${sz.zone} (${sz.offsetName}) para ${sz.testUTC} -> ${formatted} (Esperado: ${sz.expected})`);
    if (formatted !== sz.expected) {
        console.error(`  [FALLO] Error en zona ${sz.zone}`);
    }
}
