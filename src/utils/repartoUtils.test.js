/**
 * Test unitario y de verificación matemática para salaryUtils.js y repartoUtils.js
 * Ejecutar con: node src/utils/repartoUtils.test.js
 */

import assert from 'node:assert';
import { getLatestSalary, calcularAporte } from './salaryUtils.js';
import {
    calcularProporciones,
    calcularAportesExactos,
    calcularLiquidacionNeta,
    obtenerTotalGastosCompartidos,
    obtenerDesgloseGastosCompartidos
} from './repartoUtils.js';

console.log('--- INICIANDO VERIFICACIÓN MATEMÁTICA Y UNITARIA M1 ---');

// 1. Tests para getLatestSalary
console.log('\n[Test 1] getLatestSalary y calcularAporte: Sanitización y cálculo');
assert.strictEqual(calcularAporte(100, 0.5), 50, 'calcularAporte debe calcular el 50% de 100');
assert.strictEqual(getLatestSalary([]), 0, 'Array vacío debe retornar 0');
assert.strictEqual(getLatestSalary(null), 0, 'Null debe retornar 0');
assert.strictEqual(getLatestSalary(undefined), 0, 'Undefined debe retornar 0');
assert.strictEqual(getLatestSalary('not-array'), 0, 'No array debe retornar 0');

const history1 = [
    { amount: 500000, date: '2026-01-01' },
    { amount: 750000, date: '2026-03-01' },
    { amount: 600000, date: '2026-02-01' }
];
assert.strictEqual(getLatestSalary(history1), 750000, 'Debe retornar el más reciente según fecha');

const historyNegative = [
    { amount: -200000, date: '2026-05-01' },
    { amount: 400000, date: '2026-04-01' }
];
assert.strictEqual(getLatestSalary(historyNegative), 0, 'Monto negativo en el más reciente debe retornar 0');

const historyNaN = [
    { amount: 'invalid-number', date: '2026-05-01' }
];
assert.strictEqual(getLatestSalary(historyNaN), 0, 'NaN debe retornar 0');

const historyInfinity = [
    { amount: Infinity, date: '2026-05-01' }
];
assert.strictEqual(getLatestSalary(historyInfinity), 0, 'Infinity debe retornar 0');
console.log('✔ getLatestSalary pasó todas las validaciones.');

// 2. Tests para calcularProporciones
console.log('\n[Test 2] calcularProporciones: Modalidad equitativa y proporcional');
const members2 = [
    { uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 600000, date: '2026-01-01' }] },
    { uid: 'u2', displayName: 'Sofi', salaryHistory: [{ amount: 400000, date: '2026-01-01' }] }
];
const props2 = calcularProporciones(members2, 'proportional');
assert.strictEqual(props2.length, 2);
assert.strictEqual(props2[0].proportion, 0.6);
assert.strictEqual(props2[1].proportion, 0.4);
assert.strictEqual(props2[0].percentage, 60.0);
assert.strictEqual(props2[1].percentage, 40.0);
assert.strictEqual(props2[0].percentage + props2[1].percentage, 100.0);
assert.strictEqual(props2.hasIncompleteSalaries, false);

// Caso 3 miembros iguales: comprobar Largest Remainder en porcentajes (evitar 99.9%)
const members3 = [
    { uid: 'u1', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
    { uid: 'u2', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] },
    { uid: 'u3', salaryHistory: [{ amount: 100000, date: '2026-01-01' }] }
];
const props3 = calcularProporciones(members3, 'proportional');
const sumPct3 = props3.reduce((acc, m) => acc + m.percentage, 0);
assert.strictEqual(Math.round(sumPct3 * 10) / 10, 100.0, 'La suma de porcentajes debe ser exactamente 100.0%');
console.log('✔ Porcentajes de 3 miembros iguales:', props3.map(p => p.percentage), 'Suma:', sumPct3);

