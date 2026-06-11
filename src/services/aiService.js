import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Envía el texto crudo del resumen a Firebase Cloud Functions
 * para extraer un JSON estructurado utilizando Groq en el backend.
 */
export const analyzeStatement = async (rawText) => {
    try {
        const analyzeStatementFn = httpsCallable(functions, 'analyzeStatement');
        const response = await analyzeStatementFn({ rawText });
        
        return response.data;
    } catch (error) {
        console.error("Error al comunicarse con Cloud Function (analyzeStatement):", error);
        throw error;
    }
};
