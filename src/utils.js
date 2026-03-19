// src/utils.js
// Esta función convierte cualquier número en formato plata argentina para visualización
// Ejemplo: 12000 -> $ 12.000
export const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0, // Sin centavos
    maximumFractionDigits: 0, // Sin centavos
  }).format(Number(amount) || 0);
};

// Formatea un número o string quitando caracteres no numéricos y agregando separadores de miles
// Ejemplo: "1000" -> "1.000"
export const formatInputNumber = (val) => {
  if (val === null || val === undefined || val === '') return '';
  // Eliminar todo lo que no sea número
  const stringValue = val.toString().replace(/\D/g, '');
  if (!stringValue) return '';
  // Agregar separadores de miles
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Convierte un string con separadores de miles de vuelta a un número limpio
// Ejemplo: "1.000" -> 1000
export const parseInputNumber = (val) => {
  if (!val) return 0;
  return Number(val.toString().replace(/\D/g, '')) || 0;
};