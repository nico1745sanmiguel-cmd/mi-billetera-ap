/**
 * tests/reparto/tier3-combinations.test.mjs
 * Tier 3: Cross-Feature Combinations (Combinaciones e interacciones cruzadas)
 * 
 * Requisitos:
 * - Mínimo 10 casos de interacciones complejas entre features:
 *   1. Modalidad equitativa vs proporcional con salarios cargados.
 *   2. Compensaciones cruzadas (Servicios vs Tarjetas vs Supermercado).
 *   3. Liquidaciones combinadas con aportes manuales a caja común.
 *   4. Cancelación de deudas circulares y minimización de transferencias.
 *   5. Consolidación de 5 categorías de gastos simultáneas.
 *   6. Reajuste salarial reactivo por actualización de historial.
 *   7. Fallback equitativo en hogar de 4 personas con 1 integrante sin ingresos.
 *   8. Superávit de caja común con aportes anticipados.
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

describe('Tier 3: Cross-Feature Combinations — Interacciones y Modalidades', () => {

    const pareja = [
        { uid: 'u_nico', displayName: 'Nico', salaryHistory: [{ amount: 1400000, date: '2026-09-01' }] },
        { uid: 'u_cami', displayName: 'Cami', salaryHistory: [{ amount: 600000, date: '2026-09-01' }] } // 70% y 30%
    ];

    it('3.1 Modalidad Equitativa ignora deliberadamente los sueldos asimétricos cargados (50/50)', () => {
        const props = calcularProporciones(pareja, 'equal');
        assert.strictEqual(props[0].percentage, 50.0);
        assert.strictEqual(props[1].percentage, 50.0);
        assert.strictEqual(props[0].proportion, 0.5);
        assert.strictEqual(props[1].proportion, 0.5);
        assert.strictEqual(props[0].hasIncompleteSalaries, false);
    });

    it('3.2 Modo Proporcional 70/30 donde Miembro B paga más gastos reales: Miembro A queda deudor', () => {
        // Gasto total: $100.000. Cuota Nico: 70k. Cuota Cami: 30k.
        // Cami paga $80.000 de compras y Nico solo paga $20.000.
        // Saldo Nico: 20k - 70k = -50k. Saldo Cami: 80k - 30k = +50k.
        const gastos = [
            { id: 'g1', amount: 80000, paidByUid: 'u_cami' },
            { id: 'g2', amount: 20000, paidByUid: 'u_nico' }
        ];
        const res = calcularLiquidacionNeta(pareja, gastos, [], 'proportional');

        const nico = res.balances.find(b => b.uid === 'u_nico');
        const cami = res.balances.find(b => b.uid === 'u_cami');

        assert.strictEqual(nico.saldoNeto, -50000);
        assert.strictEqual(cami.saldoNeto, 50000);
        assert.strictEqual(res.transferencias.length, 1);
        assert.strictEqual(res.transferencias[0].fromUid, 'u_nico');
        assert.strictEqual(res.transferencias[0].toUid, 'u_cami');
        assert.strictEqual(res.transferencias[0].amount, 50000);
    });

    it('3.3 Compensación cruzada: Miembro A paga servicios ($60k) y Miembro B paga tarjetas ($140k) en 50/50', () => {
        // Total: 200k. Cuota: 100k cada uno.
        // Nico paga 60k -> debe 40k. Cami paga 140k -> le deben 40k.
        const gastos = [
            { id: 's1', amount: 60000, paidByUid: 'u_nico', category: 'servicios' },
            { id: 't1', amount: 140000, paidByUid: 'u_cami', category: 'tarjetas' }
        ];
        const res = calcularLiquidacionNeta(pareja, gastos, [], 'equal');

        assert.strictEqual(res.totalGastos, 200000);
        assert.strictEqual(res.transferencias[0].fromUid, 'u_nico');
        assert.strictEqual(res.transferencias[0].toUid, 'u_cami');
        assert.strictEqual(res.transferencias[0].amount, 40000);
    });

    it('3.4 Liquidación combinada con aportes manuales adicionales a caja común', () => {
        // Total gastos: 100k (pagado por Nico).
        // En 50/50: Cuota 50k cada uno.
        // Cami ya transfirió $30.000 como aporte manual a la caja.
        // Cami totalPagado = 30k. Cuota = 50k. Saldo Cami = -20k.
        // Nico totalPagado = 100k. Cuota = 50k. Saldo Nico = +50k (menos 30k que ya están en caja = +20k neto restante a recibir).
        const gastos = [{ id: 'g1', amount: 100000, paidByUid: 'u_nico' }];
        const aportes = [{ id: 'a1', uid: 'u_cami', amount: 30000 }];

        const res = calcularLiquidacionNeta(pareja, gastos, aportes, 'equal');
        const cami = res.balances.find(b => b.uid === 'u_cami');
        assert.strictEqual(cami.totalPagado, 30000);
        assert.strictEqual(cami.saldoNeto, -20000);

        // La transferencia restante exigida a Cami es solo $20.000
        assert.strictEqual(res.transferencias[0].amount, 20000);
    });

    it('3.5 Transición dinámica de modalidad: Compara el mismo mes en Equitativo vs Proporcional', () => {
        const gastos = [{ id: 'g1', amount: 300000, paidByUid: 'u_nico' }];

        // Modo Equitativo (50/50)
        const resEq = calcularLiquidacionNeta(pareja, gastos, [], 'equal');
        const nicoEq = resEq.balances.find(b => b.uid === 'u_nico');
        assert.strictEqual(nicoEq.totalDebe, 150000);

        // Modo Proporcional (70/30)
        const resProp = calcularLiquidacionNeta(pareja, gastos, [], 'proportional');
        const nicoProp = resProp.balances.find(b => b.uid === 'u_nico');
        assert.strictEqual(nicoProp.totalDebe, 210000);
    });

    it('3.6 Consolidación de 5 categorías de gastos simultáneas y cálculo de liquidación', () => {
        const servicios = [{ amount: 25000, paidByUid: 'u_nico' }];
        const tarjetas = [{ amount: 80000, paidByUid: 'u_cami' }];
        const superm = [{ amount: 45000, paidByUid: 'u_cami' }];
        const frescos = [{ amount: 15000, paidByUid: 'u_nico' }];
        const efectivo = [{ amount: 10000, paidByUid: 'u_nico' }];

        const selector = obtenerTotalGastosCompartidos(servicios, tarjetas, superm, frescos, efectivo);
        assert.strictEqual(selector.total, 175000);

        const todosGastos = [...servicios, ...tarjetas, ...superm, ...frescos, ...efectivo];
        const res = calcularLiquidacionNeta(pareja, todosGastos, [], 'equal');
        assert.strictEqual(res.totalGastos, 175000);

        // Nico pagó 25k + 15k + 10k = 50k. Cuota 87.500. Saldo: -37.500
        // Cami pagó 80k + 45k = 125k. Cuota 87.500. Saldo: +37.500
        const nico = res.balances.find(b => b.uid === 'u_nico');
        assert.strictEqual(nico.totalPagado, 50000);
        assert.strictEqual(nico.saldoNeto, -37500);
        assert.strictEqual(res.transferencias[0].amount, 37500);
    });

    it('3.7 Cancelación de deudas circulares en 3 miembros (A le debe a B, B a C, C a A)', () => {
        const trio = [
            { uid: 'u1', displayName: 'A', salaryHistory: [{ amount: 100, date: '2026-01-01' }] },
            { uid: 'u2', displayName: 'B', salaryHistory: [{ amount: 100, date: '2026-01-01' }] },
            { uid: 'u3', displayName: 'C', salaryHistory: [{ amount: 100, date: '2026-01-01' }] }
        ];
        // Total 300k. Cuota 100k cada uno.
        // A pagó 120k (+20k)
        // B pagó 100k (0)
        // C pagó 80k (-20k)
        // En vez de giros entre los 3, C le transfiere directamente $20.000 a A en una sola operación.
        const gastos = [
            { amount: 120000, paidByUid: 'u1' },
            { amount: 100000, paidByUid: 'u2' },
            { amount: 80000, paidByUid: 'u3' }
        ];
        const res = calcularLiquidacionNeta(trio, gastos, [], 'equal');

        assert.strictEqual(res.transferencias.length, 1);
        assert.strictEqual(res.transferencias[0].fromUid, 'u3');
        assert.strictEqual(res.transferencias[0].toUid, 'u1');
        assert.strictEqual(res.transferencias[0].amount, 20000);
    });

    it('3.8 Múltiples micro-tickets de supermercado frente a una compra única de tarjeta', () => {
        const microTickets = [
            { amount: 3500, paidByUid: 'u_nico' },
            { amount: 4200, paidByUid: 'u_nico' },
            { amount: 1800, paidByUid: 'u_nico' },
            { amount: 10500, paidByUid: 'u_nico' } // Total Nico = 20.000
        ];
        const tarjetaGrande = [
            { amount: 80000, paidByUid: 'u_cami' } // Total Cami = 80.000
        ];
        // Total: 100.000. En 50/50: 50k cada uno. Nico debe transferir 30.000 a Cami.
        const res = calcularLiquidacionNeta(pareja, [...microTickets, ...tarjetaGrande], [], 'equal');
        assert.strictEqual(res.balances.find(b => b.uid === 'u_nico').saldoNeto, -30000);
        assert.strictEqual(res.transferencias[0].amount, 30000);
    });

    it('3.9 Liquidación donde un aporte manual cubre la totalidad de la deuda esperada', () => {
        // Gasto: 200k pagado por Nico. Cuota Cami: 100k.
        // Cami cargó un aporte manual previo de $100.000.
        // Resultado: Cami queda al día y no hay transferencias pendientes.
        const gastos = [{ amount: 200000, paidByUid: 'u_nico' }];
        const aportes = [{ uid: 'u_cami', amount: 100000 }];
        const res = calcularLiquidacionNeta(pareja, gastos, aportes, 'equal');

        assert.strictEqual(res.balances.find(b => b.uid === 'u_cami').saldoNeto, 0);
        assert.strictEqual(res.balances.find(b => b.uid === 'u_cami').rol, 'al_dia');
        assert.strictEqual(res.transferencias.length, 0);
    });

    it('3.10 Actualización de sueldo más reciente modifica proporciones reactivamente', () => {
        const miembroConAumento = [
            {
                uid: 'u_nico',
                salaryHistory: [
                    { amount: 1000000, date: '2026-01-01' },
                    { amount: 2000000, date: '2026-09-01' } // Aumento reciente
                ]
            },
            {
                uid: 'u_cami',
                salaryHistory: [
                    { amount: 1000000, date: '2026-01-01' }
                ]
            }
        ];
        // Ahora Nico gana 2M y Cami 1M -> 66.7% y 33.3%
        const props = calcularProporciones(miembroConAumento, 'proportional');
        assert.strictEqual(props[0].percentage, 66.7);
        assert.strictEqual(props[1].percentage, 33.3);
        assert.strictEqual(props[0].percentage + props[1].percentage, 100.0);
    });

    it('3.11 Hogar de 4 con 1 integrante sin ingresos: fallback equitativo 25% con alerta', () => {
        const familia = [
            { uid: 'u1', salaryHistory: [{ amount: 800000, date: '2026-01-01' }] },
            { uid: 'u2', salaryHistory: [{ amount: 600000, date: '2026-01-01' }] },
            { uid: 'u3', salaryHistory: [{ amount: 400000, date: '2026-01-01' }] },
            { uid: 'u4', salaryHistory: [] } // Estudiante sin sueldo
        ];
        const props = calcularProporciones(familia, 'proportional');
        props.forEach(p => {
            assert.strictEqual(p.proportion, 0.25);
            assert.strictEqual(p.percentage, 25.0);
            assert.strictEqual(p.hasIncompleteSalaries, true);
        });
    });

    it('3.12 Superávit de caja común con aportes adelantados mantiene conservación matemática', () => {
        // Gasto: 50k pagado por Nico.
        // Aporte manual previo de Cami: 60k.
        // Cuota 50/50: 25k cada uno.
        // Nico pagó 50k, cuota 25k -> +25k
        // Cami pagó 60k, cuota 25k -> +35k
        // Ambos tienen saldo a favor respecto al gasto directo
        const gastos = [{ amount: 50000, paidByUid: 'u_nico' }];
        const aportes = [{ uid: 'u_cami', amount: 60000 }];
        const res = calcularLiquidacionNeta(pareja, gastos, aportes, 'equal');

        const cami = res.balances.find(b => b.uid === 'u_cami');
        assert.strictEqual(cami.totalPagado, 60000);
        assert.strictEqual(cami.saldoNeto, 35000);
        assert.strictEqual(cami.rol, 'acreedor');
    });
});
