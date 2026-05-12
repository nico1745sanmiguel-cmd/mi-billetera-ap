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

export const analyzeDriverImage = async (base64Image) => {
    const promptText = `Sos un experto asistente de IA para un chofer profesional de Uber/Didi. Analizá esta imagen (puede ser una captura de pantalla de la app, una foto de un surtidor de GNC/Nafta, o una factura de taller).
Identificá a qué categoría pertenece y extraé los datos. 
Respondé SOLAMENTE con un objeto JSON puro. NINGUN TEXTO EXTRA. NO USES MARKDOWN.

El objeto debe tener la propiedad "category" que puede ser: "VIAJE", "COMBUSTIBLE" o "MANTENIMIENTO".
Y una propiedad "data" con el objeto correspondiente.

Reglas por categoría:
1. Si es "VIAJE" (captura de Uber o Didi):
"data": { "fecha": "YYYY-MM-DD", "uber": 0, "didi": 0, "otros": 0, "cabify": 0, "horas": 0, "km": 0 }
(Asigná la ganancia a la app que corresponda viendo la pantalla. Extraé las horas y km si figuran en pantalla).

2. Si es "COMBUSTIBLE" (foto surtidor o ticket):
"data": { "fecha": "YYYY-MM-DD", "tipo": "GNC o Nafta", "cantidad": 0, "precioUnitario": 0, "total": 0 }
(Deducí si es GNC o Nafta por la unidad m3 o Litros, o el contexto visual).

3. Si es "MANTENIMIENTO" (factura repuesto, aceite, taller):
"data": { "fecha": "YYYY-MM-DD", "tipo": "Reparación/Aceite/Repuesto", "km": "kilometraje si figura", "descripcion": "detalle breve", "total": 0 }

IMPORTANTE: Si no figura una fecha explícita en la imagen, poné el string "HOY". Si algún dato numérico falta, poné 0.
Asegurate de devolver SOLO un JSON válido.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': \`Bearer \${GROQ_API_KEY}\`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.2-90b-vision-preview', // Usamos el de 90b porque es más inteligente deduciendo pantallas
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

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(\`Error de Groq: \${response.status} \${errText}\`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    if (content.startsWith('\`\`\`json')) {
        content = content.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (content.startsWith('\`\`\`')) {
        content = content.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    try {
        return JSON.parse(content);
    } catch (e) {
        console.error("No se pudo parsear el JSON de conductor:", content);
        throw new Error("El formato devuelto por la IA no fue válido.");
    }
};