// Caso miembro sin sueldo cargado (sueldo = 0): debe activar hasIncompleteSalaries y fallback equitativo
const membersIncomplete = [
    { uid: 'u1', salaryHistory: [{ amount: 1000000, date: '2026-01-01' }] },
    { uid: 'u2', salaryHistory: [] }
];
const propsIncomplete = calcularProporciones(membersIncomplete, 'proportional');
assert.strictEqual(propsIncomplete.hasIncompleteSalaries, true, 'Debe señalar hasIncompleteSalaries: true');
assert.strictEqual(propsIncomplete[0].hasIncompleteSalaries, true);
assert.strictEqual(propsIncomplete[0].proportion, 0.5, 'Fallback debe ser 50/50');
assert.strictEqual(propsIncomplete[1].proportion, 0.5, 'Fallback debe ser 50/50');
assert.strictEqual(propsIncomplete[0].percentage + propsIncomplete[1].percentage, 100.0);
console.log('✔ Manejo de sueldos incompletos verificado correctamente.');

// 3. Tests para calcularAportesExactos (Hare-Niemeyer / Largest Remainder)
console.log('\n[Test 3] calcularAportesExactos: Cero drift y cero pérdidas/creaciones');
// Caso $101 entre 2 personas al 50%:
const aportes101 = calcularAportesExactos(101, [
    { uid: 'u1', proportion: 0.5 },
    { uid: 'u2', proportion: 0.5 }
]);
const totalAportes101 = aportes101.reduce((acc, a) => acc + a.aporte, 0);
assert.strictEqual(totalAportes101, 101, 'La suma de aportes para $101 debe ser exactamente $101');
assert.strictEqual(aportes101[0].aporte + aportes101[1].aporte, 101);
console.log('✔ Reparto de $101 al 50/50:', aportes101[0].aporte, '+', aportes101[1].aporte, '=', totalAportes101);

// Caso $100 entre 3 personas con 1/3:
const aportes100_3 = calcularAportesExactos(100, [
    { uid: 'u1', proportion: 1 / 3 },
    { uid: 'u2', proportion: 1 / 3 },
    { uid: 'u3', proportion: 1 / 3 }
]);
const sumAportes100_3 = aportes100_3.reduce((acc, a) => acc + a.aporte, 0);
assert.strictEqual(sumAportes100_3, 100, 'La suma de aportes para $100 entre 3 debe ser exactamente $100');
console.log('✔ Reparto de $100 entre 3:', aportes100_3.map(a => a.aporte), 'Suma:', sumAportes100_3);

// Caso decimales: $100.50 entre 2 personas al 50%
const aportesDecimales = calcularAportesExactos(100.50, [0.5, 0.5]);
const sumDecimales = aportesDecimales.reduce((a, b) => a + b, 0);
assert.strictEqual(sumDecimales, 100.50, 'Suma decimal debe ser exactamente 100.50');
console.log('✔ Reparto decimal exacto:', aportesDecimales, 'Suma:', sumDecimales);

// 4. Tests para calcularLiquidacionNeta
console.log('\n[Test 4] calcularLiquidacionNeta: Balances y Min Cash Flow');
const membersLiq = [
    { uid: 'u1', displayName: 'Nico', salaryHistory: [{ amount: 500000, date: '2026-01-01' }] },
    { uid: 'u2', displayName: 'Sofi', salaryHistory: [{ amount: 500000, date: '2026-01-01' }] }
];
// Nico pagó servicio de $20.000, Sofi pagó súper de $10.000
const sharedExpenses = [
    { id: 's1', name: 'Luz', amount: 20000, paidByUid: 'u1', isPaid: true },
    { id: 's2', name: 'Súper', amount: 10000, paidByUid: 'u2', isPaid: true }
];
const manualContributions = [
    { uid: 'u2', amount: 4000 } // Sofi puso $4.000 en efectivo
];
// Total gastos = 30.000.
// Nico aportó: 20.000
// Sofi aportó: 10.000 + 4.000 = 14.000
// Total aportado = 34.000
// Cuotas (50% de 30.000 = 15.000 cada uno)
// Nico: pagó 20.000, correspondía 15.000 -> saldoNeto = +5.000
// Sofi: pagó 14.000, correspondía 15.000 -> saldoNeto = -1.000
const liq1 = calcularLiquidacionNeta(membersLiq, sharedExpenses, manualContributions);
assert.strictEqual(liq1.totalGastos, 30000);
assert.strictEqual(liq1.totalAportado, 34000);
const nico = liq1.miembros.find(m => m.uid === 'u1');
const sofi = liq1.miembros.find(m => m.uid === 'u2');
assert.strictEqual(nico.totalAportado, 20000);
assert.strictEqual(sofi.totalAportado, 14000);
assert.strictEqual(nico.saldoNeto, 5000);
assert.strictEqual(sofi.saldoNeto, -1000);

