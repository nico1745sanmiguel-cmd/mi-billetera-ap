/**
 * repartoUtils.js
 * Núcleo matemático de reparto de gastos compartidos y liquidación neta familiar.
 *
 * Funciones puras con precisión financiera:
 * - Algoritmo Largest Remainder (Hare-Niemeyer) para cuotas y porcentajes sin pérdidas por redondeo.
 * - Algoritmo Min Cash Flow (Debt Settlement greedy) para optimizar transferencias de compensación.
 * - Selector unificado de gastos compartidos mensuales.
 */

import { getLatestSalary } from './salaryUtils.js';

/**
 * Calcula las proporciones de reparto entre los miembros del hogar.
 *
 * @param {Array} members - Lista de miembros con { uid, displayName, salaryHistory, ... }
 * @param {string} [splitMode='proportional'] - 'proportional' (según ingresos) o 'equal' (partes iguales)
 * @returns {Array} Miembros con { uid, displayName, salary, proportion, percentage, hasIncompleteSalaries }
 */
export const calcularProporciones = (members, splitMode = 'proportional') => {
    if (!Array.isArray(members) || members.length === 0) {
        return [];
    }

    const n = members.length;

    // 1. Extraer o sanitizar el sueldo de cada integrante
    const withSalary = members.map(m => {
        let salary = 0;
        if (Number.isFinite(m.salary) && m.salary > 0) {
            salary = m.salary;
        } else if (Array.isArray(m.salaryHistory)) {
            salary = getLatestSalary(m.salaryHistory);
        }

        return {
            ...m,
            salary: Number.isFinite(salary) && salary > 0 ? salary : 0
        };
    });

    const allHaveSalary = withSalary.every(m => m.salary > 0);
    const totalSalary = withSalary.reduce((acc, m) => acc + m.salary, 0);

    // 2. Si la modalidad es equitativa ('equal') o ningún miembro tiene sueldo cargado
    if (splitMode === 'equal' || totalSalary === 0) {
        const equalProp = 1 / n;
        // Largest Remainder para porcentajes a 1 decimal (suman exactamente 100.0%)
        const percentages = repartirPorcentajesHareNiemeyer(withSalary.map(() => 1));

        const result = withSalary.map((m, idx) => ({
            ...m,
            proportion: equalProp,
            percentage: percentages[idx],
            hasIncompleteSalaries: false
        }));

        result.hasIncompleteSalaries = false;
        result.splitMode = splitMode === 'equal' ? 'equal' : 'proportional_fallback';
        return result;
    }

    // 3. Modalidad proporcional con sueldos faltantes en uno o más miembros
    if (splitMode === 'proportional' && !allHaveSalary) {
        const equalProp = 1 / n;
        const percentages = repartirPorcentajesHareNiemeyer(withSalary.map(() => 1));

        const result = withSalary.map((m, idx) => ({
            ...m,
            proportion: equalProp,
            percentage: percentages[idx],
            hasIncompleteSalaries: true,
            incompleteSalaryMessage: 'Faltan datos de sueldos en uno o más miembros. Se aplica división equitativa temporal.'
        }));

        result.hasIncompleteSalaries = true;
        result.incompleteSalaryMessage = 'Faltan datos de sueldos en uno o más miembros. Se aplica división equitativa temporal.';
        result.splitMode = 'proportional';
        return result;
    }

    // 4. Modalidad proporcional con todos los sueldos válidos (> 0)
    const weights = withSalary.map(m => m.salary);
    const percentages = repartirPorcentajesHareNiemeyer(weights);

    const result = withSalary.map((m, idx) => {
        const proportion = m.salary / totalSalary;
        return {
            ...m,
            proportion,
            percentage: percentages[idx],
            hasIncompleteSalaries: false
        };
    });

    result.hasIncompleteSalaries = false;
    result.splitMode = 'proportional';
    return result;
};

/**
 * Distribuye porcentajes a 1 decimal usando el método de Largest Remainder (Hare-Niemeyer).
 * Garantiza que la suma de porcentajes sea EXACTAMENTE 100.0%.
 *
 * @param {Array<number>} weights - Pesos relativos de cada participante
 * @returns {Array<number>} Porcentajes con 1 decimal sumando exactamente 100.0
 */
