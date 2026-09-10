/**
 * tests/reparto/tier5-adversarial.test.mjs
 * Tier 5: Adversarial Stress-Testing & Empirical Fuzzing Suite
 * 
 * Verificación empírica exhaustiva del núcleo matemático de reparto:
 * - src/utils/salaryUtils.js
 * - src/utils/repartoUtils.js
 * 
 * Desafíos adversarial:
 * 1. Fuzzing de sueldos con valores extremos: $0, $1, 10 decimales, millones, NaN, Infinity, negativos.
 * 2. Suma estricta de porcentajes: Colecciones de 2, 3, 4, 5, 7 y 10 miembros siempre dan exactamente 100.0%.
 * 3. Conservación monetaria: Gastos de $1, $101, $999.99, $1.000.000 en proporciones asimétricas sin pérdida ni creación de dinero.
 * 4. Fuzzing masivo (10.000 casos Monte Carlo) para invariantes matemáticas fundamentales.
 * 5. Liquidación neta y Min Cash Flow: no bucles, no auto-transferencias, conservación de flujo de caja.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    getLatestSalary,
    calcularAporte
} from '../../src/utils/salaryUtils.js';

import {
    calcularProporciones,
    calcularAportesExactos,
    calcularLiquidacionNeta,
    obtenerTotalGastosCompartidos,
    obtenerDesgloseGastosCompartidos
} from '../../src/utils/repartoUtils.js';

describe('Tier 5: Adversarial Stress-Testing & Empirical Fuzzing Suite', () => {

    // ─── 1. FUZZING DE SUELDOS CON VALORES EXTREMOS ─────────────────────────────
    describe('1. Fuzzing de Sueldos y Sanitización Numérica', () => {

        it('1.1 getLatestSalary: maneja valores extremos, NaN, Infinity y negativos', () => {
            // Casos vacíos y primitivos
            assert.strictEqual(getLatestSalary([]), 0);
            assert.strictEqual(getLatestSalary(null), 0);
            assert.strictEqual(getLatestSalary(undefined), 0);
            assert.strictEqual(getLatestSalary('not an array'), 0);
            assert.strictEqual(getLatestSalary([{}]), 0);
            assert.strictEqual(getLatestSalary([{ date: '2026-09-01' }]), 0);

            // Valores no numéricos, NaN, Infinity y negativos
            assert.strictEqual(getLatestSalary([{ amount: NaN, date: '2026-09-01' }]), 0);
            assert.strictEqual(getLatestSalary([{ amount: Infinity, date: '2026-09-01' }]), 0);
            assert.strictEqual(getLatestSalary([{ amount: -Infinity, date: '2026-09-01' }]), 0);
            assert.strictEqual(getLatestSalary([{ amount: -500000, date: '2026-09-01' }]), 0);
            assert.strictEqual(getLatestSalary([{ amount: 0, date: '2026-09-01' }]), 0);
            assert.strictEqual(getLatestSalary([{ amount: 'invalido', date: '2026-09-01' }]), 0);

            // Valores extremos válidos
            assert.strictEqual(getLatestSalary([{ amount: 1, date: '2026-09-01' }]), 1);
            assert.strictEqual(getLatestSalary([{ amount: 50000000, date: '2026-09-01' }]), 50000000);
            assert.strictEqual(getLatestSalary([{ amount: 123456.1234567891, date: '2026-09-01' }]), 123456.1234567891);

            // Orden cronológico: el más reciente por fecha prevalece
            const history = [
                { amount: 100000, date: '2026-01-01' },
                { amount: 300000, date: '2026-09-01' },
                { amount: 200000, date: '2026-05-01' }
            ];
            assert.strictEqual(getLatestSalary(history), 300000);

            // Si el más reciente es 0 o negativo, debe devolver 0
            const historyLatestZero = [
                { amount: 500000, date: '2026-01-01' },
                { amount: 0, date: '2026-09-01' }
            ];
            assert.strictEqual(getLatestSalary(historyLatestZero), 0);
        });

        it('1.2 calcularProporciones: resiliencia ante sueldos con valores adversarios', () => {
            const extremeMembers = [
                { uid: 'u1', displayName: 'Zero', salary: 0 },
                { uid: 'u2', displayName: 'OneDollar', salary: 1 },
                { uid: 'u3', displayName: 'TenDecimals', salary: 123456.1234567891 },
                { uid: 'u4', displayName: 'Millions', salary: 85000000 },
                { uid: 'u5', displayName: 'NotANumber', salary: NaN },
                { uid: 'u6', displayName: 'Infinite', salary: Infinity },
                { uid: 'u7', displayName: 'Negative', salary: -999999 }
            ];

            // En modo proporcional, como u1, u5, u6 y u7 tienen sueldo 0/inválido,
            // debe activar hasIncompleteSalaries y fallback equitativo (1/7)
            const resProp = calcularProporciones(extremeMembers, 'proportional');
            assert.strictEqual(resProp.length, 7);
            assert.strictEqual(resProp.hasIncompleteSalaries, true);
            assert.strictEqual(resProp[0].hasIncompleteSalaries, true);

            // Suma de porcentajes debe ser exactamente 100.0%
            const sumPct = resProp.reduce((acc, m) => acc + m.percentage, 0);
            assert.strictEqual(Math.round(sumPct * 10) / 10, 100.0);

            // Cada miembro recibe 1/7
            for (const m of resProp) {
                assert.strictEqual(m.proportion, 1 / 7);
                assert.ok(Number.isFinite(m.percentage));
            }

            // En modo equitativo ('equal')
            const resEqual = calcularProporciones(extremeMembers, 'equal');
            assert.strictEqual(resEqual.length, 7);
            assert.strictEqual(resEqual.hasIncompleteSalaries, false);
            const sumEqualPct = resEqual.reduce((acc, m) => acc + m.percentage, 0);
            assert.strictEqual(Math.round(sumEqualPct * 10) / 10, 100.0);
        });

        it('1.3 Fuzzing Monte Carlo (1000 iteraciones) de sueldos con valores aleatorios extremos', () => {
            const possibleValues = [
                0, 1, 0.0000000001, 999999999.9999999, NaN, Infinity, -100, -1e8,
                100000, 350000.55, 1200000, 45000000
            ];

            for (let i = 0; i < 1000; i++) {
                const memberCount = Math.floor(Math.random() * 9) + 2; // 2 a 10 miembros
                const members = [];
                for (let j = 0; j < memberCount; j++) {
                    const val = possibleValues[Math.floor(Math.random() * possibleValues.length)];
                    members.push({
                        uid: `u_${j}`,
                        displayName: `Membro ${j}`,
                        salary: val
                    });
                }

                const res = calcularProporciones(members, 'proportional');
                assert.strictEqual(res.length, memberCount);

                // Invariante 1: Ningún porcentaje es NaN ni negativo
                for (const m of res) {
                    assert.ok(Number.isFinite(m.percentage), `Percentage no es finito: ${m.percentage}`);
                    assert.ok(m.percentage >= 0, `Percentage es negativo: ${m.percentage}`);
                    assert.ok(Number.isFinite(m.proportion), `Proportion no es finito: ${m.proportion}`);
                    assert.ok(m.proportion >= 0, `Proportion es negativo: ${m.proportion}`);
                }

                // Invariante 2: La suma de proporciones es 1.0 (dentro de tolerancia numérica)
                const sumProp = res.reduce((acc, m) => acc + m.proportion, 0);
                assert.ok(Math.abs(sumProp - 1.0) < 1e-9, `Suma de proporciones != 1.0: ${sumProp}`);

                // Invariante 3: La suma de porcentajes es EXACTAMENTE 100.0%
                const sumPct = res.reduce((acc, m) => acc + m.percentage, 0);
                assert.strictEqual(Math.round(sumPct * 10) / 10, 100.0, `Suma porcentajes != 100.0: ${sumPct}`);
            }
        });
    });

    // ─── 2. SUMA ESTRICTA DE PORCENTAJES (2, 3, 4, 5, 7, 10 MIEMBROS) ───────────
    describe('2. Suma Estricta de Porcentajes al 100.0% Exacto (Hare-Niemeyer)', () => {

        const memberCounts = [2, 3, 4, 5, 7, 10];

        it('2.1 Distribución equitativa: 2, 3, 4, 5, 7 y 10 miembros suman exactamente 100.0%', () => {
            for (const n of memberCounts) {
                const members = Array.from({ length: n }, (_, i) => ({
                    uid: `u_${i}`,
                    displayName: `Miembro ${i}`,
                    salary: 1000000 // idénticos
                }));

                const res = calcularProporciones(members, 'equal');
                assert.strictEqual(res.length, n);

                const sumPct = res.reduce((acc, m) => acc + m.percentage, 0);
                assert.strictEqual(
                    Math.round(sumPct * 10) / 10,
                    100.0,
                    `Fallo en suma equitativa para n=${n}: ${sumPct}`
                );

                // En n=3: dos miembros con 33.3% y uno con 33.4% -> 100.0%
                if (n === 3) {
                    const sortedPcts = res.map(m => m.percentage).sort();
                    assert.deepStrictEqual(sortedPcts, [33.3, 33.3, 33.4]);
                }

                // En n=7: 100 / 7 = 14.2857... Hare-Niemeyer asigna 14.3 a dos y 14.3 a otros...
                if (n === 7) {
                    const totalTenths = res.reduce((acc, m) => acc + Math.round(m.percentage * 10), 0);
                    assert.strictEqual(totalTenths, 1000);
                }
            }
        });

        it('2.2 Distribución asimétrica con números primos: suma EXACTA de 100.0%', () => {
            const primeSalaries = [101, 103, 107, 109, 113, 127, 131, 137, 139, 149];

            for (const n of memberCounts) {
                const members = Array.from({ length: n }, (_, i) => ({
                    uid: `u_${i}`,
                    displayName: `Miembro ${i}`,
                    salary: primeSalaries[i]
                }));

                const res = calcularProporciones(members, 'proportional');
                assert.strictEqual(res.length, n);
                assert.strictEqual(res.hasIncompleteSalaries, false);

                const sumPct = res.reduce((acc, m) => acc + m.percentage, 0);
                assert.strictEqual(
                    Math.round(sumPct * 10) / 10,
                    100.0,
                    `Fallo en suma asimétrica prima para n=${n}: ${sumPct}`
                );
            }
        });

        it('2.3 Distribución hiper-asimétrica (1 millonario y N-1 de $1): suma EXACTA de 100.0%', () => {
            for (const n of memberCounts) {
                const members = Array.from({ length: n }, (_, i) => ({
                    uid: `u_${i}`,
                    displayName: `Miembro ${i}`,
                    salary: i === 0 ? 50000000 : 1
                }));

                const res = calcularProporciones(members, 'proportional');
                assert.strictEqual(res.length, n);
                assert.strictEqual(res.hasIncompleteSalaries, false);

                const sumPct = res.reduce((acc, m) => acc + m.percentage, 0);
                assert.strictEqual(
                    Math.round(sumPct * 10) / 10,
                    100.0,
                    `Fallo en hiper-asimetría para n=${n}: ${sumPct}`
                );

                // El millonario debe tener 100.0% y los demás 0.0%, o según redondeo exacto
                assert.strictEqual(res[0].percentage, 100.0);
                for (let i = 1; i < n; i++) {
                    assert.strictEqual(res[i].percentage, 0.0);
                }
            }
        });

        it('2.4 Fuzzing Monte Carlo (5000 iteraciones) de suma de porcentajes con pesos aleatorios', () => {
            for (let i = 0; i < 5000; i++) {
                const n = memberCounts[Math.floor(Math.random() * memberCounts.length)];
                const members = Array.from({ length: n }, (_, idx) => ({
                    uid: `u_${idx}`,
                    displayName: `Miembro ${idx}`,
                    salary: Math.floor(Math.random() * 10000000) + 1
                }));

                const res = calcularProporciones(members, 'proportional');
                const sumPct = res.reduce((acc, m) => acc + m.percentage, 0);
                assert.strictEqual(
                    Math.round(sumPct * 10) / 10,
                    100.0,
                    `Iteración ${i} falló para n=${n}: ${sumPct}`
                );
            }
        });
    });

    // ─── 3. CONSERVACIÓN MONETARIA Y ZERO-DRIFT ────────────────────────────────
    describe('3. Conservación Monetaria Absoluta (Zero-Drift en calcularAportesExactos)', () => {

        const testTotals = [1, 101, 999.99, 1000000, 0.01, 0.5, 333.33, 777067];

        it('3.1 Gastos de $1, $101, $999.99, $1.000.000 en 33.333% vs 66.667%', () => {
            const props = [
                { uid: 'u1', proportion: 1 / 3 },
                { uid: 'u2', proportion: 2 / 3 }
            ];

            for (const total of testTotals) {
                const aportes = calcularAportesExactos(total, props);
                assert.strictEqual(aportes.length, 2);

                const sumAportes = aportes.reduce((acc, a) => acc + a.aporte, 0);
                assert.ok(
                    Math.abs(sumAportes - total) < 1e-9,
                    `Fallo de conservación para total $${total}: suma aportes = ${sumAportes}`
                );

                // Comprobación de que no hay aportes negativos
                assert.ok(aportes[0].aporte >= 0);
                assert.ok(aportes[1].aporte >= 0);
            }
        });

        it('3.2 Gastos divididos entre 7 integrantes con pesos asimétricos', () => {
            const members = [
                { uid: 'u1', salary: 100 },
                { uid: 'u2', salary: 250 },
                { uid: 'u3', salary: 350 },
                { uid: 'u4', salary: 500 },
                { uid: 'u5', salary: 700 },
                { uid: 'u6', salary: 1200 },
                { uid: 'u7', salary: 1900 }
            ];
            const props = calcularProporciones(members, 'proportional');

            for (const total of testTotals) {
                const aportes = calcularAportesExactos(total, props);
                assert.strictEqual(aportes.length, 7);

                const sumAportes = aportes.reduce((acc, a) => acc + a.aporte, 0);
                assert.ok(
                    Math.abs(sumAportes - total) < 1e-9,
                    `Fallo de conservación en 7 miembros para total $${total}: suma = ${sumAportes}`
                );

                // Comprobar que byUid coincide con el array
                for (const a of aportes) {
                    assert.strictEqual(aportes.byUid[a.uid], a.aporte);
                }
            }
        });

        it('3.3 Gastos extremadamente pequeños ($1) divididos entre 10 integrantes', () => {
            // $1 dividido entre 10 integrantes enteros (ARS no tiene centavos si total es entero)
            const props = Array.from({ length: 10 }, (_, i) => ({
                uid: `u_${i}`,
                proportion: 0.1
            }));

            const aportes = calcularAportesExactos(1, props);
            assert.strictEqual(aportes.length, 10);

            const sumAportes = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.strictEqual(sumAportes, 1, 'La suma debe ser exactamente $1');

            // Exactamente 1 integrante debe aportar $1 y los otros 9 deben aportar $0
            const countOne = aportes.filter(a => a.aporte === 1).length;
            const countZero = aportes.filter(a => a.aporte === 0).length;
            assert.strictEqual(countOne, 1);
            assert.strictEqual(countZero, 9);
        });

        it('3.4 Gasto con centavos ($999.99) dividido entre 3 integrantes equitativos', () => {
            const props = [
                { uid: 'u1', proportion: 1 / 3 },
                { uid: 'u2', proportion: 1 / 3 },
                { uid: 'u3', proportion: 1 / 3 }
            ];

            const aportes = calcularAportesExactos(999.99, props);
            assert.strictEqual(aportes.length, 3);

            const sumAportes = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.ok(
                Math.abs(sumAportes - 999.99) < 1e-9,
                `Suma de aportes ${sumAportes} no coincide con 999.99`
            );

            // 999.99 / 3 = 333.33 cada uno exacto
            assert.strictEqual(aportes[0].aporte, 333.33);
            assert.strictEqual(aportes[1].aporte, 333.33);
            assert.strictEqual(aportes[2].aporte, 333.33);
        });

        it('3.5 Gasto con centavos asimétricos ($100.01) dividido entre 3 integrantes equitativos', () => {
            const props = [
                { uid: 'u1', proportion: 1 / 3 },
                { uid: 'u2', proportion: 1 / 3 },
                { uid: 'u3', proportion: 1 / 3 }
            ];

            // 100.01 = 10001 centavos. 10001 / 3 = 3333.666...
            // Hare-Niemeyer debe dar dos de 33.34 y uno de 33.33 (33.34 + 33.34 + 33.33 = 100.01)
            const aportes = calcularAportesExactos(100.01, props);
            const sumAportes = aportes.reduce((acc, a) => acc + a.aporte, 0);
            assert.ok(
                Math.abs(sumAportes - 100.01) < 1e-9,
                `Suma ${sumAportes} != 100.01`
            );

            const sorted = aportes.map(a => a.aporte).sort();
            assert.deepStrictEqual(sorted, [33.33, 33.34, 33.34]);
        });

        it('3.6 Fuzzing Monte Carlo (5000 iteraciones) de conservación monetaria', () => {
            for (let i = 0; i < 5000; i++) {
                const total = Math.round((Math.random() * 5000000 + 0.01) * 100) / 100;
                const memberCount = Math.floor(Math.random() * 8) + 2; // 2 a 9 miembros

                // Pesos aleatorios
                const rawWeights = Array.from({ length: memberCount }, () => Math.random() + 0.001);
                const sumW = rawWeights.reduce((a, b) => a + b, 0);
                const props = rawWeights.map((w, idx) => ({
                    uid: `u_${idx}`,
                    proportion: w / sumW
                }));

                const aportes = calcularAportesExactos(total, props);
                const sumAportes = aportes.reduce((acc, a) => acc + a.aporte, 0);

                assert.ok(
                    Math.abs(sumAportes - total) < 1e-8,
                    `Iteración ${i} falló: total=$${total}, sumAportes=$${sumAportes}, diff=${sumAportes - total}`
                );
            }
        });
    });

    // ─── 4. LIQUIDACIÓN NETA Y MIN CASH FLOW ────────────────────────────────────
    describe('4. Liquidación Neta, Compensaciones Cruzadas y Min Cash Flow', () => {

        it('4.1 Deuda circular compleja entre 4 integrantes se resuelve en mínimas transferencias', () => {
            // 4 miembros equitativos (25% cada uno de $100.000 = $25.000 cada uno)
            const members = [
                { uid: 'u1', displayName: 'Nico', salary: 1000 },
                { uid: 'u2', displayName: 'Cami', salary: 1000 },
                { uid: 'u3', displayName: 'Martin', salary: 1000 },
                { uid: 'u4', displayName: 'Sofi', salary: 1000 }
            ];

            // Pagos reales:
            // Nico pagó $60.000 (saldo: +35.000)
            // Cami pagó $40.000 (saldo: +15.000)
            // Martin pagó $0 (saldo: -25.000)
            // Sofi pagó $0 (saldo: -25.000)
            const sharedExpenses = [
                { paidByUid: 'u1', amount: 60000 },
                { paidByUid: 'u2', amount: 40000 }
            ];

            const res = calcularLiquidacionNeta(members, sharedExpenses, [], { splitMode: 'equal' });
            assert.strictEqual(res.totalGastos, 100000);
            assert.strictEqual(res.totalAportado, 100000);
            assert.strictEqual(res.saldoPendiente, 0);

            // Transferencias: Deudores deben pagar $50.000 en total
            const totalTransferido = res.transferencias.reduce((acc, t) => acc + t.amount, 0);
            assert.strictEqual(totalTransferido, 50000);

            // Verificar que no hay auto-transferencias
            for (const t of res.transferencias) {
                assert.notStrictEqual(t.fromUid, t.toUid);
                assert.ok(t.amount > 0);
            }

            // Verificar número óptimo de transferencias (máximo N-1 = 3)
            assert.ok(res.transferencias.length <= 3);
        });

        it('4.2 Liquidación donde todos pagaron exactamente su parte: 0 transferencias', () => {
            const members = [
                { uid: 'u1', displayName: 'Nico', salary: 1000 },
                { uid: 'u2', displayName: 'Cami', salary: 1000 }
            ];
            const sharedExpenses = [
                { paidByUid: 'u1', amount: 50000 },
                { paidByUid: 'u2', amount: 50000 }
            ];

            const res = calcularLiquidacionNeta(members, sharedExpenses, [], { splitMode: 'equal' });
            assert.strictEqual(res.transferencias.length, 0);
            assert.ok(res.resumenTexto.includes('¡Cuentas al día!'));
        });

        it('4.3 Fuzzing Monte Carlo (1000 iteraciones) de Liquidación Neta: Conservación de Deuda', () => {
            for (let i = 0; i < 1000; i++) {
                const n = Math.floor(Math.random() * 5) + 2; // 2 a 6 miembros
                const members = Array.from({ length: n }, (_, idx) => ({
                    uid: `u_${idx}`,
                    displayName: `Familiar ${idx}`,
                    salary: Math.floor(Math.random() * 500000) + 10000
                }));

                // Gastos aleatorios pagados por miembros aleatorios
                const expenseCount = Math.floor(Math.random() * 6) + 1;
                const expenses = [];
                for (let e = 0; e < expenseCount; e++) {
                    const payerIdx = Math.floor(Math.random() * n);
                    expenses.push({
                        paidByUid: `u_${payerIdx}`,
                        amount: Math.floor(Math.random() * 50000) + 100
                    });
                }

                const res = calcularLiquidacionNeta(members, expenses, [], { splitMode: 'proportional' });

                // Suma de balances positivos debe ser igual a la suma de balances negativos (en valor absoluto)
                const sumCreditors = res.miembros.filter(m => m.saldoNeto > 0).reduce((a, b) => a + b.saldoNeto, 0);
                const sumDebtors = res.miembros.filter(m => m.saldoNeto < 0).reduce((a, b) => a + Math.abs(b.saldoNeto), 0);
                assert.ok(
                    Math.abs(sumCreditors - sumDebtors) <= 1, // tolerancia de 1 peso por redondeo de cuotas enteras
                    `Desbalance en saldos netos iteración ${i}: cred=${sumCreditors}, debt=${sumDebtors}`
                );

                // Ninguna transferencia con amount <= 0
                for (const t of res.transferencias) {
                    assert.ok(t.amount > 0, `Transferencia con monto <= 0: ${t.amount}`);
                    assert.notStrictEqual(t.fromUid, t.toUid, `Auto-transferencia detectada en ${t.fromUid}`);
                }
            }
        });
    });

    // ─── 5. SELECTOR UNIFICADO DE GASTOS COMPARTIDOS ────────────────────────────
    describe('5. Selector Unificado y Desglose de Gastos', () => {

        it('5.1 Consolidación de 5 categorías con mezclas de arrays y números directos', () => {
            const servicios = [{ amount: 10000, isShared: true }, { amount: 5000, isShared: false }];
            const tarjetas = [{ currentDebt: 25000, isShared: true }];
            const supermercado = [{ price: 500, quantity: 4, isShared: true }];
            const frescos = [{ total: 3000 }];
            const efectivo = 7000;

            const total = obtenerTotalGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo);
            // 10000 + 25000 + 2000 + 3000 + 7000 = 47000
            assert.strictEqual(total, 47000);

            const desglose = obtenerDesgloseGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo);
            assert.strictEqual(desglose.total, 47000);
            assert.strictEqual(desglose.servicios, 10000);
            assert.strictEqual(desglose.tarjetas, 25000);
            assert.strictEqual(desglose.supermercado, 2000);
            assert.strictEqual(desglose.frescos, 3000);
            assert.strictEqual(desglose.efectivo, 7000);
        });

        it('5.2 Resiliencia ante valores NaN, Infinity, strings y negativos en el selector', () => {
            const servicios = [{ amount: NaN }, { amount: Infinity }, { amount: -5000 }, null, undefined];
            const tarjetas = [{ currentDebt: -10000 }];
            const total = obtenerTotalGastosCompartidos(servicios, tarjetas, 'texto', -50, NaN);
            assert.strictEqual(total, 0);
        });
    });

    // ─── 6. HELPER LEGACY calcularAporte EN salaryUtils ─────────────────────────
    describe('6. Helper Legacy calcularAporte en salaryUtils', () => {
        it('6.1 Calcula redondeo entero básico sin crashear con NaN o negativos', () => {
            assert.strictEqual(calcularAporte(100000, 0.5), 50000);
            assert.strictEqual(calcularAporte(100, 0.3333), 33);
            assert.strictEqual(calcularAporte(NaN, 0.5), 0);
            assert.strictEqual(calcularAporte(100, NaN), 0);
            assert.strictEqual(calcularAporte(-50, 0.5), -25);
        });
    });
});
