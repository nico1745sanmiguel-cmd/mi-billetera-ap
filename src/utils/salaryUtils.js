/**
 * salaryUtils.js
 * Lógica de cálculo de proporciones salariales para reparto de gastos compartidos.
 *
 * El sueldo de cada usuario es un historial: [{ amount: Number, date: String (ISO) }]
 * Siempre se usa el entry más reciente como sueldo actual.
 */

/**
 * Dado el historial de sueldos de un usuario, devuelve el sueldo más reciente.
 * @param {Array} salaryHistory - Array de { amount, date }
 * @returns {Number} - El monto del sueldo más reciente, o 0 si no hay historial
 */
export const getLatestSalary = (salaryHistory) => {
    if (!salaryHistory || salaryHistory.length === 0) return 0;
    const sorted = [...salaryHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    return Number(sorted[0].amount) || 0;
};

/**
 * Calcula la proporción de cada miembro en base a su sueldo actual.
 * @param {Array} members - Array de { uid, displayName, salaryHistory, photoURL }
 * @returns {Array} - Array de { uid, displayName, photoURL, salary, proportion, percentage }
 *   proportion: número entre 0 y 1
 *   percentage: número entre 0 y 100 (redondeado a 1 decimal)
 */
export const calcularProporciones = (members) => {
    if (!members || members.length === 0) return [];

    const withSalary = members.map(m => ({
        ...m,
        salary: getLatestSalary(m.salaryHistory)
    }));

    const totalSalary = withSalary.reduce((acc, m) => acc + m.salary, 0);

    if (totalSalary === 0) {
        // Si nadie tiene sueldo cargado, reparto igualitario
        const equal = 1 / withSalary.length;
        return withSalary.map(m => ({
            ...m,
            proportion: equal,
            percentage: Math.round(equal * 1000) / 10
        }));
    }

    return withSalary.map(m => {
        const proportion = m.salary / totalSalary;
        return {
            ...m,
            proportion,
            percentage: Math.round(proportion * 1000) / 10
        };
    });
};

/**
 * Calcula cuánto le corresponde pagar a un miembro de un gasto compartido.
 * @param {Number} totalGasto - Monto total del gasto compartido
 * @param {Number} proportion - Proporción del miembro (0 a 1)
 * @returns {Number}
 */
export const calcularAporte = (totalGasto, proportion) => {
    return Math.round(totalGasto * proportion);
};

/**
 * Dado el array de transacciones/servicios compartidos y las proporciones,
 * calcula el total que le corresponde a cada miembro en el mes seleccionado.
 * @param {Array} sharedItems - Transacciones/services con isShared === true
 * @param {Array} proporciones - Resultado de calcularProporciones()
 * @param {String} currentUid - UID del usuario actual
 * @returns {Object} { myTotal, partnerTotal, grandTotal }
 */
export const calcularTotalesMes = (sharedItems, proporciones, currentUid) => {
    if (!sharedItems || !proporciones || proporciones.length === 0) {
        return { myTotal: 0, partnerTotal: 0, grandTotal: 0 };
    }

    const grandTotal = sharedItems.reduce((acc, item) => {
        const amount = item.monthlyInstallment || item.amount || 0;
        return acc + Number(amount);
    }, 0);

    const me = proporciones.find(m => m.uid === currentUid);
    const myProportion = me ? me.proportion : 1 / proporciones.length;
    const myTotal = calcularAporte(grandTotal, myProportion);
    const partnerTotal = grandTotal - myTotal;

    return { myTotal, partnerTotal, grandTotal };
};
