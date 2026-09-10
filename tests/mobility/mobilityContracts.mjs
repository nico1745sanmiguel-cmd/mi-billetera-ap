/**
 * mobilityContracts.mjs
 * Contratos de datos, lógica de negocio y especificaciones del módulo de Movilidad.
 * Actúa como oráculo autoritativo de especificación según PROJECT.md y conecta
 * directamente con las utilidades de producción (src/utils/security.js).
 */

import * as security from '../../src/utils/security.js';

export const { parseAmount, cleanSafeString, removeUndefined } = security;

/**
 * Retorna la fecha en formato YYYY-MM-DD respetando la zona horaria de Argentina (UTC-3).
 * Evita el desfasaje de fecha que ocurre después de las 21:00 hs con toISOString().
 *
 * @param {Date|string|number} d - Fecha a convertir
 * @param {string} timeZone - Zona horaria IANA (default: America/Argentina/Buenos_Aires)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getLocalDateString = (d = new Date(), timeZone = 'America/Argentina/Buenos_Aires') => {
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) {
        return new Date().toLocaleDateString('en-CA', { timeZone });
    }
    return dateObj.toLocaleDateString('en-CA', { timeZone });
};

/**
 * Obtiene el nombre del día de la semana en español (lunes..domingo).
 * Utiliza T12:00:00 para evitar desplazamientos por huso horario.
 *
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {string} Nombre del día en minúsculas
 */
export const getDayOfWeek = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return 'lunes';
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day, 12, 0, 0);
        return days[d.getDay()];
    }
    const d = new Date(dateStr + 'T12:00:00');
    return isNaN(d.getTime()) ? 'lunes' : days[d.getDay()];
};

/**
 * Calcula de forma segura la fecha del mes anterior sin desbordamiento de días (ej: 31 Mar -> 28/29 Feb).
 *
 * @param {Date} date - Fecha base
 * @returns {Date} Fecha en el mes anterior con día ajustado al máximo del mes
 */
export const getSafePrevMonthDate = (date) => {
    const d = new Date(date);
    const targetMonth = d.getMonth() - 1;
    const year = targetMonth < 0 ? d.getFullYear() - 1 : d.getFullYear();
    const normalizedMonth = (targetMonth + 12) % 12;
    // Días en el mes objetivo
    const daysInMonth = new Date(year, normalizedMonth + 1, 0).getDate();
    const safeDay = Math.min(d.getDate(), daysInMonth);
    return new Date(year, normalizedMonth, safeDay, d.getHours(), d.getMinutes(), d.getSeconds());
};

/**
 * Sanitiza una jornada de trabajo de movilidad asegurando:
 * 1. Campos numéricos seguros mediante parseAmount (sin NaN, ni negativos, ni Infinity).
 * 2. Supresión de campos undefined con removeUndefined.
 * 3. Cálculo de total (uber + didi + cabify + others).
 * 4. Cálculo de earningsPerHour y earningsPerKm.
 * 5. Determinación segura del día de la semana.
 *
 * @param {Object} data - Datos crudos de la sesión
 * @returns {Object} Sesión sanitizada
 */
export const sanitizeMobilitySession = (data) => {
    if (security.sanitizeMobilitySession) {
        return security.sanitizeMobilitySession(data);
    }
    if (!data || typeof data !== 'object') {
        data = {};
    }

    const uber = parseAmount(data.uber);
    const didi = parseAmount(data.didi);
    const cabify = parseAmount(data.cabify);
    const others = parseAmount(data.others);
    const total = uber + didi + cabify + others;

    const hoursWorked = parseAmount(data.hoursWorked);
    const kilometers = parseAmount(data.kilometers);

    let date = typeof data.date === 'string' ? cleanSafeString(data.date, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = getLocalDateString();
    }

    const dayOfWeek = (typeof data.dayOfWeek === 'string' && data.dayOfWeek.trim())
        ? cleanSafeString(data.dayOfWeek, 15)
        : getDayOfWeek(date);

    const notes = typeof data.notes === 'string' ? cleanSafeString(data.notes, 200) : '';

    const payload = {
        date,
        dayOfWeek,
        hoursWorked,
        kilometers,
        uber,
        didi,
        cabify,
        others,
        total,
        earningsPerHour: hoursWorked > 0 ? parseFloat((total / hoursWorked).toFixed(2)) : 0,
        earningsPerKm: kilometers > 0 ? parseFloat((total / kilometers).toFixed(2)) : 0,
    };

    if (notes) {
        payload.notes = notes;
    }

    return removeUndefined(payload);
};

