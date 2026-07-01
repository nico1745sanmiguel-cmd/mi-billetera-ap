/**
 * purchasePrediction.js
 *
 * Analiza el historial de compras del supermercado y predice
 * qué ítems deberían aparecer en el mes actual.
 *
 * Reglas:
 *  - Necesita mínimo 2 compras históricas para predecir.
 *  - Frecuencia promedio = 1 mes → auto (se agrega solo).
 *  - Frecuencia promedio >= 2 meses → suggestion (el usuario confirma).
 *  - Solo se consideran ítems marcados como checked (comprados de verdad).
 */

/**
 * Calcula la diferencia en meses entre dos strings "YYYY-MM".
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
const monthDiff = (from, to) => {
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm);
};

/**
 * Analiza el historial de ítems del supermercado y devuelve predicciones.
 *
 * @param {Array} allItems - Todos los ítems del supermercado (todas las meses)
 * @param {string} currentMonthKey - Mes actual en formato "YYYY-MM"
 * @returns {{ auto: Array, suggestions: Array }}
 *   - auto: ítems con frecuencia ~1 mes (para agregar sin preguntar)
 *   - suggestions: ítems ocasionales (para mostrar como sugerencias)
 */
export const analyzePurchaseFrequency = (allItems, currentMonthKey) => {
    // Solo ítems de meses pasados que fueron comprados (checked)
    const historicalItems = allItems.filter(
        item => item.checked && item.month && item.month < currentMonthKey && item.name
    );

    if (historicalItems.length === 0) return { auto: [], suggestions: [] };

    // Agrupar por nombre normalizado
    const byName = {};
    for (const item of historicalItems) {
        const key = item.name.trim().toLowerCase();
        if (!byName[key]) byName[key] = [];
        byName[key].push(item);
    }

    const auto = [];
    const suggestions = [];

    for (const [, itemGroup] of Object.entries(byName)) {
        // Necesitamos al menos 2 compras para calcular frecuencia
        if (itemGroup.length < 2) continue;

        // Ordenar por mes
        const sorted = [...itemGroup].sort((a, b) => a.month.localeCompare(b.month));

        // Calcular intervalos entre compras consecutivas
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            const gap = monthDiff(sorted[i - 1].month, sorted[i].month);
            if (gap > 0) gaps.push(gap);
        }

        if (gaps.length === 0) continue;

        const avgFrequency = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const lastMonth = sorted[sorted.length - 1].month;
        const monthsSinceLast = monthDiff(lastMonth, currentMonthKey);

        // Solo incluir si "toca" este mes (con tolerancia de 0.5 meses)
        if (monthsSinceLast < avgFrequency - 0.5) continue;

        // Usar el ítem más reciente como referencia de precio y cantidad
        const reference = sorted[sorted.length - 1];
        const prediction = {
            name: reference.name,
            price: reference.price || 0,
            quantity: reference.quantity || 1,
            avgFrequency: Math.round(avgFrequency * 10) / 10,
            lastMonth,
        };

        if (avgFrequency <= 1.4) {
            // Se compra todos los meses → automático
            auto.push(prediction);
        } else {
            // Se compra ocasionalmente → sugerencia
            suggestions.push(prediction);
        }
    }

    // Ordenar alfabéticamente
    auto.sort((a, b) => a.name.localeCompare(b.name));
    suggestions.sort((a, b) => a.name.localeCompare(b.name));

    return { auto, suggestions };
};
