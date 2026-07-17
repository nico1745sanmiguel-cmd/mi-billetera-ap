/**
 * cardDebtUtils.js
 * Lógica centralizada para calcular la deuda de tarjetas por mes.
 *
 * ANTES: esta lógica estaba copiada en 3 archivos distintos:
 *   - Home.jsx
 *   - SharedExpensesDashboard.jsx
 *   - useFinancialProjections.js
 *
 * AHORA: una sola fuente de verdad. Si hay un bug, se corrige acá y punto.
 */

/**
 * Convierte un targetMonthVal numérico a partir de un Date.
 * Ejemplo: new Date(2026, 4, 1) → 2026 * 12 + 4 = 24316
 * @param {Date} date
 * @returns {number}
 */
const dateToMonthVal = (date) => date.getFullYear() * 12 + date.getMonth();

/**
 * Convierte un string "YYYY-MM" a monthVal numérico.
 * @param {string} monthKey - Ej: "2026-05"
 * @returns {number}
 */
const monthKeyToVal = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    return year * 12 + (month - 1);
};

/**
 * Genera la clave "YYYY-MM" a partir de un Date.
 * Esta función estaba duplicada en 6+ archivos como código inline.
 * @param {Date} date
 * @returns {string} Ej: "2026-05"
 */
export const formatMonthKey = (date) => {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Calcula la deuda de UNA tarjeta para UN mes específico,
 * sumando las cuotas activas de las transacciones de esa tarjeta.
 *
 * Nota sobre timezone: usamos el truco de agregar el offset del timezone para
 * asegurarnos de trabajar siempre en hora local, no UTC. Esto evita que una
 * compra hecha el 1ro del mes aparezca en el mes anterior por diferencia horaria.
 *
 * @param {Array} transactions - Todas las transacciones
 * @param {string} cardId - ID de la tarjeta
 * @param {number} targetMonthVal - Mes objetivo en formato numérico (año * 12 + mes 0-indexed)
 * @returns {number} - Deuda total de esa tarjeta en ese mes
 */
export const calcularDeudaTarjetaMes = (transactions, cardId, targetMonthVal) => {
    return transactions
        .filter(t => {
            // Si cardId es null, suma todas las tarjetas (usado en proyecciones globales)
            const matchesCard = cardId === null ? true : t.cardId === cardId;
            return matchesCard && t.type !== 'cash';
        })
        .reduce((acc, t) => {
            const tDate = new Date(t.date);
            // Fix de timezone: normalizamos a hora local
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
            const endMonthVal = startMonthVal + (t.installments || 1);

            if (targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal) {
                return acc + Number(t.monthlyInstallment || 0);
            }
            return acc;
        }, 0);
};

/**
 * Calcula la deuda efectiva de una tarjeta para un mes dado.
 * Primero chequea si hay un resumen manual cargado (monthlyStatements).
 * Si no, calcula desde las transacciones.
 *
 * @param {Object} card - Objeto tarjeta de Firestore
 * @param {Array} transactions - Todas las transacciones
 * @param {string} targetMonthKey - Ej: "2026-05"
 * @param {number} targetMonthVal - Ej: 24316
 * @returns {number}
 */
export const calcularDeudaEfectivaTarjeta = (card, transactions, targetMonthKey, targetMonthVal) => {
    const manualAmount = card.monthlyStatements?.[targetMonthKey]?.totalDue
        ?? card.adjustments?.[targetMonthKey];

    if (manualAmount !== undefined) {
        return Number(manualAmount);
    }

    return calcularDeudaTarjetaMes(transactions, card.id, targetMonthVal);
};

/**
 * Construye el array de tarjetas con su deuda calculada para el mes.
 * Reemplaza el bloque `cardsWithDebt` que estaba duplicado en Home.jsx y SharedExpensesDashboard.
 *
 * @param {Array} cards - Array de tarjetas
 * @param {Array} transactions - Array de transacciones
 * @param {string} targetMonthKey - "YYYY-MM"
 * @param {number} targetMonthVal - año * 12 + mes
 * @returns {Array} cards con campo `currentDebt` agregado
 */
export const buildCardsWithDebt = (cards, transactions, targetMonthKey, targetMonthVal) => {
    return cards.map(card => ({
        ...card,
        currentDebt: calcularDeudaEfectivaTarjeta(card, transactions, targetMonthKey, targetMonthVal),
    }));
};
