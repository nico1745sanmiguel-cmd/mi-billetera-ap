/**
 * Servicio de lógica para Stop Loss Dinámico (Trailing Stop)
 * basado en los parámetros de volatilidad/Beta descritos por el autor.
 */

/**
 * Obtiene el porcentaje de stop loss a aplicar según el Beta del activo.
 * - Beta < 0.85 (Baja volatilidad) -> -5%
 * - Beta entre 0.85 y 1.95 (Media volatilidad) -> -6%
 * - Beta > 1.95 (Alta volatilidad) -> -8%
 * 
 * @param {number} beta - Coeficiente Beta del activo.
 * @returns {number} Porcentaje de stop (en decimal, ej: 0.06).
 */
export function getStopLossPercentage(beta) {
    const b = parseFloat(beta);
    if (isNaN(b)) return 0.06; // Por defecto -6%
    
    if (b < 0.85) {
        return 0.05; // -5%
    } else if (b <= 1.95) {
        return 0.06; // -6%
    } else {
        return 0.08; // -8%
    }
}

/**
 * Calcula el valor del precio del Stop Loss a partir del precio máximo alcanzado.
 * 
 * @param {number} maxPrice - Precio máximo alcanzado desde la compra.
 * @param {number} beta - Coeficiente Beta.
 * @returns {number} Precio límite de stop loss.
 */
export function calculateStopPrice(maxPrice, beta) {
    const pct = getStopLossPercentage(beta);
    const maxP = parseFloat(maxPrice) || 0;
    return maxP * (1 - pct);
}

/**
 * Determina si el precio actual ha cruzado o tocado el Stop Loss.
 * 
 * @param {number} currentPrice - Precio actual del activo.
 * @param {number} stopPrice - Precio de Stop configurado.
 * @returns {boolean} True si se ejecutó el stop loss.
 */
export function isStopLossTriggered(currentPrice, stopPrice) {
    const curr = parseFloat(currentPrice) || 0;
    const stop = parseFloat(stopPrice) || 0;
    if (curr <= 0 || stop <= 0) return false;
    return curr <= stop;
}

/**
 * Mapea un nivel de volatilidad cualitativa a un valor representativo de Beta.
 * Útil para la UI si el usuario no conoce el Beta exacto del activo.
 * 
 * @param {string} level - 'low', 'medium', 'high'
 * @returns {number} Beta sugerido.
 */
export function mapVolToBeta(level) {
    switch (level) {
        case 'low': return 0.70;
        case 'high': return 2.10;
        case 'medium':
        default:
            return 1.20;
    }
}

/**
 * Mapea un Beta a su nivel de volatilidad cualitativa correspondiente.
 * 
 * @param {number} beta 
 * @returns {string} 'low', 'medium', 'high'
 */
export function mapBetaToVol(beta) {
    const b = parseFloat(beta);
    if (isNaN(b)) return 'medium';
    if (b < 0.85) return 'low';
    if (b <= 1.95) return 'medium';
    return 'high';
}
