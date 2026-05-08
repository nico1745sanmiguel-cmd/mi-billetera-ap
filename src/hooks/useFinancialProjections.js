import { useMemo } from 'react';
import { formatMonthKey, calcularDeudaTarjetaMes } from '../utils/cardDebtUtils';
import { PROJECTION_MONTHS } from '../config/constants';

/**
 * Hook to calculate financial projections for the next 6 months.
 * 
 * @param {Array} transactions - List of all transactions
 * @param {Array} cards - List of cards (to check manually adjusted debts if any)
 * @param {Date} currentDate - The current reference date (defaults to now)
 * @param {Object} newPurchase - Optional. Context of the new purchase being created { amount, installments, cardId }
 * @returns {Array} Array of 6 month objects with { monthLabel, existingAmount, newAmount, totalAmount }
 */
export const useFinancialProjections = (transactions = [], cards = [], currentDate = new Date(), newPurchase = null) => {

    return useMemo(() => {
        const projections = [];
        const baseDate = new Date(currentDate);

        // Helper to get year-month key — ahora viene de cardDebtUtils
        // const getMonthKey = ... (eliminado, se usa formatMonthKey)

        // Generar los próximos N meses (cantidad definida en PROJECTION_MONTHS)
        for (let i = 0; i < PROJECTION_MONTHS; i++) {
            const futureDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            const futureMonthVal = futureDate.getFullYear() * 12 + futureDate.getMonth();
            const futureKey = formatMonthKey(futureDate);

            // Suma todas las cuotas de crédito activas en este mes futuro
            // calcularDeudaTarjetaMes con cardId=null suma TODAS las tarjetas
            let existingDebt = calcularDeudaTarjetaMes(
                transactions.filter(t => t.type === 'credit'),
                null,
                futureMonthVal
            );

            // Add manual adjustments from cards if any (legacy feature support)
            cards.forEach(card => {
                const manualNextValue = card.monthlyStatements?.[futureKey]?.totalDue ?? card.adjustments?.[futureKey];
                if (manualNextValue !== undefined) {
                    existingDebt += Number(manualNextValue);
                }
            });

            // 2. Calculate New Purchase Impact
            let newPurchaseDebt = 0;
            if (newPurchase && newPurchase.amount && newPurchase.installments && newPurchase.cardId) {
                // Only if this future month is within the new purchase installment range
                // Assuming new purchase starts "next month" usually via credit card logic, 
                // BUT for simplicity in this app version, typically it starts same month or next depending on closing date.
                // We will assume it affects immediately for visual simplicity unless specified.
                // Actually user requested "Compromised from here to 6 months".

                // Let's assume it starts at month 0 (current month) relative to the projection list
                if (i < newPurchase.installments) {
                    newPurchaseDebt = Number(newPurchase.amount) / Number(newPurchase.installments);
                }
            }

            projections.push({
                monthLabel: futureDate.toLocaleString('es-AR', { month: 'short' }).toUpperCase(),
                year: futureDate.getFullYear(),
                existing: existingDebt,
                newImpact: newPurchaseDebt,
                total: existingDebt + newPurchaseDebt
            });
        }

        return projections;
    }, [transactions, cards, currentDate, newPurchase]);
};
