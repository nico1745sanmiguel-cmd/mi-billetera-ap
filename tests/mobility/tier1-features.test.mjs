/**
 * tier1-features.test.mjs
 * Tier 1: Feature Coverage (Pruebas unitarias de cobertura de funcionalidad)
 *
 * Cobertura de funcionalidades principales:
 * 1. Sanitización de jornadas (sanitizeMobilitySession)
 * 2. Sanitización de gastos (sanitizeMobilityExpense)
 * 3. Parser de montos monetarios (parseAmount)
 * 4. Cálculo de rentabilidad neta y margen de ganancia
 * 5. Fórmulas de KPIs operativos (días trabajados, promedio diario, mejor jornada, eficiencia h/km)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    sanitizeMobilitySession,
    sanitizeMobilityExpense,
    parseAmount,
    calculateMobilityKPIs
} from './mobilityContracts.mjs';

describe('Tier 1: Feature Coverage', () => {

    // ─── 1. SANITIZACIÓN DE JORNADAS ──────────────────────────────────────────
    describe('1. Sanitización de Jornadas (sanitizeMobilitySession)', () => {
        it('debe calcular el total sumando todas las plataformas activas (Uber, DiDi, Cabify, Otros)', () => {
            const raw = {
                date: '2026-09-10',
                uber: 25000,
                didi: 15000,
                cabify: 10000,
                others: 5000,
                hoursWorked: 8,
                kilometers: 160
            };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.total, 55000);
            assert.strictEqual(result.uber, 25000);
            assert.strictEqual(result.didi, 15000);
            assert.strictEqual(result.cabify, 10000);
            assert.strictEqual(result.others, 5000);
        });

        it('debe calcular earningsPerHour y earningsPerKm con precisión de 2 decimales', () => {
            const raw = {
                date: '2026-09-10',
                uber: 35000,
                hoursWorked: 7.5,
                kilometers: 140
            };
            const result = sanitizeMobilitySession(raw);
            // 35000 / 7.5 = 4666.67
            assert.strictEqual(result.earningsPerHour, 4666.67);
            // 35000 / 140 = 250
            assert.strictEqual(result.earningsPerKm, 250);
        });

        it('debe asignar 0 a earningsPerHour y earningsPerKm si horas o kilómetros son 0', () => {
            const raw = {
                date: '2026-09-10',
                uber: 20000,
                hoursWorked: 0,
                kilometers: 0
            };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.earningsPerHour, 0);
            assert.strictEqual(result.earningsPerKm, 0);
        });

        it('debe derivar automáticamente el día de la semana en español si no se proporciona', () => {
            // 2026-09-10 es un jueves
            const raw = { date: '2026-09-10', uber: 10000 };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.dayOfWeek, 'jueves');
        });

        it('debe remover campos undefined y sanitizar cadenas de texto evitando inyecciones', () => {
            const raw = {
                date: '2026-09-10',
                uber: 15000,
                unknownField: undefined,
                notes: '  Jornada de lluvia \u200B intensa   '
            };
            const result = sanitizeMobilitySession(raw);
            assert.strictEqual(result.notes, 'Jornada de lluvia  intensa');
            assert.strictEqual(Object.prototype.hasOwnProperty.call(result, 'unknownField'), false);
        });
    });

    // ─── 2. SANITIZACIÓN DE GASTOS ───────────────────────────────────────────
    describe('2. Sanitización de Gastos (sanitizeMobilityExpense)', () => {
        it('debe sanitizar un gasto estándar con fecha, categoría, monto y notas', () => {
            const raw = {
                date: '2026-09-10',
                category: 'gnc',
                amount: 8500,
                notes: 'Carga completa 14m3'
            };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.date, '2026-09-10');
            assert.strictEqual(result.category, 'gnc');
            assert.strictEqual(result.amount, 8500);
            assert.strictEqual(result.notes, 'Carga completa 14m3');
        });

        it('debe aplicar la categoría por defecto "varios" si está ausente o vacía', () => {
            const raw = {
                date: '2026-09-10',
                amount: 6000
            };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.category, 'varios');
        });

        it('debe procesar montos formateados como string con símbolos y separadores', () => {
            const raw = {
                date: '2026-09-10',
                category: 'nafta',
                amount: '$ 15.450,50',
                notes: 'Super YPF'
            };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.amount, 15450.50);
        });

        it('debe forzar montos negativos a 0 para prevenir corrupción de caja', () => {
            const raw = {
                date: '2026-09-10',
                category: 'repuestos',
                amount: -25000
            };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.amount, 0);
        });

        it('debe recortar notas largas que excedan el límite seguro de 200 caracteres', () => {
            const longNotes = 'A'.repeat(250);
            const raw = {
                date: '2026-09-10',
                amount: 5000,
                notes: longNotes
            };
            const result = sanitizeMobilityExpense(raw);
            assert.strictEqual(result.notes.length, 200);
        });
    });

    // ─── 3. PARSER DE MONTOS MONETARIOS (parseAmount) ────────────────────────
    describe('3. Parser de Montos Monetarios (parseAmount)', () => {
        it('debe preservar números enteros y decimales positivos válidos', () => {
            assert.strictEqual(parseAmount(1500), 1500);
            assert.strictEqual(parseAmount(85.75), 85.75);
            assert.strictEqual(parseAmount(0), 0);
        });

        it('debe interpretar correctamente el punto como separador de miles argentino (ej: 85.000 -> 85000)', () => {
            assert.strictEqual(parseAmount('85.000'), 85000);
            assert.strictEqual(parseAmount('120.000'), 120000);
            assert.strictEqual(parseAmount('1.250.000'), 1250000);
        });

        it('debe interpretar coma decimal argentina con punto de miles (ej: 1.250.000,50 -> 1250000.5)', () => {
            assert.strictEqual(parseAmount('1.250.000,50'), 1250000.5);
            assert.strictEqual(parseAmount('45.200,25'), 45200.25);
        });

        it('debe admitir prefijos monetarios, espacios y símbolos (ej: "$ 35.000 ARS")', () => {
            assert.strictEqual(parseAmount('$ 35.000'), 35000);
            assert.strictEqual(parseAmount('  $  12.500,75  '), 12500.75);
        });

        it('debe retornar 0 para valores negativos, nulos, undefined o no numéricos', () => {
            assert.strictEqual(parseAmount('-500'), 0);
            assert.strictEqual(parseAmount(-1200), 0);
            assert.strictEqual(parseAmount(null), 0);
            assert.strictEqual(parseAmount(undefined), 0);
            assert.strictEqual(parseAmount(''), 0);
            assert.strictEqual(parseAmount('invalido'), 0);
        });
    });

    // ─── 4. CÁLCULO DE GANANCIA NETA Y MARGEN ────────────────────────────────
    describe('4. Rentabilidad Neta y Margen de Ganancia', () => {
        it('debe calcular ganancia neta positiva y margen porcentual exacto cuando ingresos > gastos', () => {
            const sessions = [
                { date: '2026-09-10', uber: 100000 }
            ];
            const expenses = [
                { date: '2026-09-10', category: 'gnc', amount: 20000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.totalEarnings, 100000);
            assert.strictEqual(kpis.totalExpenses, 20000);
            assert.strictEqual(kpis.netEarnings, 80000);
            assert.strictEqual(kpis.profitMargin, 80);
        });

        it('debe retornar 100% de margen de ganancia si no hubo gastos en el período', () => {
            const sessions = [{ date: '2026-09-10', uber: 50000 }];
            const expenses = [];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.netEarnings, 50000);
            assert.strictEqual(kpis.profitMargin, 100);
        });

        it('debe calcular 0 de ganancia neta y 0% de margen en situación de punto de equilibrio (ingresos == gastos)', () => {
            const sessions = [{ date: '2026-09-10', uber: 30000 }];
            const expenses = [{ date: '2026-09-10', amount: 30000 }];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.netEarnings, 0);
            assert.strictEqual(kpis.profitMargin, 0);
        });

        it('debe reflejar déficit neto y margen negativo si los gastos superan los ingresos', () => {
            const sessions = [{ date: '2026-09-10', uber: 20000 }];
            const expenses = [{ date: '2026-09-10', category: 'repuestos', amount: 30000 }];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.netEarnings, -10000);
            assert.strictEqual(kpis.profitMargin, -50); // (-10000 / 20000) * 100 = -50%
        });

        it('debe retornar 0% de margen y evitar división por cero si ingresos totales son 0 pero hay gastos', () => {
            const sessions = [];
            const expenses = [{ date: '2026-09-10', category: 'taller', amount: 45000 }];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.totalEarnings, 0);
            assert.strictEqual(kpis.netEarnings, -45000);
            assert.strictEqual(kpis.profitMargin, 0);
        });
    });

    // ─── 5. FÓRMULAS DE KPIS OPERATIVOS ──────────────────────────────────────
    describe('5. Fórmulas de KPIs Operativos', () => {
        it('debe computar correctamente los días trabajados basándose exclusivamente en sesiones', () => {
            const sessions = [
                { date: '2026-09-08', uber: 20000 },
                { date: '2026-09-09', uber: 25000 },
                { date: '2026-09-10', uber: 30000 }
            ];
            const expenses = [
                { date: '2026-09-08', amount: 5000 },
                { date: '2026-09-09', amount: 6000 },
                { date: '2026-09-10', amount: 7000 },
                { date: '2026-09-10', amount: 2000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            // 3 sesiones = 3 días trabajados (los 4 gastos NO deben sumar días)
            assert.strictEqual(kpis.daysWorked, 3);
        });

        it('debe calcular el promedio diario de ingresos (totalEarnings / daysWorked)', () => {
            const sessions = [
                { date: '2026-09-08', uber: 20000 },
                { date: '2026-09-09', uber: 40000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.avgPerDay, 30000);
        });

        it('debe identificar la mejor jornada con el mayor ingreso total', () => {
            const sessions = [
                { date: '2026-09-01', uber: 20000, didi: 5000 },  // 25000
                { date: '2026-09-02', uber: 45000, didi: 15000 }, // 60000 (MEJOR DÍA)
                { date: '2026-09-03', uber: 30000, didi: 10000 }  // 40000
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.bestDay.date, '2026-09-02');
            assert.strictEqual(kpis.bestDay.total, 60000);
        });

        it('debe calcular la eficiencia promedio horaria y por kilómetro del período', () => {
            const sessions = [
                { date: '2026-09-08', uber: 30000, hoursWorked: 6, kilometers: 100 },
                { date: '2026-09-09', uber: 50000, hoursWorked: 10, kilometers: 150 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            // totalEarnings = 80000, totalHours = 16 -> 80000 / 16 = 5000 $/h
            assert.strictEqual(kpis.overallPerHour, 5000);
            // totalKm = 250 -> 80000 / 250 = 320 $/km
            assert.strictEqual(kpis.overallPerKm, 320);
        });

        it('debe desglosar correctamente los ingresos acumulados por cada plataforma', () => {
            const sessions = [
                { date: '2026-09-08', uber: 15000, didi: 8000, cabify: 5000, others: 2000 },
                { date: '2026-09-09', uber: 25000, didi: 12000, cabify: 7000, others: 3000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.platformBreakdown.uber, 40000);
            assert.strictEqual(kpis.platformBreakdown.didi, 20000);
            assert.strictEqual(kpis.platformBreakdown.cabify, 12000);
            assert.strictEqual(kpis.platformBreakdown.others, 5000);
        });
    });
});
