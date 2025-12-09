// src/utils.js
// Esta función convierte cualquier número en formato plata argentina
// Ejemplo: 12000 -> $ 12.000
export const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0, // Sin centavos
    maximumFractionDigits: 0, // Sin centavos
  }).format(Number(amount) || 0);
};