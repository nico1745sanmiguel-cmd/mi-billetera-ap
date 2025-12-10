import React from 'react';
import { formatMoney } from '../../utils';

export default function FinancialTarget({ totalNeed, totalPaid, privacyMode }) {
  
  // Cálculos
  const remaining = totalNeed - totalPaid;
  const percentage = totalNeed > 0 ? (totalPaid / totalNeed) * 100 : 0;
  
  // Configuración del Círculo SVG
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Helper privacidad
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden">
      
      <div className="flex justify-between items-center relative z-10">
        
        {/* IZQUIERDA: DATOS DUROS */}
        <div className="flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Meta Mensual
            </p>
            
            {/* EL NÚMERO MÁS IMPORTANTE: LO QUE FALTA */}
            <div className="mb-4">
                <span className="text-3xl font-bold text-gray-800 tracking-tighter">
                    {showMoney(remaining)}
                </span>
                <p className="text-[10px] font-bold text-red-500 bg-red-50 inline-block px-2 py-0.5 rounded-full ml-2">
                    Falta Cubrir
                </p>
            </div>

            {/* DETALLE CHIQUITO */}
            <div className="flex gap-4 text-xs">
                <div>
                    <span className="block text-gray-400 text-[9px] uppercase">Total a Pagar</span>
                    <span className="font-bold text-gray-600">{showMoney(totalNeed)}</span>
                </div>
                <div className="w-px h-6 bg-gray-100"></div>
                <div>
                    <span className="block text-gray-400 text-[9px] uppercase">Ya Pagado</span>
                    <span className="font-bold text-green-600">{showMoney(totalPaid)}</span>
                </div>
            </div>
        </div>

        {/* DERECHA: GRÁFICO CIRCULAR (SVG) */}
        <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Círculo de Fondo (Gris) */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="#f3f4f6"
                    strokeWidth="8"
                    fill="transparent"
                />
                {/* Círculo de Progreso (Color) */}
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="url(#gradientInfo)" // Usamos un gradiente bonito
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
                {/* Definición del Gradiente */}
                <defs>
                    <linearGradient id="gradientInfo" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" /> {/* Verde Esmeralda */}
                        <stop offset="100%" stopColor="#3b82f6" /> {/* Azul */}
                    </linearGradient>
                </defs>
            </svg>
            
            {/* Porcentaje al medio */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-gray-800">{percentage.toFixed(0)}%</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase">Pago</span>
            </div>
        </div>

      </div>
    </div>
  );
}