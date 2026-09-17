import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Llama a la Cloud Function analyzeSavingsCapture pasándole la imagen en base64
 * y la cartera de destino.
 * @param {string} base64Image - Imagen en formato base64 con el prefijo "data:image/..." o puro.
 * @param {string} carteraDestino - Nombre de la cartera elegida.
 * @returns {Promise<Array>} - Array de operaciones detectadas.
 */
export const analyzeSavingsCapture = async (base64Image, carteraDestino = 'General') => {
    try {
        const analyzeFn = httpsCallable(functions, 'analyzeSavingsCapture');
        const response = await analyzeFn({ base64Image, carteraDestino });
        
        return response.data;
    } catch (error) {
        console.error("Error al comunicarse con Cloud Function (analyzeSavingsCapture):", error);
        throw error;
    }
};

/**
 * Convierte un File de input a un string base64.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};
