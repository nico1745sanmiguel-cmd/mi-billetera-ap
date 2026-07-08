/**
 * Lee un archivo PDF y extrae todo su texto localmente en el navegador.
 * Soporta PDFs protegidos con contraseña.
 * @param {File} file - El archivo PDF cargado por el usuario.
 * @param {string} password - Contraseña opcional.
 * @returns {Promise<string>} - El texto completo del PDF.
 */
export const extractTextFromPDF = async (file, password = null) => {
    try {
        // Usamos importación dinámica desde CDN para evitar problemas de Vite con Web Workers
        const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.mjs');

        if (!pdfjsLib) {
            throw new Error("Fallo al descargar PDF.js. Revisá tu conexión a internet.");
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();

        // Seguridad: Timeout de 30s para evitar congelar el navegador
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 30000)
        );

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            password: password
        });

        let pdf;
        try {
            pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
        } catch (error) {
            if (error.message === 'TIMEOUT_ERROR') throw new Error('El archivo tardó demasiado en procesarse.');
            if (error.name === 'PasswordException') {
                if (error.code === 1) throw new Error('PASSWORD_REQUIRED');
                if (error.code === 2) throw new Error('PASSWORD_INCORRECT');
            }
            throw error;
        }

        // Límite de seguridad
        const MAX_PAGES = 50;
        if (pdf.numPages > MAX_PAGES) {
            throw new Error(`El PDF tiene demasiadas páginas (${pdf.numPages}). Máximo permitido: ${MAX_PAGES}.`);
        }

        let fullText = '';
        let totalChars = 0;
        const MAX_TOTAL_CHARS = 100000;

        const pagePromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(pdf.getPage(i).then(page => page.getTextContent()));
        }
        const pagesTextContent = await Promise.all(pagePromises);
        
        pagesTextContent.forEach((textContent, index) => {
            const pageText = textContent.items.map((item) => item.str).join(' ');
            totalChars += pageText.length;
            
            if (totalChars > MAX_TOTAL_CHARS) {
                throw new Error('El PDF es demasiado pesado en texto.');
            }

            fullText += `--- PÁGINA ${index + 1} ---\n${pageText}\n\n`;
        });

        // Validación básica de palabras clave
        const keywords = ['resumen', 'tarjeta', 'vencimiento', 'saldo', 'pago', 'cierre', 'credito', 'visa', 'mastercard'];
        const textLower = fullText.toLowerCase();
        const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword));

        if (matchedKeywords.length < 2) {
            throw new Error('INVALID_DOCUMENT');
        }

        return fullText;
    } catch (error) {
        console.error("Error leyendo PDF:", error);
        
        if (error.message === 'PASSWORD_REQUIRED') throw new Error('PASSWORD_REQUIRED');
        if (error.message === 'PASSWORD_INCORRECT') throw new Error('PASSWORD_INCORRECT');
        if (error.message === 'INVALID_DOCUMENT') throw new Error('El archivo no parece ser un resumen de tarjeta válido.');
        
        throw new Error(error.message || "No pudimos leer el archivo PDF.");
    }
};
