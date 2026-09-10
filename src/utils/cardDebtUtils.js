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
export const dateToMonthVal = (date) => date.getFullYear() * 12 + date.getMonth();

/**
 * Convierte un string "YYYY-MM" a monthVal numérico.
 * @param {string} monthKey - Ej: "2026-05"
 * @returns {number}
 */
export const monthKeyToVal = (monthKey) => {
    if (!monthKey || typeof monthKey !== 'string') return 0;
    const parts = monthKey.split('-');
    if (parts.length < 2) return 0;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return 0;
    return year * 12 + (month - 1);
};

/**
 * Genera la clave "YYYY-MM" a partir de un Date o string ISO.
 * Esta función estaba duplicada en 6+ archivos como código inline.
 * @param {Date|string} date
 * @returns {string} Ej: "2026-05"
 */
export const formatMonthKey = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}/.test(date)) {
            return date.slice(0, 7);
        }
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        }
        return '';
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Calcula la deuda de UNA tarjeta para UN mes específico,
 * sumando las cuotas activas de las transacciones de esa tarjeta.
 *
 * @param {Array} transactions - Todas las transacciones
 * @param {string} cardId - ID de la tarjeta
 * @param {number} targetMonthVal - Mes objetivo en formato numérico (año * 12 + mes 0-indexed)
 * @returns {number} - Deuda total de esa tarjeta en ese mes
 */
export const calcularDeudaTarjetaMes = (transactions, cardId, targetMonthVal) => {
    if (!Array.isArray(transactions) || typeof targetMonthVal !== 'number' || !Number.isFinite(targetMonthVal)) return 0;

    return transactions
        .filter(t => {
            if (!t || typeof t !== 'object') return false;
            // Si cardId es null, suma todas las tarjetas (usado en proyecciones globales)
            const matchesCard = cardId === null ? true : t.cardId === cardId;
            return matchesCard && t.type !== 'cash';
        })
        .reduce((acc, t) => {
            if (!t.date) return acc;

            let startMonthVal = null;
            if (typeof t.date === 'string' && /^\d{4}-\d{2}/.test(t.date)) {
                const parts = t.date.split('-');
                const y = Number(parts[0]);
                const m = Number(parts[1]);
                if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
                    startMonthVal = y * 12 + (m - 1);
                }
            }

            if (startMonthVal === null) {
                const tDate = new Date(t.date);
                if (isNaN(tDate.getTime())) return acc;
                // Fix de timezone: normalizamos a hora local si viene de objeto Date
                const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
            }

            const installments = Math.max(1, parseInt(t.installments, 10) || 1);
            const endMonthVal = startMonthVal + installments;

            if (targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal) {
                const monthlyAmt = Number(t.monthlyInstallment);
                const safeAmt = (!isNaN(monthlyAmt) && isFinite(monthlyAmt) && monthlyAmt > 0) ? monthlyAmt : 0;
                return acc + safeAmt;
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
    if (!card || typeof card !== 'object') return 0;

    const manualAmount = card.monthlyStatements?.[targetMonthKey]?.totalDue
        ?? card.adjustments?.[targetMonthKey];

    if (manualAmount !== undefined) {
        const num = Number(manualAmount);
        return (!isNaN(num) && isFinite(num) && num >= 0) ? num : 0;
    }

    return calcularDeudaTarjetaMes(transactions, card.id || null, targetMonthVal);
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
    if (!Array.isArray(cards)) return [];
    return cards.map(card => ({
        ...card,
        currentDebt: calcularDeudaEfectivaTarjeta(card, transactions, targetMonthKey, targetMonthVal),
    }));
};
