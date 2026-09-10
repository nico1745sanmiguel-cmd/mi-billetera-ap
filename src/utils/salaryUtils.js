/**
 * salaryUtils.js
 * Lógica de sanitización y cálculo de sueldos para reparto de gastos compartidos.
 *
 * El sueldo de cada usuario es un historial: [{ amount: Number, date: String (ISO) }]
 * Siempre se usa el entry más reciente como sueldo actual.
 */

import {
    calcularProporciones as calcularProporcionesCore,
    calcularAportesExactos,
    calcularLiquidacionNeta,
    obtenerTotalGastosCompartidos,
    obtenerDesgloseGastosCompartidos
} from './repartoUtils.js';

/**
 * Dado el historial de sueldos de un usuario, devuelve el sueldo más reciente.
 * Sanitiza la entrada bloqueando NaN, Infinity y valores negativos.
 * Totalmente compatible con cualquier runtime (sin Array.prototype.toSorted).
 *
 * @param {Array} salaryHistory - Array de { amount, date }
 * @returns {Number} - El monto del sueldo más reciente positivo, o 0 si no hay historial válido
 */
export const getLatestSalary = (salaryHistory) => {
    if (!Array.isArray(salaryHistory) || salaryHistory.length === 0) {
        return 0;
    }

    const validEntries = salaryHistory.filter(
        item => item && typeof item === 'object' && item.date
    );

    if (validEntries.length === 0) {
        return 0;
    }

    // Uso de spread [...] y sort nativo para máxima compatibilidad con navegadores antiguos
    const sorted = [...validEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    const amount = Number(sorted[0]?.amount);

    if (Number.isFinite(amount) && amount > 0) {
        return amount;
    }

    return 0;
};

/**
 * Calcula la proporción de cada miembro en base a su sueldo actual o modalidad equitativa.
 * Delega al motor exacto de repartoUtils con algoritmo Largest Remainder (Hare-Niemeyer).
 *
 * @param {Array} members - Array de { uid, displayName, salaryHistory, photoURL }
 * @param {string} [splitMode='proportional'] - 'proportional' o 'equal'
 * @returns {Array} - Array de { uid, displayName, photoURL, salary, proportion, percentage, hasIncompleteSalaries }
 */
export const calcularProporciones = (members, splitMode = 'proportional') => {
    return calcularProporcionesCore(members, splitMode);
};

/**
 * Calcula cuánto le corresponde pagar a un miembro de un gasto compartido (método simple legacy).
 * Para cálculos colectivos sin pérdida de centavos/pesos, preferir calcularAportesExactos.
 *
 * @param {Number} totalGasto - Monto total del gasto compartido
 * @param {Number} proportion - Proporción del miembro (0 a 1)
 * @returns {Number}
 */
export const calcularAporte = (totalGasto, proportion) => {
    const total = Number(totalGasto) || 0;
    const prop = Number(proportion) || 0;
    return Math.round(total * prop);
};

// Re-exportación de las utilidades financieras unificadas de repartoUtils
export {
    calcularAportesExactos,
    calcularLiquidacionNeta,
    obtenerTotalGastosCompartidos,
    obtenerDesgloseGastosCompartidos
};
