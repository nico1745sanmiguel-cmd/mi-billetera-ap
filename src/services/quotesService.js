import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Consulta precios en tiempo real de múltiples tickers via Yahoo Finance
 * (a través de una Cloud Function para evitar bloqueos de CORS en el navegador).
 * 
 * @param {string[]} tickers - Array de tickers en formato Yahoo Finance
 *   Ejemplos: ["MSFT", "BYMA.BA", "BTC-USD", "GGAL.BA"]
 * @returns {Object} - Mapa ticker → { price, currency, changePercent, name }
 */
export const getQuotes = async (tickers) => {
    const validTickers = (tickers || []).filter(t => t && typeof t === 'string');
    if (validTickers.length === 0) return {};

    try {
        const fn = httpsCallable(functions, 'getQuotes');
        const response = await fn({ tickers: validTickers });
        return response.data || {};
    } catch (error) {
        console.error("Error al obtener cotizaciones:", error);
        return {}; // Fallback silencioso: si falla la API, el sistema sigue andando
    }
};
