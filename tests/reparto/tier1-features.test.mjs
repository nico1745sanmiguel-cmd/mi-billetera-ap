/**
 * tests/reparto/tier1-features.test.mjs
 * Tier 1: Feature Coverage (Cobertura completa de funcionalidades aisladas)
 * 
 * Requisitos:
 * 1. Cálculo de proporciones salariales (min 5 casos)
 * 2. Aportes exactos sin drift monetario (min 5 casos)
 * 3. Suma de porcentajes 100.0% mediante Largest Remainder (min 5 casos)
 * 4. Selector unificado de gastos compartidos (min 5 casos)
 * 5. Balances netos de acreedores y deudores (min 5 casos)
 * 6. Transferencias de liquidación ("Quién debe a quién") (min 5 casos)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularProporciones,
    calcularAportesExactos,
    obtenerTotalGastosCompartidos,
    calcularLiquidacionNeta,
    getLatestSalary
} from './repartoContracts.mjs';

describe('Tier 1: Feature Coverage — Módulo Grupo Familiar y Reparto', () => {

    // ─── 1. CÁLCULO DE PROPORCIONES SALARIALES ────────────────────────────────
    describe('1. Cálculo de Proporciones Salariales', () => {
        it('1.1 Dos miembros con sueldos idénticos deben tener proporciones 50/50', () => {
            const members = [
                { uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 1000000, date: '2026-09-01' }] },
                { uid: 'u2', displayName: 'Cami', salaryHistory: [{ amount: 1000000, date: '2026-09-01' }] }
            ];
            const props = calcularProporciones(members, 'proportional');
            assert.strictEqual(props.length, 2);
            assert.strictEqual(props[0].proportion, 0.5);
            assert.strictEqual(props[1].proportion, 0.5);
            assert.strictEqual(props[0].percentage, 50.0);
            assert.strictEqual(props[1].percentage, 50.0);
            assert.strictEqual(props[0].hasIncompleteSalaries, false);
        });

        it('1.2 Dos miembros con sueldos asimétricos 60/40 deben reflejar exactamente esas proporciones', () => {
            const members = [
                { uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 600000, date: '2026-09-01' }] },
                { uid: 'u2', displayName: 'Cami', salaryHistory: [{ amount: 400000, date: '2026-09-01' }] }
            ];
            const props = calcularProporciones(members, 'proportional');
            assert.strictEqual(props[0].proportion, 0.6);
            assert.strictEqual(props[1].proportion, 0.4);
            assert.strictEqual(props[0].percentage, 60.0);
            assert.strictEqual(props[1].percentage, 40.0);
        });

        it('1.3 Tres miembros con sueldos escalonados (500k, 300k, 200k) deben dar 50%, 30% y 20%', () => {
            const members = [
                { uid: 'u1', displayName: 'A', salaryHistory: [{ amount: 500000, date: '2026-09-01' }] },
                { uid: 'u2', displayName: 'B', salaryHistory: [{ amount: 300000, date: '2026-09-01' }] },
                { uid: 'u3', displayName: 'C', salaryHistory: [{ amount: 200000, date: '2026-09-01' }] }
            ];
            const props = calcularProporciones(members, 'proportional');
            assert.strictEqual(props[0].proportion, 0.5);
            assert.strictEqual(props[1].proportion, 0.3);
            assert.strictEqual(props[2].proportion, 0.2);
            assert.strictEqual(props[0].percentage, 50.0);
            assert.strictEqual(props[1].percentage, 30.0);
            assert.strictEqual(props[2].percentage, 20.0);
        });

        it('1.4 Un solo miembro en el hogar debe recibir 100% de proporción y cuota', () => {
            const members = [
                { uid: 'u1', displayName: 'Solo', salaryHistory: [{ amount: 850000, date: '2026-09-01' }] }
            ];
            const props = calcularProporciones(members, 'proportional');
            assert.strictEqual(props.length, 1);
            assert.strictEqual(props[0].proportion, 1.0);
            assert.strictEqual(props[0].percentage, 100.0);
        });

        it('1.5 Debe seleccionar siempre la fecha ISO más reciente del historial de sueldos', () => {
            const history = [
                { amount: 500000, date: '2026-01-15' },
                { amount: 850000, date: '2026-09-01' }, // Más reciente
                { amount: 650000, date: '2026-05-10' }
            ];
            const latest = getLatestSalary(history);
            assert.strictEqual(latest, 850000);
        });
    });

    // ─── 2. APORTES EXACTOS SIN DRIFT MONETARIO ───────────────────────────────
    describe('2. Aportes Exactos sin Drift Monetario (Largest Remainder)', () => {
        it('2.1 Total exacto divisible: $100 entre 2 miembros 50/50 debe dar 50 y 50', () => {
            const props = [
                { uid: 'u1', proportion: 0.5 },
                { uid: 'u2', proportion: 0.5 }
            ];
            const aportes = calcularAportesExactos(100, props);
            assert.strictEqual(aportes[0].aporte, 50);
            assert.strictEqual(aportes[1].aporte, 50);
            assert.strictEqual(aportes.reduce((acc, a) => acc + a.aporte, 0), 100);
        });

        it('2.2 Total impar ($101) al 50/50: suma exactamente $101 sin crear dinero espurio', () => {
            const props = [
                { uid: 'u1', proportion: 0.5 },
                { uid: 'u2', proportion: 0.5 }
            ];
            const aportes = calcularAportesExactos(101, props);
            const sum = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.strictEqual(sum, 101, 'La suma debe ser exactamente 101');
            assert.ok(
                (aportes[0].aporte === 51 && aportes[1].aporte === 50) ||
                (aportes[0].aporte === 50 && aportes[1].aporte === 51)
            );
        });

        it('2.3 $1.000 entre 3 miembros iguales (1/3 c/u): suma exactamente $1.000', () => {
            const props = [
                { uid: 'u1', proportion: 1 / 3 },
                { uid: 'u2', proportion: 1 / 3 },
                { uid: 'u3', proportion: 1 / 3 }
            ];
            const aportes = calcularAportesExactos(1000, props);
            const sum = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.strictEqual(sum, 1000, 'La suma debe ser exactamente 1.000');
            assert.strictEqual(aportes[0].aporte, 334);
            assert.strictEqual(aportes[1].aporte, 333);
            assert.strictEqual(aportes[2].aporte, 333);
        });

        it('2.4 $10.003 en proporción asimétrica 60/40: suma exactamente $10.003', () => {
            const props = [
                { uid: 'u1', proportion: 0.6 },
                { uid: 'u2', proportion: 0.4 }
            ];
            const aportes = calcularAportesExactos(10003, props);
            const sum = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.strictEqual(sum, 10003);
            assert.strictEqual(aportes[0].aporte, 6002);
            assert.strictEqual(aportes[1].aporte, 4001);
        });

        it('2.5 $77.777 entre 4 miembros iguales (25% c/u): suma exactamente $77.777', () => {
            const props = [
                { uid: 'u1', proportion: 0.25 },
                { uid: 'u2', proportion: 0.25 },
                { uid: 'u3', proportion: 0.25 },
                { uid: 'u4', proportion: 0.25 }
            ];
            const aportes = calcularAportesExactos(77777, props);
            const sum = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.strictEqual(sum, 77777);
            assert.strictEqual(aportes[0].aporte, 19445);
            assert.strictEqual(aportes[1].aporte, 19444);
            assert.strictEqual(aportes[2].aporte, 19444);
            assert.strictEqual(aportes[3].aporte, 19444);
        });
    });

    // ─── 3. SUMA DE PORCENTAJES EXACTA 100.0% ────────────────────────────────
    describe('3. Suma de Porcentajes Exacta 100.0% (Largest Remainder)', () => {
        it('3.1 Tres integrantes iguales deben sumar exactamente 100.0% (33.4%, 33.3%, 33.3%)', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 100, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 100, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 100, date: '2026-01-01' }] }
            ];
            const props = calcularProporciones(members, 'equal');
            const totalPct = Math.round(props.reduce((acc, p) => acc + p.percentage, 0) * 10) / 10;
            assert.strictEqual(totalPct, 100.0);
            assert.strictEqual(props[0].percentage, 33.4);
            assert.strictEqual(props[1].percentage, 33.3);
            assert.strictEqual(props[2].percentage, 33.3);
        });

        it('3.2 Seis integrantes en modo equitativo deben sumar exactamente 100.0%', () => {
            const members = Array.from({ length: 6 }, (_, i) => ({
                uid: `u${i + 1}`,
                salaryHistory: [{ amount: 200000, date: '2026-01-01' }]
            }));
            const props = calcularProporciones(members, 'equal');
            const totalPct = Math.round(props.reduce((acc, p) => acc + p.percentage, 0) * 10) / 10;
            assert.strictEqual(totalPct, 100.0);
        });

        it('3.3 Siete integrantes en modo equitativo deben sumar exactamente 100.0%', () => {
            const members = Array.from({ length: 7 }, (_, i) => ({
                uid: `u${i + 1}`,
                salaryHistory: [{ amount: 300000, date: '2026-01-01' }]
            }));
            const props = calcularProporciones(members, 'equal');
            const totalPct = Math.round(props.reduce((acc, p) => acc + p.percentage, 0) * 10) / 10;
            assert.strictEqual(totalPct, 100.0);
        });

        it('3.4 Sueldos impares complejos (1.111.111, 2.222.222, 3.333.333) deben sumar 100.0%', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 1111111, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 2222222, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 3333333, date: '2026-01-01' }] }
            ];
            const props = calcularProporciones(members, 'proportional');
            const totalPct = Math.round(props.reduce((acc, p) => acc + p.percentage, 0) * 10) / 10;
            assert.strictEqual(totalPct, 100.0);
        });

        it('3.5 Cinco miembros con sueldos arbitrarios deben sumar exactamente 100.0%', () => {
            const members = [
                { uid: 'u1', salaryHistory: [{ amount: 412500, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 198300, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 550000, date: '2026-01-01' }] },
                { uid: 'u4', salaryHistory: [{ amount: 320400, date: '2026-01-01' }] },
                { uid: 'u5', salaryHistory: [{ amount: 275800, date: '2026-01-01' }] }
            ];
            const props = calcularProporciones(members, 'proportional');
            const totalPct = Math.round(props.reduce((acc, p) => acc + p.percentage, 0) * 10) / 10;
            assert.strictEqual(totalPct, 100.0);
        });
    });

    // ─── 4. SELECTOR UNIFICADO DE GASTOS COMPARTIDOS ──────────────────────────
    describe('4. Selector Unificado de Gastos Compartidos', () => {
        it('4.1 Debe consolidar servicios fijos y cuotas de tarjetas', () => {
            const servicios = [{ amount: 15000 }, { amount: 25000 }];
            const tarjetas = [{ monthlyInstallment: 50000 }];
            const result = obtenerTotalGastosCompartidos(servicios, tarjetas, [], [], []);
            assert.strictEqual(result.total, 90000);
            assert.strictEqual(result.breakdown.servicios, 40000);
            assert.strictEqual(result.breakdown.tarjetas, 50000);
        });

        it('4.2 Debe consolidar compras de supermercado y frescos', () => {
            const superItems = [{ price: 2000, quantity: 3 }, { amount: 14000 }]; // 6000 + 14000 = 20000
            const frescos = [{ amount: 8500 }];
            const result = obtenerTotalGastosCompartidos([], [], superItems, frescos, []);
            assert.strictEqual(result.total, 28500);
            assert.strictEqual(result.breakdown.supermercado, 20000);
            assert.strictEqual(result.breakdown.frescos, 8500);
        });

        it('4.3 Debe incluir gastos compartidos manuales en efectivo', () => {
            const efectivo = [{ amount: 12000 }, { amount: 4500 }];
            const result = obtenerTotalGastosCompartidos([], [], [], [], efectivo);
            assert.strictEqual(result.total, 16500);
            assert.strictEqual(result.breakdown.efectivo, 16500);
        });

        it('4.4 Desglose de las 5 categorías debe cuadrar exactamente con el total', () => {
            const result = obtenerTotalGastosCompartidos(
                [{ amount: 10000 }],
                [{ amount: 20000 }],
                [{ amount: 30000 }],
                [{ amount: 5000 }],
                [{ amount: 15000 }]
            );
            const sumBreakdown = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
            assert.strictEqual(result.total, 80000);
            assert.strictEqual(sumBreakdown, 80000);
        });

        it('4.5 Manejo resiliente de arrays vacíos, undefined o valores corruptos sin romper', () => {
            const result = obtenerTotalGastosCompartidos(null, undefined, [{ amount: 'corrupto' }], [], [null]);
            assert.strictEqual(result.total, 0);
            assert.strictEqual(result.breakdown.supermercado, 0);
        });
    });

    // ─── 5. BALANCES NETOS DE ACREEDORES Y DEUDORES ───────────────────────────
    describe('5. Balances Netos de Acreedores y Deudores', () => {
        const miembros2 = [
            { uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 1000000, date: '2026-09-01' }] },
            { uid: 'u2', displayName: 'Cami', salaryHistory: [{ amount: 1000000, date: '2026-09-01' }] }
        ];

        it('5.1 Si el Miembro A pagó el 100% de los gastos, A es acreedor y B es deudor', () => {
            const gastos = [{ id: 'g1', amount: 100000, paidByUid: 'u1' }];
            const res = calcularLiquidacionNeta(miembros2, gastos, [], 'equal');

            const nico = res.balances.find(b => b.uid === 'u1');
            const cami = res.balances.find(b => b.uid === 'u2');

            assert.strictEqual(nico.totalPagado, 100000);
            assert.strictEqual(nico.totalDebe, 50000);
            assert.strictEqual(nico.saldoNeto, 50000);
            assert.strictEqual(nico.rol, 'acreedor');

            assert.strictEqual(cami.totalPagado, 0);
            assert.strictEqual(cami.totalDebe, 50000);
            assert.strictEqual(cami.saldoNeto, -50000);
            assert.strictEqual(cami.rol, 'deudor');
        });

        it('5.2 Si ambos pagaron exactamente su cuota teórica, ambos quedan al día con saldo 0', () => {
            const gastos = [
                { id: 'g1', amount: 50000, paidByUid: 'u1' },
                { id: 'g2', amount: 50000, paidByUid: 'u2' }
            ];
            const res = calcularLiquidacionNeta(miembros2, gastos, [], 'equal');
            res.balances.forEach(b => {
                assert.strictEqual(b.saldoNeto, 0);
                assert.strictEqual(b.rol, 'al_dia');
            });
        });

        it('5.3 Pagos asimétricos cruzados deben arrojar el saldo neto diferencial', () => {
            // Nico pagó 70k, Cami pagó 30k. Cuota es 50k cada uno.
            // Nico: 70k - 50k = +20k (acreedor)
            // Cami: 30k - 50k = -20k (deudor)
            const gastos = [
                { id: 'g1', amount: 70000, paidByUid: 'u1' },
                { id: 'g2', amount: 30000, paidByUid: 'u2' }
            ];
            const res = calcularLiquidacionNeta(miembros2, gastos, [], 'equal');
            const nico = res.balances.find(b => b.uid === 'u1');
            const cami = res.balances.find(b => b.uid === 'u2');
            assert.strictEqual(nico.saldoNeto, 20000);
            assert.strictEqual(cami.saldoNeto, -20000);
        });

        it('5.4 Tres miembros con pagos cruzados deben definir con precisión acreedores y deudores', () => {
            const miembros3 = [
                { uid: 'u1', displayName: 'A', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', displayName: 'B', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u3', displayName: 'C', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            // Total 300k. Cuota 100k cada uno.
            // A pagó 200k (+100k)
            // B pagó 100k (0)
            // C pagó 0 (-100k)
            const gastos = [{ id: 'g1', amount: 300000, paidByUid: 'u1' }, { id: 'g2', amount: 0, paidByUid: 'u2' }];
            const aportes = [{ id: 'a1', uid: 'u2', amount: 100000 }];
            const res = calcularLiquidacionNeta(miembros3, gastos, aportes, 'equal');

            const a = res.balances.find(b => b.uid === 'u1');
            const b = res.balances.find(b => b.uid === 'u2');
            const c = res.balances.find(b => b.uid === 'u3');

            assert.strictEqual(a.rol, 'acreedor');
            assert.strictEqual(b.rol, 'al_dia');
            assert.strictEqual(c.rol, 'deudor');
        });

        it('5.5 Invariante fundamental de conservación monetaria: suma de saldos netos = 0', () => {
            const miembros4 = [
                { uid: 'u1', salaryHistory: [{ amount: 400000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 300000, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 200000, date: '2026-01-01' }] },
                { uid: 'u4', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            const gastos = [
                { id: 'g1', amount: 123456, paidByUid: 'u1' },
                { id: 'g2', amount: 65432, paidByUid: 'u3' }
            ];
            const res = calcularLiquidacionNeta(miembros4, gastos, [], 'proportional');
            const sumSaldos = res.balances.reduce((acc, b) => acc + b.saldoNeto, 0);
            assert.strictEqual(sumSaldos, 0, 'La suma de saldos netos debe ser cero');
        });
    });

    // ─── 6. TRANSFERENCIAS DE LIQUIDACIÓN ─────────────────────────────────────
    describe('6. Transferencias de Liquidación ("Quién le debe a quién")', () => {
        it('6.1 Hogar de 2: Genera exactamente 1 transferencia de deudor a acreedor por el saldo neto', () => {
            const miembros = [
                { uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 1000000, date: '2026-01-01' }] },
                { uid: 'u2', displayName: 'Cami', salaryHistory: [{ amount: 1000000, date: '2026-01-01' }] }
            ];
            const gastos = [{ id: 'g1', amount: 120000, paidByUid: 'u1' }]; // Cuota 60k c/u
            const res = calcularLiquidacionNeta(miembros, gastos, [], 'equal');

            assert.strictEqual(res.transferencias.length, 1);
            const t = res.transferencias[0];
            assert.strictEqual(t.fromUid, 'u2');
            assert.strictEqual(t.toUid, 'u1');
            assert.strictEqual(t.amount, 60000);
        });

        it('6.2 Hogar de 3: Dos deudores transfieren al único acreedor', () => {
            const miembros = [
                { uid: 'u1', displayName: 'A', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', displayName: 'B', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u3', displayName: 'C', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            // Total 300k pagado todo por A. Cuota 100k cada uno. B y C deben transferir 100k a A.
            const gastos = [{ id: 'g1', amount: 300000, paidByUid: 'u1' }];
            const res = calcularLiquidacionNeta(miembros, gastos, [], 'equal');

            assert.strictEqual(res.transferencias.length, 2);
            assert.strictEqual(res.transferencias[0].toUid, 'u1');
            assert.strictEqual(res.transferencias[1].toUid, 'u1');
            const totalTransferido = res.transferencias.reduce((acc, t) => acc + t.amount, 0);
            assert.strictEqual(totalTransferido, 200000);
        });

        it('6.3 Hogar de 3: Un deudor principal compensa a dos acreedores', () => {
            const miembros = [
                { uid: 'u1', displayName: 'A', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', displayName: 'B', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u3', displayName: 'C', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            // Total 300k. Cuota 100k c/u.
            // A pagó 160k (+60k)
            // B pagó 140k (+40k)
            // C pagó 0 (-100k)
            const gastos = [
                { id: 'g1', amount: 160000, paidByUid: 'u1' },
                { id: 'g2', amount: 140000, paidByUid: 'u2' }
            ];
            const res = calcularLiquidacionNeta(miembros, gastos, [], 'equal');
            assert.strictEqual(res.transferencias.length, 2);
            assert.strictEqual(res.transferencias.every(t => t.fromUid === 'u3'), true);
            const totalTransferido = res.transferencias.reduce((acc, t) => acc + t.amount, 0);
            assert.strictEqual(totalTransferido, 100000);
        });

        it('6.4 Suma total de las transferencias liquida exactamente la deuda global', () => {
            const miembros = [
                { uid: 'u1', salaryHistory: [{ amount: 500000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 300000, date: '2026-01-01' }] },
                { uid: 'u3', salaryHistory: [{ amount: 200000, date: '2026-01-01' }] }
            ];
            const gastos = [{ id: 'g1', amount: 500000, paidByUid: 'u1' }];
            const res = calcularLiquidacionNeta(miembros, gastos, [], 'proportional');
            const totalDeuda = res.balances.filter(b => b.saldoNeto < 0).reduce((acc, b) => acc + Math.abs(b.saldoNeto), 0);
            const totalTransf = res.transferencias.reduce((acc, t) => acc + t.amount, 0);
            assert.strictEqual(totalTransf, totalDeuda);
        });

        it('6.5 Si todos los miembros están al día, no se genera ninguna transferencia', () => {
            const miembros = [
                { uid: 'u1', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
                { uid: 'u2', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
            ];
            const gastos = [
                { id: 'g1', amount: 50000, paidByUid: 'u1' },
                { id: 'g2', amount: 50000, paidByUid: 'u2' }
            ];
            const res = calcularLiquidacionNeta(miembros, gastos, [], 'equal');
            assert.strictEqual(res.transferencias.length, 0);
        });
    });
});
