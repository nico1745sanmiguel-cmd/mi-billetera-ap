import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';

// Configurar el worker usando una versión fija compatible para evitar problemas de resolución dinámica.
// Usamos la versión 3.11.174 que es muy estable, o podríamos intentar usar `version` si está disponible.
const workerVersion = version || '3.11.174';
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.js`;

export const extractTextFromPDF = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Cargar documento
        const loadingTask = getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Unir los items de texto
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error("Error detallado parsing PDF:", error);
        throw error;
    }
};
