#!/usr/bin/env node
/**
 * test-reparto-e2e.js
 * Runner E2E principal en la raíz para el Módulo de Grupo Familiar y Reparto de Gastos
 * 
 * Uso:
 * node test-reparto-e2e.js
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runnerPath = join(__dirname, 'tests', 'reparto', 'runAllTests.mjs');

const child = spawnSync(process.execPath, [runnerPath], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
});

process.exit(child.status ?? 0);
