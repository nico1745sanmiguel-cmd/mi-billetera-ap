const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// Función auxiliar para realizar el fetch a Groq con reintentos
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const waitTime = 1000 * Math.pow(2, attempt);
                console.warn(`Límite alcanzado (429). Reintentando en ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            if (response.ok) return response;
            
            const errText = await response.text();
            throw new Error(`Error HTTP de Groq: ${response.status} - ${errText}`);
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries - 1) throw lastError;
            const waitTime = 500 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    throw lastError;
};

// ─── ENDPOINT 1: ESCÁNER DE TICKETS (Imagen a JSON) ───
exports.analyzeReceipt = functions.https.onCall(async (data, context) => {
    // 1. Verificación de Seguridad
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    // 2. Obtención de la clave secreta desde las variables de entorno de Firebase
    const GROQ_API_KEY = process.env.GROQ_API_KEY || functions.config().groq?.apikey;
    if (!GROQ_API_KEY) {
        console.error("GROQ_API_KEY no está configurada en el servidor.");
        throw new functions.https.HttpsError('internal', 'La API Key de IA no está configurada.');
    }

    const { base64Image, expectedItems } = data;
    if (!base64Image || !expectedItems) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros: base64Image o expectedItems');
    }

    const expectedNames = expectedItems.flatMap(i => i.name ? [i.name] : []).join(', ');
    
    const promptText = `Sos un experto asistente contable. Analizá este ticket de supermercado de la imagen. 
Tengo esta lista de productos que yo anoté: [${expectedNames}].
Extrae los productos individuales del ticket (ignorá subtotales, descuentos generales o números de tarjeta). 
Para cada producto del ticket, intentá identificar si corresponde a alguno de mi lista. Las abreviaturas del ticket pueden ser raras, usá tu sentido común para emparejarlos.
Respondé SOLAMENTE con un array en formato JSON puro. NINGUN TEXTO EXTRA. NO USES MARKDOWN.
Cada objeto del array debe tener:
- "scannedName": el nombre tal cual figura en el ticket.
- "scannedPrice": el precio total de ese ítem (como número).
- "matchedExpectedName": el nombre EXACTO de mi lista que le corresponde (o null si no pudiste emparejarlo con nada).`;

    try {
        const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: promptText },
                            { type: "image_url", image_url: { url: base64Image } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 1500
            })
        });

        const result = await response.json();
        let content = result.choices[0].message.content.trim();
        
        // Limpiar markdown residual
        if (content.startsWith('```json')) {
            content = content.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (content.startsWith('```')) {
            content = content.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const parsedContent = JSON.parse(content);
        return parsedContent;

    } catch (error) {
        console.error("Error en analyzeReceipt:", error);
        throw new functions.https.HttpsError('internal', `Error al analizar ticket: ${error.message}`);
    }
});

// ─── ENDPOINT 2: ESCÁNER DE RESÚMENES PDF (Texto a JSON) ───

// Fallback cascade para asegurar la respuesta si un modelo falla
const MODELS_TO_TRY = [
    'llama-3.1-8b-instant',      // Rápido y barato (Prioridad 1)
    'llama-3.3-70b-versatile',   // Potente (Fallback 1)
    'mixtral-8x7b-32768'         // Arquitectura diferente (Fallback 2)
];

const SYSTEM_PROMPT = `Eres un experto en extracción de datos financieros de resúmenes de tarjetas de crédito.

Tu ÚNICA tarea es extraer datos estructurados del texto. NO des consejos ni opiniones.

REGLAS CRÍTICAS:
1. SIEMPRE responde en JSON válido.
2. NUNCA inventes datos. Si no encontrás un campo, usá null.
3. TODOS los montos son números POSITIVOS.
4. TODAS las fechas en formato YYYY-MM-DD.
5. No incluyas datos personales completos (nros de tarjeta, CUIT).`;

const buildUserPrompt = (text) => `Extraé los datos financieros del siguiente texto de un resumen de tarjeta de crédito.

═══ REGLAS DE EXTRACCIÓN ═══
- Extraer Resumen (banco, cierre, vencimiento, total consumos, pago mínimo).
- IMPORTANTE: Buscar y extraer las fechas del PRÓXIMO período (próximo cierre y próximo vencimiento). Suelen aparecer como "Próximo cierre", "Próximo vencimiento", "Fecha de cierre siguiente", etc.
- Extraer Lista de Transacciones (fecha, nombre de comercio limpio, monto, si es cuota y qué número, categoría sugerida).
- Categorías válidas: Supermercado, Servicios, Servicios Digitales, Transporte, Indumentaria, Entretenimiento, Gastronomía, Salud, Automotor, Hogar, Impuestos y Comisiones, Pago, Varios.
- Si dice "SU PAGO", es un pago (isPayment: true). Las cuotas son compras, no pagos.
- Los montos son individuales de esa cuota o compra.

═══ FORMATO JSON DE SALIDA ESPERADO ═══
{
  "summary": {
    "bankName": "String",
    "closingDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD",
    "nextClosingDate": "YYYY-MM-DD o null si no se encuentra",
    "nextDueDate": "YYYY-MM-DD o null si no se encuentra",
    "totalConsumption": Number,
    "minPayment": Number
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "originalDescription": "String",
      "cleanName": "String",
      "category": "String",
      "amount": Number,
      "isInstallment": Boolean,
      "installmentCurrent": Number | null,
      "installmentTotal": Number | null,
      "isPayment": Boolean,
      "isTax": Boolean
    }
  ]
}

═══ TEXTO DEL DOCUMENTO ═══
"""
${text}
"""`;

exports.analyzeStatement = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY || functions.config().groq?.apikey;
    if (!GROQ_API_KEY) {
        throw new functions.https.HttpsError('internal', 'La API Key de IA no está configurada.');
    }

    const { rawText } = data;
    if (!rawText) {
        throw new functions.https.HttpsError('invalid-argument', 'Falta el texto a analizar');
    }

    // Limpieza de inputs (sin romper caracteres especiales)
    const cleanText = rawText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[SYSTEM\]/gi, '(SYSTEM)')
      .replace(/\[INST\]/gi, '(INST)')
      .substring(0, 20000);

    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`Intentando análisis de resumen con modelo: ${modelName}`);
            const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: buildUserPrompt(cleanText) }
                    ],
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                })
            });

            const resultData = await response.json();
            const textResponse = resultData.choices[0]?.message?.content;
            
            if (!textResponse) continue;

            const parsedResult = JSON.parse(textResponse);
            return parsedResult;

        } catch (error) {
            console.warn(`Falló el modelo ${modelName}:`, error.message);
            lastError = error;
        }
    }

    throw new functions.https.HttpsError('internal', `Todos los modelos fallaron. Último error: ${lastError?.message}`);
});