function repartirPorcentajesHareNiemeyer(weights) {
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    if (totalWeight <= 0) {
        const n = weights.length;
        return weights.map(() => Math.round((100 / n) * 10) / 10);
    }

    // 1000 unidades de décimas de porcentaje (1000 * 0.1% = 100.0%)
    const targetTenths = 1000;
    const entries = weights.map((w, index) => {
        const exact = (w / totalWeight) * targetTenths;
        const integerPart = Math.floor(exact);
        const remainder = exact - integerPart;
        return { index, integerPart, remainder };
    });

    const sumFloor = entries.reduce((acc, e) => acc + e.integerPart, 0);
    const diff = targetTenths - sumFloor;

    // Ordenar por resto descendente para asignar las décimas sobrantes
    const sortedByRemainder = [...entries].sort((a, b) => {
        if (b.remainder !== a.remainder) return b.remainder - a.remainder;
        return a.index - b.index;
    });

    for (let i = 0; i < diff; i++) {
        sortedByRemainder[i].integerPart += 1;
    }

    // Restaurar orden original y convertir a porcentajes
    const result = new Array(weights.length);
    for (const e of entries) {
        result[e.index] = e.integerPart / 10;
    }

    return result;
}

/**
 * Calcula los aportes de cada integrante para un total de gasto, garantizando mediante
 * Largest Remainder (Hare-Niemeyer) que la suma de los aportes coincida EXACTAMENTE con
 * totalGasto, sin pérdidas ni creaciones de pesos o centavos.
 *
 * @param {number} totalGasto - Monto total a repartir
 * @param {Array} proporciones - Array de miembros con proporción o array numérico de proporciones
 * @param {Object} [options={}] - Opciones adicionales ({ decimals: 0|2 })
 * @returns {Array} Array con las cuotas exactas asignadas
 */
export const calcularAportesExactos = (totalGasto, proporciones, options = {}) => {
    const rawTotal = Number(totalGasto);
    if (!Number.isFinite(rawTotal) || rawTotal <= 0) {
        if (!Array.isArray(proporciones)) return [];
        return proporciones.map(p => {
            if (typeof p === 'object' && p !== null) {
                return { ...p, aporte: 0, amount: 0 };
            }
            return 0;
        });
    }

    if (!Array.isArray(proporciones) || proporciones.length === 0) {
        return [];
    }

    // Determinar escala de decimales (0 para enteros en ARS, 2 si hay centavos explícitos)
    let decimals = options.decimals;
    if (decimals === undefined) {
        decimals = rawTotal % 1 !== 0 ? 2 : 0;
    }
    const factor = Math.pow(10, decimals);
    const totalUnits = Math.round(rawTotal * factor);

    // Extraer proporciones numéricas normalizadas
    const rawProps = proporciones.map(p => {
        if (typeof p === 'number') return Number.isFinite(p) ? p : 0;
        if (p && typeof p === 'object') return Number.isFinite(p.proportion) ? p.proportion : 0;
        return 0;
    });

    const sumProps = rawProps.reduce((acc, v) => acc + v, 0);
    const normalizedProps = sumProps > 0
        ? rawProps.map(v => v / sumProps)
        : rawProps.map(() => 1 / rawProps.length);

    // Algoritmo Hare-Niemeyer en unidades mínimas
    const entries = normalizedProps.map((prop, index) => {
        const exact = totalUnits * prop;
        const integerPart = Math.floor(exact);
        const remainder = exact - integerPart;
        return { index, integerPart, remainder };
    });

    const sumFloor = entries.reduce((acc, e) => acc + e.integerPart, 0);
    const diff = totalUnits - sumFloor;

    const sortedByRemainder = [...entries].sort((a, b) => {
        if (b.remainder !== a.remainder) return b.remainder - a.remainder;
        return a.index - b.index;
    });

    for (let i = 0; i < diff; i++) {
        sortedByRemainder[i].integerPart += 1;
    }

    // Convertir de nuevo a pesos / moneda original
    const exactAportes = new Array(entries.length);
    for (const e of entries) {
        exactAportes[e.index] = e.integerPart / factor;
    }

    // Retornar en el mismo formato recibido
    const byUid = {};
    const result = proporciones.map((p, idx) => {
        const aporte = exactAportes[idx];
        if (typeof p === 'object' && p !== null) {
            if (p.uid) byUid[p.uid] = aporte;
            return {
                ...p,
                aporte,
                amount: aporte
            };
        }
        return aporte;
    });

    result.byUid = byUid;
    result.total = rawTotal;
    return result;
};

/**
 * Calcula la liquidación neta de gastos compartidos del hogar.
 * Determina para cada integrante:
 * - totalAportado: dinero efectivamente desembolsado en servicios, tarjetas, súper o aportes manuales.
 * - totalCorrespondiente: cuota teórica según su proporción de ingresos (calculada con Largest Remainder).
 * - saldoNeto: diferencia (totalAportado - totalCorrespondiente). Positivo = a favor; Negativo = debe dinero.
 * - transferencias: lista óptima de compensaciones directas (Min Cash Flow greedy) para saldar el mes.
 *
 * @param {Array} members - Integrantes del hogar
 * @param {Array|number} sharedExpenses - Lista de gastos compartidos o monto total
 * @param {Array} manualContributions - Lista de aportes registrados a mano en el mes
 * @param {Object} [options={}] - Opciones ({ splitMode: 'proportional'|'equal' })
 * @returns {Object} { totalGastos, totalAportado, saldoPendiente, miembros, transferencias, resumenTexto }
 */
