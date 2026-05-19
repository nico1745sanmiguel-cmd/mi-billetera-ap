export const SYSTEM_PROMPT = `Eres un experto en extracción de datos financieros de resúmenes de tarjetas de crédito.

Tu ÚNICA tarea es extraer datos estructurados del texto. NO des consejos ni opiniones.

REGLAS CRÍTICAS:
1. SIEMPRE responde en JSON válido.
2. NUNCA inventes datos. Si no encontrás un campo, usá null.
3. TODOS los montos son números POSITIVOS.
4. TODAS las fechas en formato YYYY-MM-DD.
5. No incluyas datos personales completos (nros de tarjeta, CUIT).`;

export function buildUserPrompt(text) {
  return `Extraé los datos financieros del siguiente texto de un resumen de tarjeta de crédito.

═══ REGLAS DE EXTRACCIÓN ═══
- Extraer Resumen (banco, cierre, vencimiento, total consumos, pago mínimo).
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
}

export function sanitizeInput(text) {
  if (!text) return "";
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[SYSTEM\]/gi, '(SYSTEM)')
    .replace(/\[INST\]/gi, '(INST)');
}