/**
 * Sanitiza un gasto operativo de movilidad asegurando fecha, categoría, monto y notas.
 *
 * @param {Object} data - Datos crudos del gasto
 * @returns {Object} Gasto sanitizado
 */
export const sanitizeMobilityExpense = (data) => {
    if (security.sanitizeMobilityExpense) {
        return security.sanitizeMobilityExpense(data);
    }
    if (!data || typeof data !== 'object') {
        data = {};
    }

    let date = typeof data.date === 'string' ? cleanSafeString(data.date, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = getLocalDateString();
    }

    const category = cleanSafeString(data.category, 30) || 'gnc';
    const amount = parseAmount(data.amount);
    const notes = typeof data.notes === 'string' ? cleanSafeString(data.notes, 200) : '';

    const payload = {
        date,
        category,
        amount,
        notes
    };

    return removeUndefined(payload);
};

/**
 * Divide una lista de operaciones o documentos en lotes seguros para Firestore.
 * El límite estricto de Firestore es 500 operaciones por WriteBatch.
 *
 * @param {Array} items - Elementos a particionar
 * @param {number} maxBatchSize - Tamaño máximo por lote (default: 400, seguro <= 500)
 * @returns {Array<Array>} Matriz de lotes
 */
export const chunkOperations = (items, maxBatchSize = 400) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const safeSize = Math.max(1, Math.min(maxBatchSize, 500));
    const chunks = [];
    for (let i = 0; i < items.length; i += safeSize) {
        chunks.push(items.slice(i, i + safeSize));
    }
    return chunks;
};

/**
 * Parser de CSV conforme a RFC 4180 con autodetección de delimitador (, o ;) y formato decimal.
 * Preserva decimales en horas/km (ej: 8.5 -> 8.5) y parsea monedas formateadas en ARS.
 *
 * @param {string} text - Contenido crudo del archivo CSV
 * @returns {{ rows: Array<Object>, errors: Array<string> }} Filas parseadas y lista de errores
 */
export const parseMobilityCSV = (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('El archivo está vacío o el formato es inválido.');
    }

    // Dividir líneas preservando posibles saltos dentro de comillas
    const lines = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            currentLine += char;
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') {
                i++; // saltar \r\n
            }
            if (currentLine.trim()) {
                lines.push(currentLine.trim());
            }
            currentLine = '';
        } else {
            currentLine += char;
        }
    }
    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }

    if (lines.length < 2) {
        throw new Error('El archivo está vacío o solo tiene encabezado.');
    }

    // Autodetectar delimitador en la cabecera (, o ;)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    // Función auxiliar para separar columnas respetando comillas RFC 4180
    const splitColumns = (line) => {
        const cols = [];
        let cur = '';
        let inside = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inside && line[i + 1] === '"') {
                    cur += '"';
                    i++; // escapar comilla doble "" -> "
                } else {
                    inside = !inside;
                }
            } else if (c === delimiter && !inside) {
                cols.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        cols.push(cur.trim());
        return cols;
    };

    const headers = splitColumns(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));

    const colIndex = (keywords) => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const iDate   = colIndex(['fecha', 'date']);
    const iHours  = colIndex(['hora', 'horas', 'hours']);
    const iKm     = colIndex(['kil', 'km', 'kilometros']);
    const iUber   = colIndex(['uber']);
    const iDidi   = colIndex(['didi']);
    const iCabify = colIndex(['cabify']);
    const iOthers = colIndex(['otro', 'otros', 'other']);

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = splitColumns(lines[i]);
        if (cols.every(c => !c || c === '0' || c === '$0')) continue;

        let rawDate = iDate >= 0 ? cols[iDate] : '';
        let date = '';

        const dmyMatch = rawDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (dmyMatch) {
            date = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        } else if (isoMatch) {
            date = rawDate;
        } else {
            errors.push(`Fila ${i + 1}: fecha inválida "${rawDate}"`);
            continue;
        }

        const parseCSVNumber = (idx) => {
            if (idx < 0 || !cols[idx]) return 0;
            return parseAmount(cols[idx]);
        };

        const uber = parseCSVNumber(iUber);
        const didi = parseCSVNumber(iDidi);
        const cabify = parseCSVNumber(iCabify);
        const others = parseCSVNumber(iOthers);

        // Excluir filas sin ingresos registrados
        if (uber + didi + cabify + others === 0) continue;

        const hoursWorked = parseCSVNumber(iHours);
        const kilometers = parseCSVNumber(iKm);

        const session = sanitizeMobilitySession({
            date,
            hoursWorked,
            kilometers,
            uber,
            didi,
            cabify,
            others
        });

        rows.push(session);
    }

    return { rows, errors };
};

