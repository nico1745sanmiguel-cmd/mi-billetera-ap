import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard({ transactions, cards }) {
  
  // --- Lógica de Proyección ---
  // Generamos una proyección para los próximos 6 meses
  const projectedData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const result = [];

    // Crear base para próximos 6 meses
    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`;
        
        // Estructura del objeto de datos: { name: 'Ene 24', total: 0, [cardId]: amount... }
        let monthData = { name: monthKey, total: 0 };
        
        // Inicializar cada tarjeta en 0
        cards.forEach(c => monthData[c.name] = 0);

        // Sumar transacciones que caen en este mes
        transactions.forEach(t => {
            const tDate = new Date(t.date);
            // Calcular fecha de finalización de cuotas
            const tEnd = new Date(tDate.getFullYear(), tDate.getMonth() + Number(t.installments), 1);
            
            // Si el mes actual del bucle (d) está entre la compra y el fin de cuotas
            if (d >= new Date(tDate.getFullYear(), tDate.getMonth(), 1) && d < tEnd) {
                const cardName = cards.find(c => c.id == t.cardId)?.name || 'Desconocida';
                const cuota = t.monthlyInstallment;
                
                monthData[cardName] += cuota;
                monthData.total += cuota;
            }
        });

        result.push(monthData);
    }
    return result;
  }, [transactions, cards]);

  const totalDebt = transactions.reduce((acc, t) => acc + t.finalAmount, 0);

  return (
    <div className="space-y-6">
      {/* KPIs Superiores */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
             <p className="text-sm text-gray-500">Deuda Total Procesada</p>
             <h2 className="text-3xl font-light text-gray-900">${totalDebt.toLocaleString('es-AR')}</h2>
          </div>
          <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
             <p className="text-sm text-gray-500">Compromiso Mes Actual</p>
             <h2 className="text-3xl font-light text-gray-900">
                 ${(projectedData[0]?.total || 0).toLocaleString('es-AR')}
             </h2>
          </div>
          <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
             <p className="text-sm text-gray-500">Compras Activas</p>
             <h2 className="text-3xl font-light text-gray-900">{transactions.length}</h2>
          </div>
      </section>

      {/* Gráfico de Barras Apiladas */}
      <section className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
         <h3 className="text-lg font-medium text-gray-900 mb-6">Compromiso Mensual por Tarjeta</h3>
         <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectedData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}/>
                    <Legend />
                    {/* Generar una barra por cada tarjeta dinámicamente */}
                    {cards.map((card, index) => (
                        <Bar 
                            key={card.id} 
                            dataKey={card.name} 
                            stackId="a" 
                            fill={card.color || '#3483fa'} 
                            radius={index === cards.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} // Solo redondear la de arriba
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
         </div>
         <p className="text-xs text-gray-400 mt-4 text-center">Proyección automática basada en cuotas restantes.</p>
      </section>
    </div>
  );
}