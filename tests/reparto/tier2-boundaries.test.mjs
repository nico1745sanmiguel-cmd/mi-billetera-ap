/**
 * tests/reparto/tier2-boundaries.test.mjs
 * Tier 2: Boundary & Corner Cases (Casos límite, bordes y robustez adversarial)
 * 
 * Requisitos:
 * 1. 0 miembros en el hogar (min 5 casos)
 * 2. 1 miembro en el hogar (min 5 casos)
 * 3. 3+ miembros en el hogar (min 5 casos)
 * 4. Sueldos en cero o incompletos (min 5 casos)
 * 5. Salarios asimétricos extremos (min 5 casos)
 * 6. División por cero y total de gastos en 0 (min 5 casos)
 * 7. Inputs negativos, NaN e Infinity (min 5 casos)
 * 8. Montos decimales complejos y sanitización (min 5 casos)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularProporciones,
    calcularAportesExactos,
    obtenerTotalGastosCompartidos,
    calcularLiquidacionNeta,
    sanitizarMonto,
    getLatestSalary
} from './repartoContracts.mjs';

describe('Tier 2: Boundary & Corner Cases — Robustez y Límites Extremos', () => {

    // ─── 1. CERO MIEMBROS EN EL HOGAR ─────────────────────────────────────────
    describe('1. Cero Miembros en el Hogar', () => {
        it('1.1 Array de miembros vacío retorna array vacío sin excepción', () => {
            const res = calcularProporciones([], 'proportional');
            assert.deepStrictEqual(res, []);
        });

        it('1.2 Parámetro null o undefined retorna array vacío', () => {
            assert.deepStrictEqual(calcularProporciones(null), []);
            assert.deepStrictEqual(calcularProporciones(undefined), []);
        });

        it('1.3 calcularAportesExactos con 0 miembros retorna array vacío', () => {
            const res = calcularAportesExactos(50000, []);
            assert.deepStrictEqual(res, []);
        });

        it('1.4 calcularLiquidacionNeta con 0 miembros no crashea y retorna estructura vacía', () => {
            const res = calcularLiquidacionNeta([], [{ amount: 10000, paidByUid: 'u1' }], []);
            assert.strictEqual(res.totalGastos, 0);
            assert.deepStrictEqual(res.proporciones, []);
            assert.deepStrictEqual(res.balances, []);
            assert.deepStrictEqual(res.transferencias, []);
        });

        it('1.5 Parámetro no array (objeto o string) retorna array vacío', () => {
            assert.deepStrictEqual(calcularProporciones({}), []);
            assert.deepStrictEqual(calcularProporciones('invalido'), []);
        });
    });

    // ─── 2. UN SOLO MIEMBRO EN EL HOGAR ───────────────────────────────────────
    describe('2. Un Solo Miembro en el Hogar', () => {
        it('2.1 Miembro único con sueldo tiene proporción 1.0 y 100.0%', () => {
            const res = calcularProporciones([{ uid: 'u1', salaryHistory: [{ amount: 500000, date: '2026-09-01' }] }]);
            assert.strictEqual(res.length, 1);
            assert.strictEqual(res[0].proportion, 1.0);
            assert.strictEqual(res[0].percentage, 100.0);
            assert.strictEqual(res[0].hasIncompleteSalaries, false);
        });

        it('2.2 Miembro único sin sueldo (0) igual conserva 100% sin alerta de incompleto', () => {
            const res = calcularProporciones([{ uid: 'u1', salaryHistory: [] }]);
            assert.strictEqual(res[0].proportion, 1.0);
            assert.strictEqual(res[0].percentage, 100.0);
        });

        it('2.3 Gasto compartido de $250.000 se asigna 100% al único miembro', () => {
            const props = [{ uid: 'u1', proportion: 1.0 }];
            const aportes = calcularAportesExactos(250000, props);
            assert.strictEqual(aportes[0].aporte, 250000);
        });

        it('2.4 Miembro único que pagó sus propios gastos queda al día con 0 transferencias', () => {
            const m = [{ uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }];
            const gastos = [{ amount: 50000, paidByUid: 'u1' }];
            const res = calcularLiquidacionNeta(m, gastos, []);
            assert.strictEqual(res.balances[0].saldoNeto, 0);
            assert.strictEqual(res.balances[0].rol, 'al_dia');
            assert.strictEqual(res.transferencias.length, 0);
        });

        it('2.5 Miembro único con gastos impagos no genera transferencias huérfanas', () => {
            const m = [{ uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }];
            const gastos = [{ amount: 50000, paidByUid: 'otro' }];
            const res = calcularLiquidacionNeta(m, gastos, []);
            assert.strictEqual(res.transferencias.length, 0);
        });
    });

    // ─── 3. TRES O MÁS MIEMBROS EN EL HOGAR ───────────────────────────────────
    describe('3. Tres o Más Miembros en el Hogar', () => {
        it('3.1 Tres miembros equitativos: 1/3 cada uno y suma de porcentajes 100.0%', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 100, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 100, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 100, date: '2026-01-01' }] }
            ];
            const props = calcularProporciones(members, 'equal');
            assert.strictEqual(props.length, 3);
            const sumPct = Math.round(props.reduce((a, b) => a + b.percentage, 0) * 10) / 10;
            assert.strictEqual(sumPct, 100.0);
        });

        it('3.2 Cinco miembros equitativos: 20.0% cada uno sumando 100.0%', () => {
            const members = Array.from({ length: 5 }, (_, i) => ({
                uid: `u${i}`,
                salaryHistory: [{ amount: 500000, date: '2026-01-01' }]
            }));
            const props = calcularProporciones(members, 'equal');
            props.forEach(p => assert.strictEqual(p.percentage, 20.0));
        });

        it('3.3 Diez miembros en el hogar: suma de aportes coincide con gasto total', () => {
            const members = Array.from({ length: 10 }, (_, i) => ({
                uid: `u${i}`,
                proportion: 0.1
            }));
            const aportes = calcularAportesExactos(1234567, members);
            const totalAportes = aportes.reduce((sum, a) => sum + a.aporte, 0);
            assert.strictEqual(totalAportes, 1234567);
        });

        it('3.4 Cuatro miembros: 2 pagan y 2 deben, resuelve transferencias mínimas sin bucles', () => {
            const members = [
                { uid: 'u1', displayName: 'A', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', displayName: 'B', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u3', displayName: 'C', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u4', displayName: 'D', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            // Total 400k. Cuota 100k cada uno. A pagó 250k (+150k), B pagó 150k (+50k), C pagó 0 (-100k), D pagó 0 (-100k)
            const gastos = [
                { amount: 250000, paidByUid: 'u1' },
                { amount: 150000, paidByUid: 'u2' }
            ];
            const res = calcularLiquidacionNeta(members, gastos, [], 'equal');
            assert.strictEqual(res.transferencias.length, 3);
            const totalTransf = res.transferencias.reduce((sum, t) => sum + t.amount, 0);
            assert.strictEqual(totalTransf, 200000);
        });

        it('3.5 Ocho miembros con distribución impar y resto grande: sin pérdida de centavos', () => {
            const members = Array.from({ length: 8 }, (_, i) => ({
                uid: `u${i}`,
                proportion: 1 / 8
            }));
            const aportes = calcularAportesExactos(999999, members);
            assert.strictEqual(aportes.reduce((s, a) => s + a.aporte, 0), 999999);
        });
    });

    // ─── 4. SUELDOS EN CERO O INCOMPLETOS ──────────────────────────────────────
    describe('4. Sueldos en Cero o Incompletos', () => {
        it('4.1 Todos los miembros con sueldo 0 activan fallback equitativo y alerta', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 0, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 0, date: '2026-01-01' }] }
            ];
            const res = calcularProporciones(members, 'proportional');
            assert.strictEqual(res[0].proportion, 0.5);
            assert.strictEqual(res[1].proportion, 0.5);
            assert.strictEqual(res[0].hasIncompleteSalaries, true);
            assert.strictEqual(res[1].hasIncompleteSalaries, true);
        });

        it('4.2 Historial de sueldos vacío ([] o undefined) se computa como sueldo 0', () => {
            assert.strictEqual(getLatestSalary([]), 0);
            assert.strictEqual(getLatestSalary(undefined), 0);
            assert.strictEqual(getLatestSalary(null), 0);
        });

        it('4.3 Historial con amount: 0 o string "0" retorna 0', () => {
            assert.strictEqual(getLatestSalary([{ amount: 0, date: '2026-01-01' }]), 0);
            assert.strictEqual(getLatestSalary([{ amount: '0', date: '2026-01-01' }]), 0);
        });

        it('4.4 En modo equitativo explícito, sueldos en cero NO marcan hasIncompleteSalaries: true', () => {
            const members = [
                { uid: 'u1', salaryHistory: [] },
                { uid: 'u2', salaryHistory: [] }
            ];
            const res = calcularProporciones(members, 'equal');
            assert.strictEqual(res[0].hasIncompleteSalaries, false);
            assert.strictEqual(res[0].proportion, 0.5);
        });

        it('4.5 Miembro A con sueldo $1.000.000 y Miembro B con sueldo $0: activa hasIncompleteSalaries', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 1000000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [] }
            ];
            const res = calcularProporciones(members, 'proportional');
            assert.strictEqual(res[0].hasIncompleteSalaries, true);
            assert.strictEqual(res[0].proportion, 0.5, 'Debe aplicar fallback equitativo 50/50');
            assert.strictEqual(res[1].proportion, 0.5);
        });
    });

    // ─── 5. SALARIOS ASIMÉTRICOS EXTREMOS ──────────────────────────────────────
    describe('5. Salarios Asimétricos Extremos', () => {
        it('5.1 Asimetría extrema $5.000.000 vs $0 aplica fallback y previene abuso', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 5000000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 0, date: '2026-01-01' }] }
            ];
            const res = calcularProporciones(members, 'proportional');
            assert.strictEqual(res[0].hasIncompleteSalaries, true);
            assert.strictEqual(res[0].proportion, 0.5);
        });

        it('5.2 Relación 100 a 1 ($10.000.000 vs $100.000) calcula 99.0% y 1.0% sumando 100.0%', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 10000000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            const res = calcularProporciones(members, 'proportional');
            assert.strictEqual(res[0].percentage, 99.0);
            assert.strictEqual(res[1].percentage, 1.0);
            assert.strictEqual(res[0].percentage + res[1].percentage, 100.0);
        });

        it('5.3 Asimetría hiper extrema ($50.000.000 vs $1) no arroja NaN ni excede 100.0%', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 50000000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 1, date: '2026-01-01' }] }
            ];
            const res = calcularProporciones(members, 'proportional');
            assert.strictEqual(res[0].percentage + res[1].percentage, 100.0);
            assert.ok(res[0].percentage >= 99.9);
        });

        it('5.4 Tres miembros asimétricos ($20M, $500k, $500k) suman exactamente 100.0%', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 20000000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 500000, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 500000, date: '2026-01-01' }] }
            ];
            const res = calcularProporciones(members, 'proportional');
            const totalPct = Math.round(res.reduce((s, m) => s + m.percentage, 0) * 10) / 10;
            assert.strictEqual(totalPct, 100.0);
        });

        it('5.5 Gasto de $10 con asimetría 99% vs 1% reparte 10 y 0 sin crear dinero espurio', () => {
            const props = [
                { uid: 'u1', proportion: 0.99 },
                { uid: 'u2', proportion: 0.01 }
            ];
            const aportes = calcularAportesExactos(10, props);
            assert.strictEqual(aportes[0].aporte, 10);
            assert.strictEqual(aportes[1].aporte, 0);
            assert.strictEqual(aportes.reduce((s, a) => s + a.aporte, 0), 10);
        });
    });

    // ─── 6. DIVISIÓN POR CERO Y TOTAL DE GASTO EN 0 ───────────────────────────
    describe('6. División por Cero y Total de Gasto en 0', () => {
        it('6.1 calcularAportesExactos(0, props) retorna aporte 0 para todos', () => {
            const props = [{ uid: 'u1', proportion: 0.5 }, { uid: 'u2', proportion: 0.5 }];
            const res = calcularAportesExactos(0, props);
            assert.strictEqual(res[0].aporte, 0);
            assert.strictEqual(res[1].aporte, 0);
        });

        it('6.2 Monto negativo en total de gasto se sanea a 0 y retorna aportes 0', () => {
            const props = [{ uid: 'u1', proportion: 0.5 }, { uid: 'u2', proportion: 0.5 }];
            const res = calcularAportesExactos(-50000, props);
            assert.strictEqual(res[0].aporte, 0);
            assert.strictEqual(res[1].aporte, 0);
        });

        it('6.3 Gastos compartidos vacíos generan saldos en 0 y 0 transferencias', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            const res = calcularLiquidacionNeta(members, [], []);
            assert.strictEqual(res.totalGastos, 0);
            assert.strictEqual(res.balances[0].saldoNeto, 0);
            assert.strictEqual(res.transferencias.length, 0);
        });

        it('6.4 obtenerTotalGastosCompartidos sin parámetros retorna 0 en total y desglose', () => {
            const res = obtenerTotalGastosCompartidos();
            assert.strictEqual(res.total, 0);
            assert.strictEqual(res.breakdown.servicios, 0);
            assert.strictEqual(res.breakdown.tarjetas, 0);
            assert.strictEqual(res.breakdown.supermercado, 0);
            assert.strictEqual(res.breakdown.frescos, 0);
            assert.strictEqual(res.breakdown.efectivo, 0);
        });

        it('6.5 Total de sueldos 0 no genera Infinity ni NaN en calcularProporciones', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 0, date: '2026-01-01' }] }
            ];
            const res = calcularProporciones(members, 'proportional');
            assert.strictEqual(isFinite(res[0].proportion), true);
            assert.strictEqual(isNaN(res[0].proportion), false);
        });
    });

    // ─── 7. INPUTS NEGATIVOS, NAN E INFINITY ──────────────────────────────────
    describe('7. Inputs Negativos, NaN e Infinity', () => {
        it('7.1 sanitizarMonto(-500000) retorna 0', () => {
            assert.strictEqual(sanitizarMonto(-500000), 0);
        });

        it('7.2 sanitizarMonto(NaN) y sanitizarMonto(Infinity) retornan 0', () => {
            assert.strictEqual(sanitizarMonto(NaN), 0);
            assert.strictEqual(sanitizarMonto(Infinity), 0);
            assert.strictEqual(sanitizarMonto(-Infinity), 0);
        });

        it('7.3 sanitizarMonto("-150.000") en formato string retorna 0', () => {
            assert.strictEqual(sanitizarMonto('-150.000'), 0);
            assert.strictEqual(sanitizarMonto(' - $ 45.000 '), 0);
        });

        it('7.4 getLatestSalary con sueldo negativo se sanea a 0', () => {
            const history = [{ amount: -300000, date: '2026-01-01' }];
            assert.strictEqual(getLatestSalary(history), 0);
        });

        it('7.5 Gastos con amount: Infinity o NaN no rompen liquidación y se sanean a 0', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            const gastos = [
                { amount: Infinity, paidByUid: 'u1' },
                { amount: NaN, paidByUid: 'u2' },
                { amount: 40000, paidByUid: 'u1' }
            ];
            const res = calcularLiquidacionNeta(members, gastos, []);
            assert.strictEqual(res.totalGastos, 40000);
            assert.strictEqual(res.balances[0].totalPagado, 40000);
            assert.strictEqual(res.balances[1].totalPagado, 0);
        });
    });

    // ─── 8. MONTOS DECIMALES COMPLEJOS Y SANITIZACIÓN ─────────────────────────
    describe('8. Montos Decimales Complejos y Sanitización', () => {
        it('8.1 Sanitiza formato argentino con punto de miles y coma decimal "1.250.000,50"', () => {
            assert.strictEqual(sanitizarMonto('1.250.000,50'), 1250000.5);
        });

        it('8.2 Sanitiza texto con prefijo de moneda y sufijo "$ 85.400,00 ARS"', () => {
            assert.strictEqual(sanitizarMonto('$ 85.400,00 ARS'), 85400.0);
        });

        it('8.3 Sanitiza decimales simples con coma "35,99"', () => {
            assert.strictEqual(sanitizarMonto('35,99'), 35.99);
        });

        it('8.4 Gastos con decimales se consolidan correctamente en el selector', () => {
            const frescos = [{ amount: '1250,50' }, { amount: '749,50' }];
            const res = obtenerTotalGastosCompartidos([], [], [], frescos, []);
            assert.strictEqual(res.total, 2000.0);
        });

        it('8.5 calcularAportesExactos con total decimal se redondea coherentemente al entero', () => {
            const props = [{ uid: 'u1', proportion: 0.5 }, { uid: 'u2', proportion: 0.5 }];
            const aportes = calcularAportesExactos(99.99, props); // Redondea a 100
            assert.strictEqual(aportes.reduce((s, a) => s + a.aporte, 0), 100);
        });
    });
});
