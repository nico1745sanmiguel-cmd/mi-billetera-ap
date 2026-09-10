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

/**
 * Limpia recursivamente propiedades undefined para evitar errores directos de Firestore,
 * preservando instancias especiales como Date, RegExp y FieldValues.
 */
export const removeUndefined = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    // Si no es un objeto plano ni un Array (ej: Date, RegExp), se preserva tal cual
    if (Object.prototype.toString.call(obj) !== '[object Object]' && !Array.isArray(obj)) {
        return obj;
    }
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            cleaned[key] = removeUndefined(value);
        }
    }
    return cleaned;
};

/**
 * Limpia strings eliminando caracteres invisibles (zero-width) y recorta
 * protegiendo pares sustitutos (emojis compuestos) de partición inválida.
 */
export const cleanSafeString = (str, maxChars = 50) => {
    if (typeof str !== 'string') return '';
    const noInvisible = str.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').trim();
    if (noInvisible.length <= maxChars) return noInvisible;
    let sliced = noInvisible.slice(0, maxChars);
    // Si el último carácter es un high surrogate huérfano (0xD800-0xDBFF), eliminarlo para evitar UTF-16 malformado
    const lastCharCode = sliced.charCodeAt(sliced.length - 1);
    if (lastCharCode >= 0xD800 && lastCharCode <= 0xDBFF) {
        sliced = sliced.slice(0, -1);
    }
    return sliced.trim();
};

/**
 * Parsea montos financieros admitiendo formatos numéricos estándar, cadenas
 * formateadas con separador de miles argentino (ej: "85.000"), decimales con coma
 * (ej: "1.250.000,50") o punto estándar ("85.50").
 */
export const parseAmount = (val) => {
    if (typeof val === 'number') {
        return (!isNaN(val) && isFinite(val) && val >= 0) ? val : 0;
    }
    if (!val || typeof val !== 'string') return 0;
    const trimmed = val.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').trim();
    if (!trimmed) return 0;

    // Si es negativo
    if (trimmed.includes('-')) return 0;

    // Remover símbolos de moneda ($, ARS, USD, etc.), letras y espacios extra
    const cleaned = trimmed.replace(/[^0-9.,]/g, '').trim();
    if (!cleaned) return 0;

    let num = 0;

    // Si tiene puntos y comas (ej: "1.250.000,50" o "1,250,000.50")
    if (cleaned.includes('.') && cleaned.includes(',')) {
        if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            // Formato argentino/español: 1.250.000,50 -> elimina puntos y coma a punto
            num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        } else {
            // Formato inglés: 1,250,000.50
            num = parseFloat(cleaned.replace(/,/g, ''));
        }
    } else if (cleaned.includes(',')) {
        // Si tiene comas como separador decimal (ej: "85000,50" o "85,5")
        const parts = cleaned.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
            num = parseFloat(parts[0].replace(/\D/g, '') + '.' + parts[1]);
        } else {
            num = parseFloat(cleaned.replace(/,/g, ''));
        }
    } else if (cleaned.includes('.')) {
        // Si tiene puntos: "85.000" (miles) vs "85.5" (decimal)
        const parts = cleaned.split('.');
        // Múltiples puntos: separador de miles ej: 1.250.000
        if (parts.length > 2) {
            num = parseFloat(cleaned.replace(/\./g, ''));
        } else if (parts[1].length === 3) {
            // Un solo punto con exactamente 3 dígitos tras él: separador de miles en ARS (ej: 85.000)
            num = parseFloat(cleaned.replace(/\./g, ''));
        } else {
            // Decimal estándar (ej: 85.5 o 85.50)
            num = parseFloat(cleaned);
        }
    } else {
        num = parseFloat(cleaned);
    }

    return (!isNaN(num) && isFinite(num) && num >= 0) ? num : 0;
};

/**
 * Valida y formatea los últimos 4 dígitos de una tarjeta de crédito.
 * Preserva ceros a la izquierda (ej: "0012"), rechaza caracteres no numéricos
 * y longitudes distintas de 4. Acepta valores vacíos o nulos por ser opcional.
 *
 * @param {string|number|null|undefined} val
 * @returns {string|undefined} Cadena de 4 dígitos saneada o undefined si no fue provisto
 * @throws {Error} Si contiene caracteres no numéricos o su longitud no es exactamente 4
 */
export const sanitizeLast4 = (val) => {
    if (val === null || val === undefined) return undefined;
    const str = String(val).replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').trim();
    if (!str) return undefined;

    if (!/^\d{4}$/.test(str)) {
        throw new Error('Los últimos dígitos deben ser exactamente 4 números (0-9).');
    }

    return str;
};

