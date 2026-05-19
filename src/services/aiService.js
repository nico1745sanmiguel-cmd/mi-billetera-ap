import { SYSTEM_PROMPT, buildUserPrompt, sanitizeInput } from "../utils/prompts.js";

// Fetch con retry y backoff exponencial para resistir cortes de red o Rate Limits
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const waitTime = 1000 * Math.pow(2, attempt);
                console.warn(`⏳ Límite alcanzado. Reintentando en ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            if (response.ok) return response;
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Error HTTP: ${response.status}`);
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries - 1) throw lastError;
            const waitTime = 500 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    throw lastError;
};

// Fallback cascade para asegurar la respuesta si un modelo falla
const MODELS_TO_TRY = [
    'llama-3.1-8b-instant',      // Rápido y barato (Prioridad 1)
    'llama-3.3-70b-versatile',   // Potente (Fallback 1)
    'mixtral-8x7b-32768'         // Arquitectura diferente (Fallback 2)
];

/**
 * Envía el texto crudo del resumen a Groq para extraer un JSON estructurado
 */
export const analyzeStatement = async (rawText) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("No se encontró la API Key de Groq. Verificá el archivo .env.");
    }

    const cleanText = sanitizeInput(rawText);
    const textToAnalyze = cleanText.length > 20000 
        ? cleanText.substring(0, 20000) + "\n...[TRUNCADO]" 
        : cleanText;

    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🤖 Intentando análisis con modelo: ${modelName}`);
            const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: buildUserPrompt(textToAnalyze) }
                    ],
                    temperature: 0.1, // Temperatura baja para resultados determinísticos
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const textResponse = data.choices[0]?.message?.content;
            
            if (!textResponse) continue;

            // Intentamos parsear el JSON
            const parsedResult = JSON.parse(textResponse);
            console.log(`✅ Análisis exitoso con ${modelName}`);
            return parsedResult;

        } catch (error) {
            console.warn(`⚠️ Falló el modelo ${modelName}:`, error.message);
            lastError = error;
        }
    }

    throw new Error(`Todos los modelos de IA fallaron. Último error: ${lastError?.message}`);
};
