const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const analyzeReceipt = async (base64Image, expectedItems) => {
    const expectedNames = expectedItems.map(i => i.name).filter(Boolean).join(', ');
    
    const promptText = `Sos un experto asistente contable. Analizá este ticket de supermercado de la imagen. 
Tengo esta lista de productos que yo anoté: [${expectedNames}].
Extrae los productos individuales del ticket (ignorá subtotales, descuentos generales o números de tarjeta). 
Para cada producto del ticket, intentá identificar si corresponde a alguno de mi lista. Las abreviaturas del ticket pueden ser raras, usá tu sentido común para emparejarlos.
Respondé SOLAMENTE con un array en formato JSON puro. NINGUN TEXTO EXTRA. NO USES MARKDOWN.
Cada objeto del array debe tener:
- "scannedName": el nombre tal cual figura en el ticket.
- "scannedPrice": el precio total de ese ítem (como número).
- "matchedExpectedName": el nombre EXACTO de mi lista que le corresponde (o null si no pudiste emparejarlo con nada).`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.2-11b-vision-preview',
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: promptText
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Image
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error de Groq: ${response.status} ${errText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Limpiar markdown por si acaso
    if (content.startsWith('```json')) {
        content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
        content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
        return JSON.parse(content);
    } catch (e) {
        console.error("No se pudo parsear el JSON:", content);
        throw new Error("El formato devuelto por la IA no fue válido.");
    }
};
