#!/usr/bin/env node
/**
 * runAllTests.mjs
 * Master Automated Test Runner para el Módulo de Movilidad (Mi Billetera)
 *
 * Ejecuta los 4 Tiers de pruebas automatizadas:
 * - Tier 1: Feature Coverage
 * - Tier 2: Boundary & Corner Cases
 * - Tier 3: Cross-Feature Interactions
 * - Tier 4: Real-World Scenarios
 *
 * Utiliza Node.js nativo (node:test y node:child_process) sin dependencias externas.
 * Garantiza código de salida 0 si todos los tests pasan, o 1 ante fallos.
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
        description: 'Sanitización, parseAmount, rentabilidad neta y KPIs operativos'
    },
    {
        name: 'Tier 2: Boundary & Corner Cases',
        file: join(__dirname, 'tier2-boundaries.test.mjs'),
        description: 'Valores vacíos, undefined, NaN/Infinity, negativos, fin de mes, RFC 4180 y chunks > 500'
    },
    {
        name: 'Tier 3: Cross-Feature Interactions',
        file: join(__dirname, 'tier3-interactions.test.mjs'),
        description: 'Jornadas multiplataforma, balance ingresos vs gastos, desglose semanal y eficiencia h/km'
    },
    {
        name: 'Tier 4: Real-World Scenarios',
        file: join(__dirname, 'tier4-scenarios.test.mjs'),
        description: 'Turnos nocturnos post 21hs UTC-3, importación Excel español (;) y ciclo mensual completo'
    }
];

console.log('\n' + '='.repeat(78));
console.log('  MI BILLETERA — SUITE DE PRUEBAS AUTOMATIZADAS (MÓDULO DE MOVILIDAD)');
console.log('='.repeat(78));
console.log(`Fecha de ejecución : ${new Date().toLocaleString('es-AR')}`);
console.log(`Versión de Node.js : ${process.version}`);
console.log(`Modo de ejecución  : ESM Nativo (node:test)\n`);

let totalPassedTiers = 0;
let totalFailedTiers = 0;
const results = [];
const startTime = Date.now();

for (const [index, tier] of TIERS.entries()) {
    console.log(`\n[${index + 1}/${TIERS.length}] Ejecutando ${tier.name}...`);
    console.log(`    Alcance: ${tier.description}`);
    console.log('-'.repeat(78));

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

console.log('\n' + '='.repeat(78));
console.log('  RESUMEN EJECUTIVO DE EJECUCIÓN DE PRUEBAS');
console.log('='.repeat(78));

for (const res of results) {
    const icon = res.status === 'PASSED' ? '✔' : '✖';
    const statusText = res.status === 'PASSED' ? 'PASÓ' : `FALLÓ (Código ${res.code})`;
    console.log(`  ${icon}  ${res.name.padEnd(38)} : [${statusText}] (${res.duration})`);
}

console.log('-'.repeat(78));
console.log(`  Tiers Aprobados : ${totalPassedTiers} de ${TIERS.length}`);
console.log(`  Tiers Fallados  : ${totalFailedTiers}`);
console.log(`  Tiempo Total    : ${totalDuration}s`);
console.log('='.repeat(78) + '\n');

if (totalFailedTiers > 0) {
    console.error('❌ ERROR: La suite de pruebas de Movilidad contiene fallos.\n');
    process.exit(1);
} else {
    console.log('✅ ÉXITO: Todos los niveles de pruebas (Tiers 1-4) pasaron satisfactoriamente.\n');
    process.exit(0);
}