export const calcularLiquidacionNeta = (members, sharedExpenses = [], manualContributions = [], options = {}) => {
    if (!Array.isArray(members) || members.length === 0) {
        return {
            totalGastos: 0,
            totalAportado: 0,
            saldoPendiente: 0,
            miembros: [],
            transferencias: [],
            resumenTexto: 'No hay miembros en el grupo familiar.'
        };
    }

    // 1. Obtener proporciones de los integrantes
    const proporciones = members[0]?.proportion !== undefined
        ? members
        : calcularProporciones(members, options.splitMode || 'proportional');

    // 2. Mapear aportes reales por miembro
    const aportesPorUid = {};
    for (const m of members) {
        if (m.uid) aportesPorUid[m.uid] = 0;
    }

    // Sumar gastos compartidos donde un miembro figura como pagador / dueño
    if (Array.isArray(sharedExpenses)) {
        for (const item of sharedExpenses) {
            if (!item || typeof item !== 'object') continue;
            // No computar dos veces si el ítem está marcado explícitamente como no pagado
            if (item.isPaid === false) continue;

            const payerUid = item.paidByUid || item.ownerId || item.payerUid || item.userId || item.uid;
            const amount = Number(
                item.amount !== undefined ? item.amount :
                item.total !== undefined ? item.total :
                (item.price && item.quantity) ? item.price * item.quantity : 0
            ) || 0;

            if (payerUid && aportesPorUid[payerUid] !== undefined && amount > 0) {
                aportesPorUid[payerUid] += amount;
            }
        }
    }

    // Sumar aportes manuales en efectivo / transferencias directas al pozo
    if (Array.isArray(manualContributions)) {
        for (const c of manualContributions) {
            if (!c || typeof c !== 'object') continue;
            const contributorUid = c.uid || c.paidByUid || c.userId || c.ownerId;
            const amount = Number(c.amount) || 0;

            if (contributorUid && aportesPorUid[contributorUid] !== undefined && amount > 0) {
                aportesPorUid[contributorUid] += amount;
            }
        }
    }

    // 3. Determinar el total de gastos compartidos a financiar
    let totalGastos = 0;
    if (typeof sharedExpenses === 'number') {
        totalGastos = Math.max(0, sharedExpenses);
    } else if (Array.isArray(sharedExpenses)) {
        totalGastos = sharedExpenses.reduce((acc, item) => {
            const val = Number(
                item?.amount !== undefined ? item.amount :
                item?.total !== undefined ? item.total :
                (item?.price && item?.quantity) ? item.price * item.quantity : 0
            ) || 0;
            return acc + val;
        }, 0);
    }

    const totalAportado = Object.values(aportesPorUid).reduce((a, b) => a + b, 0);
    // La base de reparto es el total de gastos compartidos, o lo efectivamente aportado si totalGastos es 0
    const baseReparto = totalGastos > 0 ? totalGastos : totalAportado;

    // 4. Calcular cuotas teóricas sin drift monetario
    const cuotasExactas = calcularAportesExactos(baseReparto, proporciones);

    // 5. Armar balances individuales
    const miembros = proporciones.map((p, idx) => {
        const uid = p.uid;
        const pagado = aportesPorUid[uid] || 0;
        const cuota = typeof cuotasExactas[idx] === 'object' ? cuotasExactas[idx].aporte : (cuotasExactas[idx] || 0);
        const saldoNeto = pagado - cuota;

        return {
            uid,
            displayName: p.displayName || p.name || 'Familiar',
            photoURL: p.photoURL || null,
            salary: p.salary || 0,
            proportion: p.proportion || 0,
            percentage: p.percentage || 0,
            totalAportado: pagado,
            totalCorrespondiente: cuota,
            saldoNeto
        };
    });

    // 6. Algoritmo de minimización de transacciones (Min Cash Flow greedy)
    const transferencias = [];

    // Acreedores (saldoNeto > 0): les deben plata
    const creditors = miembros
        .filter(m => m.saldoNeto > 0.009)
        .map(m => ({ ...m, balance: m.saldoNeto }))
        .sort((a, b) => b.balance - a.balance);

    // Deudores (saldoNeto < 0): deben aportar / devolver plata
    const debtors = miembros
        .filter(m => m.saldoNeto < -0.009)
        .map(m => ({ ...m, balance: Math.abs(m.saldoNeto) }))
        .sort((a, b) => b.balance - a.balance);

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
        const creditor = creditors[cIdx];
        const debtor = debtors[dIdx];

        const transferAmount = Math.min(creditor.balance, debtor.balance);
        const roundedAmount = Math.round(transferAmount);

        if (roundedAmount > 0) {
            transferencias.push({
                fromUid: debtor.uid,
                fromName: debtor.displayName,
                toUid: creditor.uid,
                toName: creditor.displayName,
                amount: roundedAmount
            });
        }

        creditor.balance -= transferAmount;
        debtor.balance -= transferAmount;

        if (creditor.balance < 0.01) cIdx++;
        if (debtor.balance < 0.01) dIdx++;
    }

    // 7. Texto pedagógico y amigable para WhatsApp o interfaz
    let resumenTexto = '';
    if (transferencias.length === 0) {
        resumenTexto = '¡Cuentas al día! No hay transferencias de compensación pendientes.';
    } else {
        const lines = transferencias.map(t =>
            `• ${t.fromName} le transfiere $${t.amount.toLocaleString('es-AR')} a ${t.toName}`
        );
        resumenTexto = `Compensaciones para saldar el mes:\n${lines.join('\n')}`;
    }

    return {
        totalGastos,
        totalAportado,
        saldoPendiente: Math.max(0, totalGastos - totalAportado),
        miembros,
        transferencias,
        resumenTexto
    };
};

