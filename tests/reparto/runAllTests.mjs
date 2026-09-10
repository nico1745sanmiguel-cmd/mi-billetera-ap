#!/usr/bin/env node
/**
 * tests/reparto/runAllTests.mjs
 * Master Automated Test Runner para Grupo Familiar y Reparto de Gastos
 *
 * Ejecuta los 4 Tiers de pruebas automatizadas:
 * - Tier 1: Feature Coverage (30 tests)
 * - Tier 2: Boundary & Corner Cases (40 tests)
 * - Tier 3: Cross-Feature Combinations (12 tests)
 * - Tier 4: Real-World Scenarios (5 tests)
 *
 * Utiliza Node.js nativo (node:test y node:child_process) sin dependencias externas.
 * Garantiza código de salida 0 si todos los tests pasan, o 1 ante cualquier fallo.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TIERS = [
    {
        name: 'Tier 1: Feature Coverage',
        file: join(__dirname, 'tier1-features.test.mjs'),
        description: 'Proporciones salariales, cuotas Largest Remainder, 100% exacto, selector unificado, balances y transferencias'
    },
    {
        name: 'Tier 2: Boundary & Corner Cases',
        file: join(__dirname, 'tier2-boundaries.test.mjs'),
        description: '0 miembros, 1 miembro, 3+ miembros, sueldos 0, asimetrías $5M vs $0, división por 0, NaN/Infinity, negativos y decimales'
    },
    {
        name: 'Tier 3: Cross-Feature Combinations',
        file: join(__dirname, 'tier3-combinations.test.mjs'),
        description: 'Equitativo vs Proporcional, compensaciones cruzadas servicios/tarjetas, aportes a caja común y cancelación circular'
    },
    {
        name: 'Tier 4: Real-World Scenarios',
        file: join(__dirname, 'tier4-scenarios.test.mjs'),
        description: 'Pareja 65/35 con Mercado Pago, roommates en Palermo, desempleo temporal, pozo en efectivo y mes inflacionario ($777.067)'
    }
];

console.log('\n' + '='.repeat(82));
console.log('  MI BILLETERA — SUITE E2E AUTOMATIZADA: GRUPO FAMILIAR Y REPARTO DE GASTOS');
console.log('='.repeat(82));
console.log(`  Fecha de ejecución : ${new Date().toLocaleString('es-AR')}`);
console.log(`  Versión de Node.js : ${process.version}`);
console.log(`  Modo de ejecución  : ESM Nativo (node:test)\n`);

let totalPassedTiers = 0;
let totalFailedTiers = 0;
const results = [];
const startTime = Date.now();

for (const [index, tier] of TIERS.entries()) {
    console.log(`\n[${index + 1}/${TIERS.length}] Ejecutando ${tier.name}...`);
    console.log(`    Alcance: ${tier.description}`);
    console.log('-'.repeat(82));

    const tierStart = Date.now();
    const child = spawnSync(process.execPath, ['--test', tier.file], {
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
    });
    const duration = ((Date.now() - tierStart) / 1000).toFixed(2);

    const passed = child.status === 0;
    if (passed) {
        totalPassedTiers++;
        results.push({ name: tier.name, status: 'PASSED', duration: `${duration}s` });
    } else {
        totalFailedTiers++;
        results.push({ name: tier.name, status: 'FAILED', duration: `${duration}s`, code: child.status });
    }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n' + '='.repeat(82));
console.log('  RESUMEN EJECUTIVO DE EJECUCIÓN DE PRUEBAS — GRUPO FAMILIAR');
console.log('='.repeat(82));

for (const res of results) {
    const icon = res.status === 'PASSED' ? '✔' : '✖';
    const statusText = res.status === 'PASSED' ? 'PASÓ' : `FALLÓ (Código ${res.code})`;
    console.log(`  ${icon}  ${res.name.padEnd(38)} : [${statusText}] (${res.duration})`);
}

console.log('-'.repeat(82));
console.log(`  Tiers Aprobados : ${totalPassedTiers} de ${TIERS.length}`);
console.log(`  Tiers Fallados  : ${totalFailedTiers}`);
console.log(`  Tiempo Total    : ${totalDuration}s`);
console.log('='.repeat(82) + '\n');

if (totalFailedTiers > 0) {
    console.error('❌ ERROR: La suite de pruebas de Grupo Familiar y Reparto contiene fallos.\n');
    process.exit(1);
} else {
    console.log('✅ ÉXITO: Todos los niveles de pruebas (Tiers 1-4) pasaron satisfactoriamente.\n');
    process.exit(0);
}
