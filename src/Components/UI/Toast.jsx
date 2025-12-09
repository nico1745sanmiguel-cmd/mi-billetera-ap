import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    // El toast se suicida a los 3 segundos
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Colores según el tipo
  const bgColors = {
    success: 'bg-gray-900 border-l-4 border-green-500', // Negro con borde verde
    error: 'bg-gray-900 border-l-4 border-red-500',     // Negro con borde rojo
  };

  return (
    <div className={`fixed bottom-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow-2xl z-50 flex items-center gap-3 animate-fade-in-up ${bgColors[type] || bgColors.success}`}>
      <span className="text-white text-sm font-medium">{message}</span>
    </div>
  );
}