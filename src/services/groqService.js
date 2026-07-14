import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export const analyzeReceipt = async (base64Image, expectedItems) => {
    try {
        const analyzeReceiptFn = httpsCallable(functions, 'analyzeReceipt');
        const response = await analyzeReceiptFn({
            base64Image,
            expectedItems
        });
        
        return response.data;
    } catch (error) {
        console.error("Error al comunicarse con Cloud Function (analyzeReceipt):", error);
        throw error;
    }
};

/**
 * Envía una captura de pantalla de una app de inversiones a Groq para
 * extraer las transacciones detectadas (especie, cantidad, precio compra, etc.)
 * @param {string} base64Image - Imagen en base64 (con prefijo data:image/...)
 * @param {string} [carteraHint] - Nombre opcional de la cartera para darle contexto a la IA
 * @returns {{ carteraInferida: string, transacciones: Array }} 
 */
export const analyzeSavingsCapture = async (base64Image, carteraHint = '') => {
    try {
        const fn = httpsCallable(functions, 'analyzeSavingsCapture');
        const response = await fn({ base64Image, carteraHint });
        return response.data;
    } catch (error) {
        console.error("Error al comunicarse con Cloud Function (analyzeSavingsCapture):", error);
        throw error;
    }
};
