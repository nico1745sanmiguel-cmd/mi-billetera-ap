/**
 * tests/reparto/tier4-scenarios.test.mjs
 * Tier 4: Real-World Application Scenarios (Escenarios del mundo real en hogares y parejas)
 * 
 * Requisitos:
 * Mínimo 5 escenarios integrales de la vida cotidiana de usuarios en Argentina:
 * 1. Convivencia en pareja 65/35 con servicios, tarjetas y súper (Mercado Pago / transferencia).
 * 2. Tres compañeros de departamento en Palermo en modo equitativo (alquiler, expensas, wifi).
 * 3. Pareja con ingreso cero temporal (desempleo) y absorción con aportes compensatorios.
 * 4. Finanzas familiares con pozo común en efectivo (caja chica física) y tarjetas.
 * 5. Cierre de mes con cifras inflacionarias impares exactas ($777.067) sin desvío de $1.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularProporciones,
    calcularAportesExactos,
    obtenerTotalGastosCompartidos,
    calcularLiquidacionNeta
} from './repartoContracts.mjs';

describe('Tier 4: Real-World Application Scenarios — Hogares y Parejas', () => {

    // ─── ESCENARIO 1 ──────────────────────────────────────────────────────────
    it('Escenario 1: Convivencia en Pareja (Nico y Cami) 65/35 con liquidación por Mercado Pago', () => {
        // 1. Configuración de integrantes e ingresos
        const pareja = [
            { uid: 'u_nico', displayName: 'Nico', salaryHistory: [{ amount: 1300000, date: '2026-09-01' }] },
            { uid: 'u_cami', displayName: 'Cami', salaryHistory: [{ amount: 700000, date: '2026-09-01' }] }
        ];

        const props = calcularProporciones(pareja, 'proportional');
        assert.strictEqual(props[0].percentage, 65.0);
        assert.strictEqual(props[1].percentage, 35.0);

        // 2. Gastos reales del mes
        const servicios = [
            { id: 's1', description: 'Edenor', amount: 48500, paidByUid: 'u_nico' },
            { id: 's2', description: 'Metrogas', amount: 14200, paidByUid: 'u_nico' },
            { id: 's3', description: 'AySA', amount: 9800, paidByUid: 'u_cami' },
            { id: 's4', description: 'Movistar Fibra', amount: 32500, paidByUid: 'u_nico' }
        ];

        const tarjetas = [
            { id: 't1', description: 'Visa Santander', amount: 280000, paidByUid: 'u_nico' },
            { id: 't2', description: 'Mastercard BBVA', amount: 140000, paidByUid: 'u_cami' }
        ];

        const alimentos = [
            { id: 'c1', description: 'Coto Mensual', amount: 165000, paidByUid: 'u_cami' },
            { id: 'c2', description: 'Verdulería', amount: 24000, paidByUid: 'u_nico' },
            { id: 'c3', description: 'Carnicería', amount: 36000, paidByUid: 'u_cami' }
        ];

        const selector = obtenerTotalGastosCompartidos(servicios, tarjetas, alimentos, [], []);
        assert.strictEqual(selector.total, 750000);
        assert.strictEqual(selector.breakdown.servicios, 105000);
        assert.strictEqual(selector.breakdown.tarjetas, 420000);
        assert.strictEqual(selector.breakdown.supermercado, 225000);

        // 3. Liquidación Neta
        const todosGastos = [...servicios, ...tarjetas, ...alimentos];
        const liquidacion = calcularLiquidacionNeta(pareja, todosGastos, [], 'proportional');

        const nico = liquidacion.balances.find(b => b.uid === 'u_nico');
        const cami = liquidacion.balances.find(b => b.uid === 'u_cami');

        // Cuotas: Nico (65%) = 487.500 | Cami (35%) = 262.500
        assert.strictEqual(nico.totalDebe, 487500);
        assert.strictEqual(cami.totalDebe, 262500);

        // Desembolsos: Nico = 399.200 | Cami = 350.800
        assert.strictEqual(nico.totalPagado, 399200);
        assert.strictEqual(cami.totalPagado, 350800);

        // Saldos netos: Nico debe 88.300 | Cami es acreedora por 88.300
        assert.strictEqual(nico.saldoNeto, -88300);
        assert.strictEqual(cami.saldoNeto, 88300);
        assert.strictEqual(nico.rol, 'deudor');
        assert.strictEqual(cami.rol, 'acreedor');

        // 4. Transferencia exacta
        assert.strictEqual(liquidacion.transferencias.length, 1);
        const t = liquidacion.transferencias[0];
        assert.strictEqual(t.fromName, 'Nico');
        assert.strictEqual(t.toName, 'Cami');
        assert.strictEqual(t.amount, 88300);
    });

    // ─── ESCENARIO 2 ──────────────────────────────────────────────────────────
    it('Escenario 2: Tres Compañeros de Departamento en Palermo en Modo Equitativo', () => {
        const roommates = [
            { uid: 'u_nico', displayName: 'Nico', salaryHistory: [{ amount: 900000, date: '2026-09-01' }] },
            { uid: 'u_lucas', displayName: 'Lucas', salaryHistory: [{ amount: 850000, date: '2026-09-01' }] },
            { uid: 'u_martin', displayName: 'Martin', salaryHistory: [{ amount: 950000, date: '2026-09-01' }] }
        ];

        // Alquiler, expensas y conectividad
        const gastos = [
            { id: 'g1', description: 'Alquiler y Expensas', amount: 600000, paidByUid: 'u_martin' },
            { id: 'g2', description: 'Internet Fibertel', amount: 45000, paidByUid: 'u_nico' },
            { id: 'g3', description: 'Súper y Limpieza', amount: 105000, paidByUid: 'u_nico' }
        ];

        // Lucas estuvo de viaje y no abonó nada durante el mes
        const res = calcularLiquidacionNeta(roommates, gastos, [], 'equal');
        assert.strictEqual(res.totalGastos, 750000);

        // Cuota equitativa: 250.000 c/u
        res.balances.forEach(b => assert.strictEqual(b.totalDebe, 250000));

        const martin = res.balances.find(b => b.uid === 'u_martin');
        const nico = res.balances.find(b => b.uid === 'u_nico');
        const lucas = res.balances.find(b => b.uid === 'u_lucas');

        assert.strictEqual(martin.saldoNeto, 350000); // 600k - 250k = +350k
        assert.strictEqual(nico.saldoNeto, -100000);  // 150k - 250k = -100k
        assert.strictEqual(lucas.saldoNeto, -250000); // 0 - 250k = -250k

        // Transferencias simplificadas directas a Martin
        assert.strictEqual(res.transferencias.length, 2);
        const aMartin = res.transferencias.filter(t => t.toUid === 'u_martin');
        assert.strictEqual(aMartin.length, 2);
        assert.strictEqual(aMartin.reduce((sum, t) => sum + t.amount, 0), 350000);
    });

    // ─── ESCENARIO 3 ──────────────────────────────────────────────────────────
    it('Escenario 3: Pareja con Ingreso Cero Temporal y Absorción con Aportes Compensatorios', () => {
        const pareja = [
            { uid: 'u_nico', displayName: 'Nico', salaryHistory: [{ amount: 1800000, date: '2026-09-01' }] },
            { uid: 'u_cami', displayName: 'Cami', salaryHistory: [] } // Desempleo temporal
        ];

        // 1. Proporcional detecta sueldo incompleto y aplica fallback equitativo
        const props = calcularProporciones(pareja, 'proportional');
        assert.strictEqual(props[0].hasIncompleteSalaries, true);
        assert.strictEqual(props[0].proportion, 0.5);
        assert.strictEqual(props[1].proportion, 0.5);

        // Gastos del mes: $200.000 (Nico pagó $170.000, Cami pagó $30.000 de ahorros)
        const gastos = [
            { id: 'g1', amount: 170000, paidByUid: 'u_nico' },
            { id: 'g2', amount: 30000, paidByUid: 'u_cami' }
        ];

        // Nico realiza un aporte voluntario a la cuenta de Cami ($70.000) para compensar su cuota
        const aportesManuales = [
            { id: 'ap1', uid: 'u_cami', amount: 70000 }
        ];

        const res = calcularLiquidacionNeta(pareja, gastos, aportesManuales, 'equal');
        const cami = res.balances.find(b => b.uid === 'u_cami');

        // Cami pagó 30k de gastos + 70k de aporte = 100k (su cuota exacta)
        assert.strictEqual(cami.totalPagado, 100000);
        assert.strictEqual(cami.saldoNeto, 0);
        assert.strictEqual(cami.rol, 'al_dia');
        assert.strictEqual(res.transferencias.length, 0);
    });

    // ─── ESCENARIO 4 ──────────────────────────────────────────────────────────
    it('Escenario 4: Finanzas con Pozo Común en Efectivo (Caja Chica) y Tarjetas', () => {
        const pareja = [
            { uid: 'u_nico', displayName: 'Nico', salaryHistory: [{ amount: 1000000, date: '2026-09-01' }] },
            { uid: 'u_cami', displayName: 'Cami', salaryHistory: [{ amount: 1000000, date: '2026-09-01' }] }
        ];

        // Ambos aportan $50.000 a la caja chica física de la casa
        const aportesCaja = [
            { id: 'a1', uid: 'u_nico', amount: 50000 },
            { id: 'a2', uid: 'u_cami', amount: 50000 }
        ];

        // Gastos: $65.000 pagados con la caja chica (asumidos pagados neutralmente)
        // y $135.000 de compras con la tarjeta de crédito de Cami
        const gastos = [
            { id: 't1', amount: 135000, paidByUid: 'u_cami' }
        ];

        const res = calcularLiquidacionNeta(pareja, gastos, aportesCaja, 'equal');
        assert.strictEqual(res.totalGastos, 135000);

        // Cuota de gastos directos: 67.500 c/u
        // Nico pagó: 0 de gastos + 50k caja = 50.000 -> Saldo: 50k - 67.5k = -17.500
        // Cami pagó: 135k gastos + 50k caja = 185.000 -> Saldo: 185k - 67.5k = +117.500
        const nico = res.balances.find(b => b.uid === 'u_nico');
        assert.strictEqual(nico.saldoNeto, -17500);
        assert.strictEqual(res.transferencias[0].amount, 17500);
    });

    // ─── ESCENARIO 5 ──────────────────────────────────────────────────────────
    it('Escenario 5: Cierre de Mes Inflacionario Argentino con Cifra Impar ($777.067) al Peso Exacto', () => {
        const pareja = [
            { uid: 'u_nico', displayName: 'Nico', salaryHistory: [{ amount: 1200000, date: '2026-09-01' }] },
            { uid: 'u_cami', displayName: 'Cami', salaryHistory: [{ amount: 800000, date: '2026-09-01' }] } // 60% y 40%
        ];

        const facturasReales = [
            { id: 'f1', amount: 74832, paidByUid: 'u_nico' },  // Edesur
            { id: 'f2', amount: 18456, paidByUid: 'u_nico' },  // Metrogas
            { id: 'f3', amount: 38921, paidByUid: 'u_cami' },  // Personal Fibra
            { id: 'f4', amount: 12345, paidByUid: 'u_nico' },  // ABL
            { id: 'f5', amount: 412870, paidByUid: 'u_cami' }, // Visa Santander
            { id: 'f6', amount: 219643, paidByUid: 'u_cami' }  // Supermercado Disco
        ];

        const totalFacturas = facturasReales.reduce((acc, f) => acc + f.amount, 0);
        assert.strictEqual(totalFacturas, 777067); // Número impar

        const props = calcularProporciones(pareja, 'proportional');
        assert.strictEqual(props[0].percentage, 60.0);
        assert.strictEqual(props[1].percentage, 40.0);

        const aportes = calcularAportesExactos(totalFacturas, props);
        assert.strictEqual(aportes[0].aporte, 466240); // 777.067 * 0.6 = 466.240,2 -> 466.240
        assert.strictEqual(aportes[1].aporte, 310827); // 777.067 * 0.4 = 310.826,8 -> 310.827
        assert.strictEqual(aportes[0].aporte + aportes[1].aporte, 777067, 'Conservación absoluta del dinero al peso');

        const liquidacion = calcularLiquidacionNeta(pareja, facturasReales, [], 'proportional');
        const nico = liquidacion.balances.find(b => b.uid === 'u_nico');
        const cami = liquidacion.balances.find(b => b.uid === 'u_cami');

        // Nico pagó: 74832 + 18456 + 12345 = 105.633. Debe: 466.240. Saldo: -360.607
        assert.strictEqual(nico.totalPagado, 105633);
        assert.strictEqual(nico.saldoNeto, -360607);

        // Cami pagó: 38921 + 412870 + 219643 = 671.434. Debe: 310.827. Saldo: +360.607
        assert.strictEqual(cami.totalPagado, 671434);
        assert.strictEqual(cami.saldoNeto, 360607);

        // Transferencia bancaria exacta
        assert.strictEqual(liquidacion.transferencias.length, 1);
        assert.strictEqual(liquidacion.transferencias[0].fromUid, 'u_nico');
        assert.strictEqual(liquidacion.transferencias[0].toUid, 'u_cami');
        assert.strictEqual(liquidacion.transferencias[0].amount, 360607);
    });
});
