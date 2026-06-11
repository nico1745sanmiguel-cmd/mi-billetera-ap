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
