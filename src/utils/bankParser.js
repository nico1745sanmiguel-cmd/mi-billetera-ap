/**
 * bankParser.js
 * Utilidad para interpretar texto pegado de resúmenes bancarios (Visa Home, Homebanking, etc.)
 */

export const parseBankText = (rawText) => {
    if (!rawText) return [];

    const lines = rawText.split('\n');
    const parsedItems = [];

    // Expresiones Regulares Comunes

    // Caso 1: Formato "DD/MM DESCRIPCION $ MONTO" (Muy común en Visa Home básico)
    // Ej: 12/05 UBER TRIP HELP.UBER.COM 1.250,00
    const regexSimple = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/;

    // Caso 2: Formato con cuotas "DD/MM DESCRIPCION C.01/03 $ MONTO"
    const regexCuotas = /^(\d{2}\/\d{2})\s+(.+?)\s+C\.(\d{2}\/\d{2})\s+([\d.,]+)$/;

    // Caso 3: Formato fecha completa "DD/MM/YYYY" o "YYYY-MM-DD"
    // (A futuro si pegan desde Excel)

    lines.forEach((line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return; // Saltar líneas vacías

        let match = null;
        let item = null;

        // Intentar match con Caso 2 (Cuotas)
        if ((match = cleanLine.match(regexCuotas))) {
            const [_, dateStr, desc, cuotasInfo, amountStr] = match;
            item = {
                originalDate: dateStr, // "12/05"
                description: desc.trim(), // "MERCADOLIBRE"
                originalAmount: amountStr, // "12.500,00"
                installmentsInfo: cuotasInfo, // "01/03"
            };
        }
        // Intentar match con Caso 1 (Simple)
        else if ((match = cleanLine.match(regexSimple))) {
            const [_, dateStr, desc, amountStr] = match;

            // A veces el regex simple agarra basura, validamos que el monto parezca monto
            if (isValidAmount(amountStr)) {
                item = {
                    originalDate: dateStr,
                    description: desc.trim(),
                    originalAmount: amountStr,
                    installmentsInfo: null,
                };
            }
        }

        if (item) {
            // Normalizar datos
            item.amount = parseAmount(item.originalAmount);
            // Asumimos año actual para la fecha si viene sin año, o lógica posterior de "mes del resumen"
            item.parsedDate = parsePartialDate(item.originalDate);

            parsedItems.push(item);
        }
    });

    return parsedItems;
};

// --- Helpers ---

// Convierte "1.250,50" o "1250.50" a float
const parseAmount = (str) => {
    // Eliminar símbolos de moneda y espacios
    let clean = str.replace(/[$\s]/g, '');

    // Detección heurística de separador de miles vs decimales
    // En AR: punto para miles, coma para decimales -> 1.000,00
    // En sistemas yanquis: coma para miles, punto para decimales -> 1,000.00

    // Si tiene coma y es el último separador, asumimos formato AR/EU
    if (clean.includes(',') && clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        clean = clean.replace(/\./g, ''); // Quitar miles
        clean = clean.replace(',', '.');  // Cambiar decimal a punto
    } else {
        // Asumimos formato plano o US
        clean = clean.replace(/,/g, ''); // Quitar miles US
    }

    return parseFloat(clean);
};

const isValidAmount = (str) => {
    // Debe contener al menos un numero
    return /\d/.test(str);
};

// Convierte "12/05" a objeto Date (asumiendo año actual o lógica de cierre)
const parsePartialDate = (str) => {
    // str espera ser "DD/MM"
    const [day, month] = str.split('/');
    const now = new Date();
    const currentYear = now.getFullYear();

    // Crear fecha (Ojo: Month en JS es 0-index)
    const date = new Date(currentYear, parseInt(month) - 1, parseInt(day));

    return date;
};