assert.strictEqual(liq1.transferencias.length, 1);
assert.strictEqual(liq1.transferencias[0].fromUid, 'u2');
assert.strictEqual(liq1.transferencias[0].toUid, 'u1');
assert.strictEqual(liq1.transferencias[0].amount, 1000);
console.log('✔ Transferencia calculada:', liq1.transferencias[0]);
console.log('✔ Resumen de texto:', liq1.resumenTexto);

// Caso 3 personas con Min Cash Flow
const members3Liq = [
    { uid: 'u1', displayName: 'Persona A', salary: 100000 },
    { uid: 'u2', displayName: 'Persona B', salary: 100000 },
    { uid: 'u3', displayName: 'Persona C', salary: 100000 }
];
// Gasto total: $90.000 (cada una debe $30.000)
// Persona A pagó $90.000 completo.
// Persona B pagó $0.
// Persona C pagó $0.
const shared3 = [
    { id: '1', amount: 90000, paidByUid: 'u1', isPaid: true }
];
const liq3 = calcularLiquidacionNeta(members3Liq, shared3, []);
assert.strictEqual(liq3.transferencias.length, 2, 'Debe haber exactamente 2 transferencias');
const tBtoA = liq3.transferencias.find(t => t.fromUid === 'u2' && t.toUid === 'u1');
const tCtoA = liq3.transferencias.find(t => t.fromUid === 'u3' && t.toUid === 'u1');
assert.strictEqual(tBtoA.amount, 30000);
assert.strictEqual(tCtoA.amount, 30000);
console.log('✔ Min Cash Flow con 3 integrantes validado exitosamente.');

// 5. Tests para obtenerTotalGastosCompartidos y obtenerDesgloseGastosCompartidos
console.log('\n[Test 5] obtenerTotalGastosCompartidos: Selector unificado');
const servicios = [
    { id: '1', name: 'Internet', amount: 25000, isShared: true },
    { id: '2', name: 'Personal', amount: 15000, isShared: false } // No debe sumar
];
const tarjetas = [
    { id: 'c1', name: 'Visa', currentDebt: 50000, isShared: true }
];
const supermercado = [
    { name: 'Leche', price: 1200, quantity: 5, isShared: true } // 6000
];
const frescos = [
    { name: 'Verdulería', total: 8000, isShared: true }
];
const efectivo = [
    { name: 'Taxi compartido', amount: 4000, isShared: true }
];

const totalSelector = obtenerTotalGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo);
// 25000 + 50000 + 6000 + 8000 + 4000 = 93000
assert.strictEqual(totalSelector, 93000, 'Total selector debe sumar 93000');

const desglose = obtenerDesgloseGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo);
assert.strictEqual(desglose.total, 93000);
assert.strictEqual(desglose.servicios, 25000);
assert.strictEqual(desglose.tarjetas, 50000);
assert.strictEqual(desglose.supermercado, 6000);
assert.strictEqual(desglose.frescos, 8000);
assert.strictEqual(desglose.efectivo, 4000);

// Comprobar que también acepta subtotales numéricos
const totalNumerico = obtenerTotalGastosCompartidos(25000, 50000, 6000, 8000, 4000);
assert.strictEqual(totalNumerico, 93000);
console.log('✔ Selector unificado y desglose pasaron todas las pruebas.');

console.log('\n=========================================');
console.log('TODAS LAS PRUEBAS MATEMÁTICAS PASARON (100% ÉXITO)');
console.log('=========================================\n');
