/**
 * tier3-interactions.test.mjs
 * Tier 3: Cross-Feature Interactions (Interacciones entre subsistemas y agregaciones)
 *
 * Cobertura de interacciones complejas:
 * 1. Jornadas multiplataforma (Uber, DiDi, Cabify, Otros) y distribución de cuota
 * 2. Interacción Ingresos vs Gastos (balance neto, desgloses por categoría, margen y déficit)
 * 3. Agregación de desglose semanal (configuración de inicio de semana, aislamiento de días trabajados)
 * 4. Eficiencia operativa de Horas y Kilómetros (tráfico urbano vs autopista, promedios ponderados)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    sanitizeMobilitySession,
    calculateMobilityKPIs,
    calculateWeeklyBreakdown
} from './mobilityContracts.mjs';

describe('Tier 3: Cross-Feature Interactions', () => {

    // ─── 1. JORNADAS MULTIPLATAFORMA Y CUOTA DE MERCADO ──────────────────────
    describe('1. Jornadas Multiplataforma y Distribución', () => {
        it('debe computar exactamente el 100% a Uber cuando es la única plataforma activa', () => {
            const sessions = [
                { date: '2026-09-01', uber: 40000, didi: 0, cabify: 0, others: 0 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.totalEarnings, 40000);
            assert.strictEqual(kpis.platformBreakdown.uber, 40000);
            assert.strictEqual(kpis.platformBreakdown.didi, 0);
            assert.strictEqual(kpis.platformBreakdown.cabify, 0);
            assert.strictEqual(kpis.platformBreakdown.others, 0);
        });

        it('debe acumular correctamente ingresos combinados de 4 plataformas en una misma jornada', () => {
            const sessions = [
                { date: '2026-09-02', uber: 25000, didi: 15000, cabify: 12000, others: 8000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.totalEarnings, 60000);
            assert.strictEqual(kpis.platformBreakdown.uber, 25000);
            assert.strictEqual(kpis.platformBreakdown.didi, 15000);
            assert.strictEqual(kpis.platformBreakdown.cabify, 12000);
            assert.strictEqual(kpis.platformBreakdown.others, 8000);
        });

        it('debe consolidar cuotas de mercado variables a lo largo de múltiples jornadas', () => {
            const sessions = [
                { date: '2026-09-01', uber: 30000, didi: 10000 },
                { date: '2026-09-02', uber: 10000, didi: 30000 },
                { date: '2026-09-03', cabify: 25000, others: 15000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.totalEarnings, 120000);
            assert.strictEqual(kpis.platformBreakdown.uber, 40000);
            assert.strictEqual(kpis.platformBreakdown.didi, 40000);
            assert.strictEqual(kpis.platformBreakdown.cabify, 25000);
            assert.strictEqual(kpis.platformBreakdown.others, 15000);
        });

        it('debe preservar la suma de plataformas frente al campo total preexistente', () => {
            // Si la suma de plataformas es 30000, debe primar sobre un total arbitrario o desactualizado
            const raw = {
                date: '2026-09-05',
                uber: 20000,
                didi: 10000,
                total: 5000 // desfasado
            };
            const sanitized = sanitizeMobilitySession(raw);
            assert.strictEqual(sanitized.total, 30000);
        });

        it('debe admitir jornadas donde solo se especificó el total (ej: importaciones simplificadas)', () => {
            const raw = {
                date: '2026-09-06',
                total: 45000
            };
            const sanitized = sanitizeMobilitySession(raw);
            assert.strictEqual(sanitized.total, 45000);
            assert.strictEqual(sanitized.uber, 0);
        });
    });

    // ─── 2. INGRESOS VS GASTOS (FLUJO DE FONDOS Y DÉFICIT) ───────────────────
    describe('2. Interacción Ingresos vs Gastos', () => {
        it('debe calcular rentabilidad neta positiva en un ciclo mensual estándar rentable', () => {
            const sessions = [
                { date: '2026-09-01', uber: 50000 },
                { date: '2026-09-02', uber: 60000 }
            ];
            const expenses = [
                { date: '2026-09-01', category: 'gnc', amount: 12000 },
                { date: '2026-09-02', category: 'gnc', amount: 13000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.totalEarnings, 110000);
            assert.strictEqual(kpis.totalExpenses, 25000);
            assert.strictEqual(kpis.netEarnings, 85000);
            // (85000 / 110000) * 100 = 77.2727...
            assert.ok(Math.abs(kpis.profitMargin - 77.27) < 0.1);
        });

        it('debe gestionar un día con déficit puntual (gastos > ingresos) sin corromper el balance mensual acumulado', () => {
            const sessions = [
                { date: '2026-09-01', uber: 30000 }, // Ingreso: 30k
                { date: '2026-09-02', uber: 80000 }  // Ingreso: 80k
            ];
            const expenses = [
                { date: '2026-09-01', category: 'repuestos', amount: 50000 }, // Gasto mayor que ingreso del día
                { date: '2026-09-02', category: 'gnc', amount: 10000 }
            ];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.totalEarnings, 110000);
            assert.strictEqual(kpis.totalExpenses, 60000);
            assert.strictEqual(kpis.netEarnings, 50000); // 110k - 60k = +50k
            assert.ok(kpis.netEarnings > 0);
        });

        it('debe agrupar los gastos acumulados correctamente por categoría en expenseBreakdown', () => {
            const expenses = [
                { date: '2026-09-01', category: 'gnc', amount: 8000 },
                { date: '2026-09-02', category: 'gnc', amount: 9000 },
                { date: '2026-09-03', category: 'nafta', amount: 15000 },
                { date: '2026-09-04', category: 'lavadero', amount: 4500 }
            ];
            const kpis = calculateMobilityKPIs([], expenses);
            assert.strictEqual(kpis.totalExpenses, 36500);
            assert.strictEqual(kpis.expenseBreakdown.gnc, 17000);
            assert.strictEqual(kpis.expenseBreakdown.nafta, 15000);
            assert.strictEqual(kpis.expenseBreakdown.lavadero, 4500);
        });

        it('debe calcular margen de pérdida negativo cuando los gastos de taller superan los ingresos totales', () => {
            const sessions = [{ date: '2026-09-01', uber: 50000 }];
            const expenses = [{ date: '2026-09-01', category: 'taller', amount: 150000 }];
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.netEarnings, -100000);
            // (-100000 / 50000) * 100 = -200%
            assert.strictEqual(kpis.profitMargin, -200);
        });

        it('debe manejar períodos sin ingresos pero con gastos fijos (seguro, cochera) con ganancia neta negativa', () => {
            const expenses = [{ date: '2026-09-01', category: 'seguro', amount: 35000 }];
            const kpis = calculateMobilityKPIs([], expenses);
            assert.strictEqual(kpis.totalEarnings, 0);
            assert.strictEqual(kpis.totalExpenses, 35000);
            assert.strictEqual(kpis.netEarnings, -35000);
            assert.strictEqual(kpis.profitMargin, 0);
        });
    });

    // ─── 3. DESGLOSE SEMANAL (WEEKLY BREAKDOWN) ──────────────────────────────
    describe('3. Agregación de Desglose Semanal (calculateWeeklyBreakdown)', () => {
        it('debe agrupar sesiones en semanas cronológicas etiquetadas S1, S2, etc.', () => {
            const sessions = [
                { date: '2026-09-01', uber: 20000 }, // Martes (Semana 1)
                { date: '2026-09-08', uber: 30000 }  // Martes siguiente (Semana 2)
            ];
            const weeks = calculateWeeklyBreakdown(sessions, [], 1);
            assert.strictEqual(weeks.length, 2);
            assert.strictEqual(weeks[0].label, 'S1');
            assert.strictEqual(weeks[0].total, 20000);
            assert.strictEqual(weeks[1].label, 'S2');
            assert.strictEqual(weeks[1].total, 30000);
        });

        it('VERIFICACIÓN DE CORRECCIÓN: Los gastos NUNCA deben incrementar la cuenta de días trabajados en la semana', () => {
            // 1 sesión trabajada y 5 cargas de combustible en la misma semana
            const sessions = [
                { date: '2026-09-02', uber: 40000 } // Miércoles
            ];
            const expenses = [
                { date: '2026-09-01', amount: 5000 },
                { date: '2026-09-02', amount: 6000 },
                { date: '2026-09-03', amount: 7000 },
                { date: '2026-09-04', amount: 5500 },
                { date: '2026-09-05', amount: 6500 }
            ];
            const weeks = calculateWeeklyBreakdown(sessions, expenses, 1);
            assert.strictEqual(weeks.length, 1);
            // El bug anterior sumaba +1 día por cada gasto -> resultaría en 6 días
            // La versión corregida DEBE reflejar exactamente 1 día trabajado
            assert.strictEqual(weeks[0].days, 1);
            assert.strictEqual(weeks[0].total, 40000);
            assert.strictEqual(weeks[0].gastos, 30000);
            assert.strictEqual(weeks[0].net, 10000);
        });

        it('debe computar semanas que solo contienen gastos con days: 0 y total: 0', () => {
            const expenses = [
                { date: '2026-09-05', amount: 15000 }
            ];
            const weeks = calculateWeeklyBreakdown([], expenses, 1);
            assert.strictEqual(weeks.length, 1);
            assert.strictEqual(weeks[0].days, 0);
            assert.strictEqual(weeks[0].total, 0);
            assert.strictEqual(weeks[0].gastos, 15000);
            assert.strictEqual(weeks[0].net, -15000);
        });

        it('debe responder al cambio de día de inicio de semana (Lunes=1 vs Domingo=0)', () => {
            // Domingo 2026-09-06 y Lunes 2026-09-07
            const sessions = [
                { date: '2026-09-06', uber: 20000 }, // Domingo
                { date: '2026-09-07', uber: 30000 }  // Lunes
            ];
            // Si la semana inicia el Lunes (1), el Domingo 06 pertenece a la semana anterior
            const weeksMon = calculateWeeklyBreakdown(sessions, [], 1);
            assert.strictEqual(weeksMon.length, 2);

            // Si la semana inicia el Domingo (0), Domingo 06 y Lunes 07 pertenecen a la MISMA semana
            const weeksSun = calculateWeeklyBreakdown(sessions, [], 0);
            assert.strictEqual(weeksSun.length, 1);
            assert.strictEqual(weeksSun[0].total, 50000);
            assert.strictEqual(weeksSun[0].days, 2);
        });

        it('debe ordenar las semanas cronológicamente sin importar el orden de inserción de las jornadas', () => {
            const sessions = [
                { date: '2026-09-20', uber: 25000 }, // Semana posterior
                { date: '2026-09-01', uber: 15000 }  // Semana anterior
            ];
            const weeks = calculateWeeklyBreakdown(sessions, [], 1);
            assert.strictEqual(weeks.length, 2);
            assert.strictEqual(weeks[0].total, 15000);
            assert.strictEqual(weeks[1].total, 25000);
        });
    });

    // ─── 4. EFICIENCIA OPERATIVA (HORAS Y KILÓMETROS) ─────────────────────────
    describe('4. Eficiencia Operativa de Horas y Kilómetros', () => {
        it('debe calcular métricas para jornada de alta congestión urbana (muchas horas, pocos km)', () => {
            const raw = {
                date: '2026-09-08',
                uber: 40000,
                hoursWorked: 10,
                kilometers: 80
            };
            const session = sanitizeMobilitySession(raw);
            assert.strictEqual(session.earningsPerHour, 4000); // 40000 / 10
            assert.strictEqual(session.earningsPerKm, 500);    // 40000 / 80
        });

        it('debe calcular métricas para jornada de viajes largos en autopista (pocas horas, muchos km)', () => {
            const raw = {
                date: '2026-09-09',
                uber: 50000,
                hoursWorked: 5,
                kilometers: 250
            };
            const session = sanitizeMobilitySession(raw);
            assert.strictEqual(session.earningsPerHour, 10000); // 50000 / 5
            assert.strictEqual(session.earningsPerKm, 200);     // 50000 / 250
        });

        it('debe calcular la eficiencia promedio ponderada del período en calculateMobilityKPIs', () => {
            const sessions = [
                { date: '2026-09-08', uber: 40000, hoursWorked: 10, kilometers: 80 },
                { date: '2026-09-09', uber: 50000, hoursWorked: 5, kilometers: 250 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.totalEarnings, 90000);
            assert.strictEqual(kpis.totalHours, 15);
            assert.strictEqual(kpis.totalKm, 330);
            // 90000 / 15 = 6000 $/h
            assert.strictEqual(kpis.overallPerHour, 6000);
            // 90000 / 330 = 272.73 $/km
            assert.strictEqual(kpis.overallPerKm, 272.73);
        });

        it('debe tolerar jornadas con horas o km ausentes sin distorsionar el cálculo global', () => {
            const sessions = [
                { date: '2026-09-08', uber: 30000, hoursWorked: 6, kilometers: 100 },
                { date: '2026-09-09', uber: 20000 } // Sin horas ni km
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.totalEarnings, 50000);
            assert.strictEqual(kpis.totalHours, 6);
            assert.strictEqual(kpis.totalKm, 100);
            // 50000 / 6 = 8333.33 $/h
            assert.strictEqual(kpis.overallPerHour, 8333.33);
            // 50000 / 100 = 500 $/km
            assert.strictEqual(kpis.overallPerKm, 500);
        });

        it('debe proteger contra división por cero retornando 0 en overallPerHour y overallPerKm si totales son 0', () => {
            const sessions = [
                { date: '2026-09-10', uber: 25000, hoursWorked: 0, kilometers: 0 }
            ];
            const kpis = calculateMobilityKPIs(sessions, []);
            assert.strictEqual(kpis.overallPerHour, 0);
            assert.strictEqual(kpis.overallPerKm, 0);
        });
    });
});
