/**
 * security.js
 * Utilidades de seguridad y validación de datos para evitar corrupción en Firestore.
 */

/**
 * Valida y formatea un objeto antes de enviarlo a Firebase, 
 * asegurando que no haya números negativos (si no se permiten), NaN o valores basura.
 * 
 * @param {Object} data - Objeto de datos a sanear
 * @param {Array<string>} numericFields - Campos que obligatoriamente deben ser numéricos
 * @param {boolean} allowNegative - Si se permiten números negativos
 * @returns {Object} Objeto saneado
 * @throws {Error} Si algún campo es críticamente inválido y no puede recuperarse
 */
export const sanitizeFinancialData = (data, numericFields = [], allowNegative = false) => {
    if (!data || typeof data !== 'object') {
        throw new Error('Datos inválidos recibidos para sanear.');
    }

    const sanitized = { ...data };

    for (const field of numericFields) {
        if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
            let val = parseFloat(sanitized[field]);
            
            if (isNaN(val)) {
                console.warn(`El campo financiero ${field} no es numérico (NaN). Se forzará a 0.`);
                val = 0;
            }

            if (!allowNegative && val < 0) {
                console.warn(`El campo financiero ${field} es negativo (${val}). Se forzará a 0.`);
                val = 0;
            }

            sanitized[field] = val;
        }
    }

    // Remueve undefined para evitar errores directos de Firestore
    Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === undefined) {
            delete sanitized[key];
        }
    });

    return sanitized;
};