/**
 * Calcula los KPIs financieros y operativos del módulo de Movilidad.
 * Corrige el bug crítico donde los gastos incrementaban los días trabajados.
 *
 * @param {Array<Object>} sessions - Jornadas del período
 * @param {Array<Object>} expenses - Gastos del período
 * @param {Object} settings - Configuración activa
 * @returns {Object} Métricas calculadas
 */
export const calculateMobilityKPIs = (sessions = [], expenses = [], settings = {}) => {
    const validSessions = (sessions || []).map(sanitizeMobilitySession);
    const validExpenses = (expenses || []).map(sanitizeMobilityExpense);

    const totalEarnings = validSessions.reduce((acc, s) => acc + s.total, 0);
    const totalExpenses = validExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netEarnings = totalEarnings - totalExpenses;
    const profitMargin = totalEarnings > 0 ? (netEarnings / totalEarnings) * 100 : 0;

    // Días trabajados: cuenta únicamente días de jornadas reales, NUNCA gastos
    const daysWorked = validSessions.length;
    const avgPerDay = daysWorked > 0 ? totalEarnings / daysWorked : 0;

    // Mejor día: jornada con mayor ingreso total
    const bestDay = validSessions.length > 0
        ? [...validSessions].sort((a, b) => b.total - a.total)[0]
        : null;

    // Métricas globales de eficiencia
    const totalHours = validSessions.reduce((acc, s) => acc + s.hoursWorked, 0);
    const totalKm = validSessions.reduce((acc, s) => acc + s.kilometers, 0);
    const overallPerHour = totalHours > 0 ? parseFloat((totalEarnings / totalHours).toFixed(2)) : 0;
    const overallPerKm = totalKm > 0 ? parseFloat((totalEarnings / totalKm).toFixed(2)) : 0;

    // Desglose por plataforma
    const platformBreakdown = {
        uber: validSessions.reduce((acc, s) => acc + s.uber, 0),
        didi: validSessions.reduce((acc, s) => acc + s.didi, 0),
        cabify: validSessions.reduce((acc, s) => acc + s.cabify, 0),
        others: validSessions.reduce((acc, s) => acc + s.others, 0)
    };

    // Desglose por categoría de gasto
    const expenseBreakdown = validExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {});

    return {
        totalEarnings,
        totalExpenses,
        netEarnings,
        profitMargin,
        daysWorked,
        avgPerDay,
        bestDay,
        totalHours,
        totalKm,
        overallPerHour,
        overallPerKm,
        platformBreakdown,
        expenseBreakdown
    };
};

/**
 * Agrupa ingresos y gastos por semanas (S1, S2, etc.) según el día de inicio de semana configurado.
 * Garantiza que los gastos NO incrementen la cuenta de días trabajados.
 *
 * @param {Array<Object>} sessions - Lista de jornadas
 * @param {Array<Object>} expenses - Lista de gastos
 * @param {number} weekStartDay - 0=Dom, 1=Lun (default: 1)
 * @returns {Array<Object>} Lista de semanas ordenadas
 */
export const calculateWeeklyBreakdown = (sessions = [], expenses = [], weekStartDay = 1) => {
    const getWeekKey = (dateStr) => {
        const d = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = d.getDay();
        const daysFromStart = (dayOfWeek - weekStartDay + 7) % 7;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - daysFromStart);
        return getLocalDateString(weekStart);
    };

    const weeksMap = new Map();

    (sessions || []).forEach(s => {
        const cleanSession = sanitizeMobilitySession(s);
        const w = getWeekKey(cleanSession.date);
        if (!weeksMap.has(w)) {
            weeksMap.set(w, { total: 0, gastos: 0, days: 0 });
        }
        weeksMap.get(w).total += cleanSession.total;
        weeksMap.get(w).days += 1; // Solo sesiones suman días trabajados
    });

    (expenses || []).forEach(e => {
        const cleanExpense = sanitizeMobilityExpense(e);
        const w = getWeekKey(cleanExpense.date);
        if (!weeksMap.has(w)) {
            weeksMap.set(w, { total: 0, gastos: 0, days: 0 });
        }
        weeksMap.get(w).gastos += cleanExpense.amount;
        // CORRECCIÓN: NUNCA sumar days += 1 en gastos
    });

    return Array.from(weeksMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([weekKey, data], idx) => ({
            label: `S${idx + 1}`,
            weekKey,
            total: data.total,
            gastos: data.gastos,
            net: data.total - data.gastos,
            days: data.days
        }));
};
