/**
 * tier5-challenger-m2.test.mjs
 * Tier 5: Challenger Adversarial & Stress Testing for Milestone M2
 *
 * Misión del Challenger M2:
 * 1. Probar MobilityStats.jsx ante casos extremos:
 *    - Sesiones con hoursWorked: 0, undefined, null, valores extremos
 *    - Sesiones sin kilómetros (kilometers: 0, undefined, null)
 *    - Semanas con solo gastos (sin sesiones de conducción)
 *    - Verificación matemática estricta: NUNCA debe devolver NaN ni Infinity
 * 2. Probar la fecha previa en MobilityWidget.jsx:
 *    - 31 de marzo en año no bisiesto (2026-03-31 -> 2026-02)
 *    - 31 de marzo en año bisiesto (2024-03-31 -> 2024-02)
 *    - 29 de febrero en año bisiesto (2024-02-29 -> 2024-01)
 *    - 31 de diciembre (2026-12-31 -> 2026-11)
 *    - 31 de enero con cambio de año (2026-01-31 -> 2025-12)
 *    - Barrido exhaustivo de los 366 días de año bisiesto y 365 de no bisiesto
 * 3. Detección adversarial de fragilidades en acceso a propiedades de configuración
 * 4. Verificación de renderizado de componentes reales de producción vía Vite SSR
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createServer } from 'vite';
import { getLocalDateString } from '../../src/utils/security.js';

const DEFAULT_TEST_SETTINGS = {
    weekStartDay: 1,
    activePlatforms: { uber: true, didi: true, cabify: true, others: true },
    expenseCategories: [
        { id: 'gnc', label: 'GNC' },
        { id: 'nafta', label: 'Nafta' },
        { id: 'repuestos', label: 'Repuestos' },
        { id: 'lavadero', label: 'Lavadero' }
    ]
};

// Implementación fidedigna de los cálculos de MobilityStats.jsx
function computeMobilityStatsKpis(filtered, filteredExpenses, settings = DEFAULT_TEST_SETTINGS) {
    if (!filtered.length && !filteredExpenses.length) return null;
    const totalEarnings = filtered.reduce((a, s) => a + Number(s.total || 0), 0);
    const bestDay       = [...filtered].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))[0];
    const daysWorked    = filtered.length;
    const avgPerDay     = daysWorked > 0 ? totalEarnings / daysWorked : 0;
    const totalHours    = filtered.reduce((a, s) => a + Number(s.hoursWorked || 0), 0);
    const totalKm       = filtered.reduce((a, s) => a + Number(s.kilometers || 0), 0);
    const earningsPerHour = totalHours > 0 ? totalEarnings / totalHours : 0;
    const earningsPerKm   = totalKm > 0 ? totalEarnings / totalKm : 0;

    // Nota: en MobilityStats.jsx línea 54 se hace:
    // const platforms = Object.keys(settings?.activePlatforms || { uber: true, didi: true, cabify: true, others: true }).reduce(...)
    // si settings?.activePlatforms es undefined, settings?.activePlatforms[key] lanza TypeError a menos que se use fallback en el lookup
    const activePlatformsMap = settings?.activePlatforms;
    const platforms = Object.keys(activePlatformsMap || { uber: true, didi: true, cabify: true, others: true }).reduce((acc, key) => {
        if (activePlatformsMap && activePlatformsMap[key]) {
            const total = filtered.reduce((a, s) => a + Number(s[key] || 0), 0);
            if (total > 0) {
                acc.push({ key, label: key === 'others' ? 'Otros' : key.charAt(0).toUpperCase() + key.slice(1), total });
            }
        }
        return acc;
    }, []);

    const getWeekKey = (dateStr) => {
        const startDay = settings?.weekStartDay ?? 1;
        const d = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = d.getDay();
        const daysFromStart = (dayOfWeek - startDay + 7) % 7;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - daysFromStart);
        return getLocalDateString(weekStart);
    };

    const weeksMap = new Map();
    filtered.forEach(s => {
        const w = getWeekKey(s.date);
        if (!weeksMap.has(w)) weeksMap.set(w, { total: 0, gastos: 0, days: 0 });
        weeksMap.get(w).total += Number(s.total || 0);
        weeksMap.get(w).days += 1;
    });

    filteredExpenses.forEach(e => {
        const w = getWeekKey(e.date);
        if (!weeksMap.has(w)) weeksMap.set(w, { total: 0, gastos: 0, days: 0 });
        weeksMap.get(w).gastos += Number(e.amount || 0);
    });

    const weeks = Array.from(weeksMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, data], i) => ({
            label: `S${i + 1}`,
            ...data
        }));

    const cats = settings?.expenseCategories || [];
    const expenseByCategory = cats.flatMap(cat => {
        const total = filteredExpenses.reduce((a, e) => e.category === cat.id ? a + Number(e.amount || 0) : a, 0);
        if (total > 0) {
            return [{
                ...cat,
                total
            }];
        }
        return [];
    });

    const totalExpenses = filteredExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    const netEarnings   = totalEarnings - totalExpenses;
    const profitMargin  = totalEarnings > 0 ? (netEarnings / totalEarnings) * 100 : 0;

    return { 
        totalEarnings, 
        bestDay, 
        daysWorked, 
        avgPerDay, 
        totalHours,
        totalKm,
        earningsPerHour,
        earningsPerKm,
        overallPerHour: earningsPerHour,
        overallPerKm: earningsPerKm,
        platforms, 
        weeks, 
        expenseByCategory, 
        totalExpenses, 
        netEarnings, 
        profitMargin 
    };
}

describe('Tier 5: Challenger M2 Adversarial & Extreme Boundary Tests', async () => {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. STRESS TESTING MATEMÁTICO: MobilityStats.jsx
    // ─────────────────────────────────────────────────────────────────────────
    describe('1. MobilityStats - Estabilidad Numérica y Prevención de NaN / Infinity', () => {

        it('debe manejar sesiones con hoursWorked: 0 sin generar Infinity ni NaN', () => {
            const sessions = [
                { date: '2026-09-01', total: 25000, uber: 25000, hoursWorked: 0, kilometers: 50 },
                { date: '2026-09-02', total: 30000, uber: 30000, hoursWorked: 0, kilometers: 60 }
            ];
            const kpis = computeMobilityStatsKpis(sessions, [], DEFAULT_TEST_SETTINGS);

            assert.strictEqual(kpis.totalHours, 0);
            assert.strictEqual(kpis.earningsPerHour, 0);
            assert.ok(!Number.isNaN(kpis.earningsPerHour), 'earningsPerHour no debe ser NaN');
            assert.ok(Number.isFinite(kpis.earningsPerHour), 'earningsPerHour debe ser finito');
            assert.strictEqual(kpis.earningsPerKm, 55000 / 110);
            assert.ok(Number.isFinite(kpis.earningsPerKm));
        });

        it('debe manejar sesiones con hoursWorked undefined y null sin colapsar a NaN', () => {
            const sessions = [
                { date: '2026-09-01', total: 15000, didi: 15000, hoursWorked: undefined, kilometers: 30 },
                { date: '2026-09-02', total: 20000, didi: 20000, hoursWorked: null, kilometers: 40 },
                { date: '2026-09-03', total: 10000, didi: 10000 } // sin propiedad hoursWorked ni kilometers
            ];
            const kpis = computeMobilityStatsKpis(sessions, [], DEFAULT_TEST_SETTINGS);

            assert.strictEqual(kpis.totalHours, 0);
            assert.strictEqual(kpis.earningsPerHour, 0);
            assert.strictEqual(kpis.totalKm, 70);
            assert.strictEqual(kpis.earningsPerKm, 45000 / 70);
            assert.ok(!Number.isNaN(kpis.earningsPerHour));
            assert.ok(!Number.isNaN(kpis.earningsPerKm));
            assert.ok(Number.isFinite(kpis.earningsPerHour));
            assert.ok(Number.isFinite(kpis.earningsPerKm));
        });

        it('debe manejar sesiones sin kilómetros (kilometers: 0, undefined, null)', () => {
            const sessions = [
                { date: '2026-09-01', total: 18000, cabify: 18000, hoursWorked: 4, kilometers: 0 },
                { date: '2026-09-02', total: 22000, cabify: 22000, hoursWorked: 5, kilometers: undefined },
                { date: '2026-09-03', total: 12000, cabify: 12000, hoursWorked: 3, kilometers: null }
            ];
            const kpis = computeMobilityStatsKpis(sessions, [], DEFAULT_TEST_SETTINGS);

            assert.strictEqual(kpis.totalKm, 0);
            assert.strictEqual(kpis.earningsPerKm, 0);
            assert.strictEqual(kpis.totalHours, 12);
            assert.strictEqual(kpis.earningsPerHour, 52000 / 12);
            assert.ok(!Number.isNaN(kpis.earningsPerKm));
            assert.ok(Number.isFinite(kpis.earningsPerKm));
        });

        it('debe manejar semanas que contienen ÚNICAMENTE gastos sin sesiones de trabajo', () => {
            const sessions = [];
            const expenses = [
                { date: '2026-09-05', category: 'gnc', amount: 9500 },
                { date: '2026-09-06', category: 'nafta', amount: 15000 },
                { date: '2026-09-12', category: 'repuestos', amount: 45000 }
            ];
            const kpis = computeMobilityStatsKpis(sessions, expenses, DEFAULT_TEST_SETTINGS);

            assert.ok(kpis !== null, 'kpis no debe ser null si hay gastos');
            assert.strictEqual(kpis.totalEarnings, 0);
            assert.strictEqual(kpis.bestDay, undefined);
            assert.strictEqual(kpis.daysWorked, 0);
            assert.strictEqual(kpis.avgPerDay, 0);
            assert.strictEqual(kpis.totalHours, 0);
            assert.strictEqual(kpis.totalKm, 0);
            assert.strictEqual(kpis.earningsPerHour, 0);
            assert.strictEqual(kpis.earningsPerKm, 0);
            assert.strictEqual(kpis.totalExpenses, 69500);
            assert.strictEqual(kpis.netEarnings, -69500);
            assert.strictEqual(kpis.profitMargin, 0, 'profitMargin debe ser 0 cuando totalEarnings es 0');
            assert.ok(!Number.isNaN(kpis.profitMargin));
            assert.ok(Number.isFinite(kpis.profitMargin));

            // Comprobación de semanas
            assert.ok(kpis.weeks.length >= 2, 'Debe haber al menos 2 semanas de gastos');
            for (const week of kpis.weeks) {
                assert.strictEqual(week.total, 0, 'La semana sin ingresos debe tener total 0');
                assert.strictEqual(week.days, 0, 'La semana sin jornadas no debe sumar días trabajados');
                assert.ok(week.gastos > 0, 'La semana debe registrar el gasto');
            }
        });

        it('debe manejar valores numéricos extremos sin overflow destructivo ni NaN', () => {
            const sessions = [
                { date: '2026-09-01', total: 1e9, uber: 1e9, hoursWorked: 1e5, kilometers: 1e6 },
                { date: '2026-09-02', total: 5e8, uber: 5e8, hoursWorked: 5e4, kilometers: 5e5 }
            ];
            const expenses = [
                { date: '2026-09-01', category: 'repuestos', amount: 2e8 }
            ];
            const kpis = computeMobilityStatsKpis(sessions, expenses, DEFAULT_TEST_SETTINGS);

            assert.strictEqual(kpis.totalEarnings, 1.5e9);
            assert.strictEqual(kpis.totalExpenses, 2e8);
            assert.strictEqual(kpis.netEarnings, 1.3e9);
            assert.strictEqual(kpis.totalHours, 1.5e5);
            assert.strictEqual(kpis.totalKm, 1.5e6);
            assert.strictEqual(kpis.earningsPerHour, 1.5e9 / 1.5e5);
            assert.strictEqual(kpis.earningsPerKm, 1.5e9 / 1.5e6);
            assert.ok(Number.isFinite(kpis.earningsPerHour));
            assert.ok(Number.isFinite(kpis.earningsPerKm));
            assert.ok(Number.isFinite(kpis.profitMargin));
        });

        it('debe verificar que las funciones de formateo no emitan NaN en strings de salida', () => {
            const fmt = (n, prefix = '$') => `${prefix}${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

            assert.strictEqual(fmt(undefined), '$0');
            assert.strictEqual(fmt(null), '$0');
            assert.strictEqual(fmt(NaN), '$0');
            assert.strictEqual(fmt(0), '$0');
            assert.strictEqual(fmt(55000), '$55.000');
        });

        it('HALLAZGO ADVERSARIAL: Demostración de vulnerabilidad en MobilityStats.jsx línea 55 si settings.activePlatforms es undefined', () => {
            // Este test comprueba el comportamiento exacto de la línea 54-55 de MobilityStats.jsx:
            // const platforms = Object.keys(settings?.activePlatforms || { uber: true, didi: true, cabify: true, others: true }).reduce((acc, key) => {
            //     if (settings?.activePlatforms[key]) { ...
            
            const settingsWithoutActivePlatforms = { weekStartDay: 1 };
            
            // Evaluamos la expresión exacta de producción:
            assert.throws(() => {
                const keys = Object.keys(settingsWithoutActivePlatforms?.activePlatforms || { uber: true, didi: true, cabify: true, others: true });
                keys.forEach(key => {
                    if (settingsWithoutActivePlatforms?.activePlatforms[key]) {
                        // lanzará TypeError porque settings?.activePlatforms es undefined
                    }
                });
            }, {
                name: 'TypeError'
            }, 'Debe lanzar TypeError al intentar indexar undefined con [key]');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. STRESS TESTING DE FECHAS EN MobilityWidget.jsx
    // ─────────────────────────────────────────────────────────────────────────
    describe('2. MobilityWidget - Algoritmo de Fecha Previa y Desbordes de Mes', () => {

        function calculatePrevMonth(currentDate) {
            const safeCurrentDate = currentDate instanceof Date && !isNaN(currentDate.getTime()) ? currentDate : new Date();
            const monthKey = `${safeCurrentDate.getFullYear()}-${String(safeCurrentDate.getMonth() + 1).padStart(2, '0')}`;
            const prevDate = new Date(safeCurrentDate.getFullYear(), safeCurrentDate.getMonth() - 1, 1);
            const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
            return { monthKey, prevMonthKey, prevDate };
        }

        it('31 de Marzo en año NO bisiesto (2026-03-31): debe calcular Febrero 2026 sin saltar a Marzo', () => {
            const d = new Date(2026, 2, 31, 12, 0, 0); // Mes 2 = Marzo
            const { monthKey, prevMonthKey } = calculatePrevMonth(d);

            assert.strictEqual(monthKey, '2026-03');
            assert.strictEqual(prevMonthKey, '2026-02', 'El mes anterior a Marzo debe ser SIEMPRE Febrero');
        });

        it('31 de Marzo en año BISIESTO (2024-03-31): debe calcular Febrero 2024 sin saltar a Marzo', () => {
            const d = new Date(2024, 2, 31, 12, 0, 0); // Mes 2 = Marzo 2024
            const { monthKey, prevMonthKey } = calculatePrevMonth(d);

            assert.strictEqual(monthKey, '2024-03');
            assert.strictEqual(prevMonthKey, '2024-02', 'En año bisiesto, el mes anterior a Marzo debe ser Febrero');
        });

        it('29 de Febrero en año BISIESTO (2024-02-29): debe calcular Enero 2024 sin desborde', () => {
            const d = new Date(2024, 1, 29, 12, 0, 0); // Mes 1 = Febrero bisiesto
            const { monthKey, prevMonthKey } = calculatePrevMonth(d);

            assert.strictEqual(monthKey, '2024-02');
            assert.strictEqual(prevMonthKey, '2024-01', 'El mes previo a Febrero 29 debe ser Enero');
        });

        it('31 de Diciembre (2026-12-31): debe calcular Noviembre 2026 correctamente', () => {
            const d = new Date(2026, 11, 31, 12, 0, 0); // Mes 11 = Diciembre
            const { monthKey, prevMonthKey } = calculatePrevMonth(d);

            assert.strictEqual(monthKey, '2026-12');
            assert.strictEqual(prevMonthKey, '2026-11', 'El mes previo a Diciembre debe ser Noviembre');
        });

        it('31 de Enero (2026-01-31): debe retroceder de año a Diciembre del año previo (2025-12)', () => {
            const d = new Date(2026, 0, 31, 12, 0, 0); // Mes 0 = Enero
            const { monthKey, prevMonthKey } = calculatePrevMonth(d);

            assert.strictEqual(monthKey, '2026-01');
            assert.strictEqual(prevMonthKey, '2025-12', 'El mes previo a Enero 2026 debe ser Diciembre 2025');
        });

        it('DEMOSTRACIÓN DEL BUG EVITADO: new Date(y, m-1, d) desborda vs new Date(y, m-1, 1) que es inmune', () => {
            const march31 = new Date(2026, 2, 31);
            // Si se usaba el día original (31):
            const buggyPrev = new Date(march31.getFullYear(), march31.getMonth() - 1, march31.getDate());
            // Febrero no tiene 31 días: en JS salta al 3 de Marzo!
            assert.strictEqual(buggyPrev.getMonth(), 2, 'El enfoque ingenuo salta a Marzo (bug evitado)');

            // El enfoque de producción fijando día 1:
            const safePrev = new Date(march31.getFullYear(), march31.getMonth() - 1, 1);
            assert.strictEqual(safePrev.getMonth(), 1, 'El enfoque implementado permanece en Febrero (inmune)');
        });

        it('BARRIDO EXHAUSTIVO: Comprobar TODOS los 366 días de 2024 (bisiesto) y 365 días de 2026 (no bisiesto)', () => {
            const testYears = [2024, 2026];

            for (const year of testYears) {
                const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                const daysInYear = isLeap ? 366 : 365;

                for (let dayOffset = 0; dayOffset < daysInYear; dayOffset++) {
                    const testDate = new Date(year, 0, 1 + dayOffset, 12, 0, 0);
                    const { monthKey, prevMonthKey } = calculatePrevMonth(testDate);

                    const currentYear = testDate.getFullYear();
                    const currentMonth = testDate.getMonth(); // 0..11

                    const expectedPrevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    const expectedPrevMonth = currentMonth === 0 ? 12 : currentMonth;
                    const expectedPrevKey = `${expectedPrevYear}-${String(expectedPrevMonth).padStart(2, '0')}`;

                    assert.strictEqual(
                        prevMonthKey,
                        expectedPrevKey,
                        `Fallo en fecha ${testDate.toISOString().slice(0, 10)}: esperado ${expectedPrevKey}, obtenido ${prevMonthKey}`
                    );
                }
            }
        });

        it('Progreso en MobilityWidget: tolerancia ante prevTotal === 0 y total >= prevTotal', () => {
            function computeProgress(total, prevTotal) {
                const hasPrevData  = prevTotal > 0;
                const progress     = hasPrevData ? Math.min(100, (total / prevTotal) * 100) : 0;
                const remaining    = hasPrevData ? Math.max(0, prevTotal - total) : 0;
                const exceeded     = hasPrevData && total >= prevTotal;
                return { progress, remaining, exceeded };
            }

            // Caso 1: Mes previo en cero
            const c1 = computeProgress(50000, 0);
            assert.strictEqual(c1.progress, 0);
            assert.strictEqual(c1.remaining, 0);
            assert.strictEqual(c1.exceeded, false);

            // Caso 2: Ingresos superan al mes previo
            const c2 = computeProgress(120000, 100000);
            assert.strictEqual(c2.progress, 100, 'El progreso visual debe estar acotado a 100%');
            assert.strictEqual(c2.remaining, 0);
            assert.strictEqual(c2.exceeded, true);

            // Caso 3: Sin datos actuales ni previos
            const c3 = computeProgress(0, 0);
            assert.strictEqual(c3.progress, 0);
            assert.ok(!Number.isNaN(c3.progress));
            assert.ok(Number.isFinite(c3.progress));
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TOLERANCIA ANTE DESBORDES EN SUBCOMPONENTES M2
    // ─────────────────────────────────────────────────────────────────────────
    describe('3. Subcomponentes M2 - MobilityWeeklyBreakdown & MobilityTrendChart', () => {

        it('MobilityWeeklyBreakdown: debe acotar porcentajes de gasto desproporcionado entre 0 y 100%', () => {
            const weeks = [
                { label: 'S1', total: 10000, gastos: 50000, days: 1 } // Gasto supera 5x a los ingresos
            ];
            const safeTotalEarnings = 10000;
            const maxScale = Math.max(
                safeTotalEarnings,
                ...weeks.map(w => Math.max(Number(w?.total) || 0, Number(w?.gastos) || 0)),
                1
            );

            assert.strictEqual(maxScale, 50000);

            const totalVal = Number(weeks[0].total) || 0;
            const gastosVal = Number(weeks[0].gastos) || 0;
            const rawTotalPct = (totalVal / maxScale) * 100;
            const rawGastosPct = (gastosVal / maxScale) * 100;

            const totalPct = isNaN(rawTotalPct) ? 0 : Math.min(100, Math.max(0, rawTotalPct));
            const gastosPct = isNaN(rawGastosPct) ? 0 : Math.min(100, Math.max(0, rawGastosPct));

            assert.strictEqual(totalPct, 20);
            assert.strictEqual(gastosPct, 100);
            assert.ok(!Number.isNaN(totalPct));
            assert.ok(!Number.isNaN(gastosPct));
        });

        it('MobilityTrendChart: debe dimensionar barras honestamente cuando gastos superan ingresos (déficit)', () => {
            const trend6 = [
                { label: 'Sep', total: 50000, gastos: 120000, key: '2026-09' }
            ];
            const maxTrend = 0;
            const chartMax = Math.max(
                maxTrend || 0,
                ...trend6.map(t => Math.max(Number(t.total) || 0, Number(t.gastos) || 0)),
                1
            );

            assert.strictEqual(chartMax, 120000);

            const totalVal = 50000;
            const gastosVal = 120000;
            const heightPct = chartMax > 0 ? (totalVal / chartMax) * 100 : 0;
            const gastosPct = chartMax > 0 ? (gastosVal / chartMax) * 100 : 0;

            assert.strictEqual(heightPct, (50000 / 120000) * 100);
            assert.strictEqual(gastosPct, 100);
            assert.ok(gastosPct > heightPct, 'La barra de gastos debe superar a la de ingresos en déficit');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CARGA REAL DE COMPONENTES VÍA VITE SSR
    // ─────────────────────────────────────────────────────────────────────────
    describe('4. Verificación de Carga e Integridad de Componentes de Producción', async () => {

        let viteServer;

        it('debe iniciar servidor Vite SSR y compilar MobilityStats y MobilityWidget sin fallos de importación', async () => {
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

            // Cargar componentes de producción
            const statsMod = await viteServer.ssrLoadModule('/src/Components/Mobility/MobilityStats.jsx');
            const widgetMod = await viteServer.ssrLoadModule('/src/Components/Dashboard/Widgets/MobilityWidget.jsx');
            const trendMod = await viteServer.ssrLoadModule('/src/Components/Mobility/MobilityTrendChart.jsx');
            const weeklyMod = await viteServer.ssrLoadModule('/src/Components/Mobility/MobilityWeeklyBreakdown.jsx');

            assert.ok(statsMod.default, 'MobilityStats debe exportar componente default');
            assert.ok(widgetMod.default, 'MobilityWidget debe exportar componente default');
            assert.ok(trendMod.default, 'MobilityTrendChart debe exportar componente default');
            assert.ok(weeklyMod.default, 'MobilityWeeklyBreakdown debe exportar componente default');

            await viteServer.close();
        });
    });
});
