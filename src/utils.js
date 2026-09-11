// src/utils.js

const arsFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

// Esta función convierte cualquier número en formato plata argentina para visualización
// Ejemplo: 12000 -> $ 12.000
export const formatMoney = (amount) => {
  return arsFormatter.format(Number(amount) || 0);
};

// Formatea un número o string quitando caracteres no numéricos y agregando separadores de miles
// Ejemplo: "1000" -> "1.000", "150,50" -> "150"
export const formatInputNumber = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let str = val.toString().trim();
  if (!str) return '';

  // Si tiene coma (ej: "150,50" o "1.250,50"), descartamos centavos para evitar multiplicar x100
  if (str.includes(',')) {
    str = str.split(',')[0];
  } else if (/\.\d{1,2}$/.test(str)) {
    // Si tiene punto decimal con 1 o 2 dígitos al final (ej: "150.50"), descartamos decimales
    str = str.replace(/\.\d{1,2}$/, '');
  }

  // Eliminar todo lo que no sea número
  const stringValue = str.replace(/\D/g, '');
  if (!stringValue) return '';
  // Agregar separadores de miles
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Convierte un string con separadores de miles de vuelta a un número limpio
// Ejemplo: "1.000" -> 1000, "150,50" -> 150
export const parseInputNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  let str = val.toString().trim();
  if (!str) return 0;

  // Si tiene coma (ej: "150,50" o "1.250,50"), descartamos centavos
  if (str.includes(',')) {
    str = str.split(',')[0];
  } else if (/\.\d{1,2}$/.test(str)) {
    str = str.replace(/\.\d{1,2}$/, '');
  }

  const digits = str.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) || 0;
};