/**
 * Sanea y valida los datos de una tarjeta de crédito antes de persistirla en la base de datos.
 *
 * @param {Object} data - Datos crudos de la tarjeta
 * @returns {Object} Datos saneados listos para Firestore
 */
export const sanitizeCardData = (data) => {
    if (!data || typeof data !== 'object') {
        throw new Error('Datos de tarjeta inválidos.');
    }

    const name = cleanSafeString(data.name, 50);
    if (!name) {
        throw new Error('El nombre de la tarjeta es obligatorio.');
    }

    const bank = cleanSafeString(data.bank, 50);
    if (!bank) {
        throw new Error('El banco emisor es obligatorio.');
    }

    const clampDay = (val, fallback = 1) => {
        if (typeof val === 'string' && /[eEa-zA-Z]/.test(val)) return fallback;
        const num = parseInt(val, 10);
        if (isNaN(num)) return fallback;
        return Math.min(Math.max(num, 1), 31);
    };

    const closeDay = clampDay(data.closeDay, 1);
    const dueDay = clampDay(data.dueDay, 10);

    const colorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
    let color = (typeof data.color === 'string' && colorRegex.test(data.color))
        ? data.color
        : '#1a1a1a';
    
    // Normalizar 3 dígitos (#abc) a 6 dígitos (#aabbcc) para evitar colores CSS inválidos al agregar alfa
    if (color.length === 4) {
        color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }

    const isShared = data.isShared !== undefined ? Boolean(data.isShared) : true;
    const last4 = sanitizeLast4(data.last4);

    return removeUndefined({
        name,
        bank,
        closeDay,
        dueDay,
        color,
        isShared,
        last4
    });
};

/**
 * Sanea datos de un resumen de tarjeta (manual o parseado por IA).
 *
 * @param {Object} data - Datos crudos del resumen
 * @returns {Object} Resumen saneado sin campos undefined ni montos NaN/negativos
 */
export const sanitizeStatementData = (data) => {
    if (!data || typeof data !== 'object') {
        return { totalDue: 0, dueDate: '', nextCloseDate: '', nextDueDate: '' };
    }

    const totalDue = parseAmount(data.totalDue);

    const sanitizeDate = (d) => {
        if (!d) return undefined;
        if (d instanceof Date && !isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        if (typeof d === 'string') {
            const trimmed = d.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').trim();
            // Formato ISO: YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                return trimmed.slice(0, 10);
            }
            // Formato argentino: DD/MM/YYYY o DD-MM-YYYY
            if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(trimmed)) {
                const sep = trimmed.includes('/') ? '/' : '-';
                const parts = trimmed.split(sep);
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2].slice(0, 4);
                return `${year}-${month}-${day}`;
            }
            return trimmed.slice(0, 10) || undefined;
        }
        return undefined;
    };

    const sanitized = {
        totalDue,
        dueDate: sanitizeDate(data.dueDate),
        nextCloseDate: sanitizeDate(data.nextCloseDate),
        nextDueDate: sanitizeDate(data.nextDueDate)
    };

    if (Array.isArray(data.transactions)) {
        sanitized.transactions = data.transactions
            .filter(tx => tx && typeof tx === 'object')
            .map(tx => {
                const parsePositiveInt = (val, fallback = 1) => {
                    const num = parseInt(val, 10);
                    return (!isNaN(num) && num > 0 && isFinite(num)) ? num : fallback;
                };

                const isInstallment = Boolean(tx.isInstallment);
                let installmentCurrent = parsePositiveInt(tx.installmentCurrent, 1);
                let installmentTotal = parsePositiveInt(tx.installmentTotal, 1);

                if (installmentCurrent > installmentTotal) {
                    installmentTotal = installmentCurrent;
                }

                return removeUndefined({
                    id: tx.id ? String(tx.id) : undefined,
                    cleanName: cleanSafeString(
                        typeof tx.cleanName === 'string' ? tx.cleanName : (typeof tx.originalDescription === 'string' ? tx.originalDescription : ''),
                        100
                    ),
                    originalDescription: cleanSafeString(tx.originalDescription, 150),
                    amount: parseAmount(tx.amount),
                    date: sanitizeDate(tx.date),
                    category: cleanSafeString(tx.category, 30) || 'Varios',
                    isPayment: Boolean(tx.isPayment),
                    isInstallment,
                    installmentCurrent: isInstallment ? installmentCurrent : 1,
                    installmentTotal: isInstallment ? installmentTotal : 1
                });
            });
    }

    return removeUndefined(sanitized);
};
