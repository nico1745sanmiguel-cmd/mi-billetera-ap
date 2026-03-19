export const extractTextFromPDF = async (file) => {
    try {
        const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist');
        const workerVersion = version || '3.11.174';
        GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.js`;

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