/**
 * Función selectora canónica para unificar el cálculo de gastos compartidos mensuales.
 * Evita discrepancias entre Widgets, Dashboards y el Reparto de Servicios.
 *
 * Acepta tanto arrays de elementos como subtotales numéricos precomputados.
 *
 * @param {Array|number} [servicios=0]
 * @param {Array|number} [tarjetas=0]
 * @param {Array|number} [supermercado=0]
 * @param {Array|number} [frescos=0]
 * @param {Array|number} [efectivo=0]
 * @returns {number} Monto total de gastos compartidos del mes
 */
export const obtenerTotalGastosCompartidos = (
    servicios = 0,
    tarjetas = 0,
    supermercado = 0,
    frescos = 0,
    efectivo = 0
) => {
    const desglose = obtenerDesgloseGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo);
    return desglose.total;
};

/**
 * Devuelve el total unificado junto con el desglose categorizado.
 *
 * @param {Array|number} servicios
 * @param {Array|number} tarjetas
 * @param {Array|number} supermercado
 * @param {Array|number} frescos
 * @param {Array|number} efectivo
 * @returns {Object} { total, servicios, tarjetas, supermercado, frescos, efectivo }
 */
export const obtenerDesgloseGastosCompartidos = (
    servicios = 0,
    tarjetas = 0,
    supermercado = 0,
    frescos = 0,
    efectivo = 0
) => {
    const totServicios = sumarCategoria(servicios, s => Number(s.amount || s.monthlyInstallment || s.price || 0));
    const totTarjetas = sumarCategoria(tarjetas, c => Number(c.currentDebt || c.amount || 0));
    const totSupermercado = sumarCategoria(supermercado, i => {
        if (i.price !== undefined && i.quantity !== undefined) {
            return Number(i.price) * Number(i.quantity);
        }
        return Number(i.total || i.amount || 0);
    });
    const totFrescos = sumarCategoria(frescos, f => Number(f.total || f.amount || 0));
    const totEfectivo = sumarCategoria(efectivo, e => Number(e.amount || e.total || 0));

    const total = totServicios + totTarjetas + totSupermercado + totFrescos + totEfectivo;

    return {
        total,
        servicios: totServicios,
        tarjetas: totTarjetas,
        supermercado: totSupermercado,
        frescos: totFrescos,
        efectivo: totEfectivo
    };
};

obtenerTotalGastosCompartidos.desglose = obtenerDesgloseGastosCompartidos;

/**
 * Helper interno para sumar ítems de una categoría soportando número directo o array de objetos compartidos.
 */
function sumarCategoria(source, valueExtractor) {
    if (typeof source === 'number') {
        return Number.isFinite(source) && source > 0 ? source : 0;
    }
    if (!Array.isArray(source)) {
        return 0;
    }
    return source.reduce((acc, item) => {
        if (!item || typeof item !== 'object') return acc;
        // Solo computar ítems compartidos (isShared === true o no definido en caso de colecciones compartidas)
        if (item.isShared === false) return acc;
        const val = valueExtractor(item);
        return acc + (Number.isFinite(val) && val > 0 ? val : 0);
    }, 0);
}
