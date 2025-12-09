import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoney } from '../../utils';

export default function Dashboard({ transactions, cards }) {
  const projectedData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const result = [];

    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`;
        let monthData = { name: monthKey, total: 0 };
        cards.forEach(c => monthData[c.name] = 0);

        transactions.forEach(t => {
            const tAmount = Number(t.amount || t.finalAmount || 0);
            const tInstallments = Number(t.installments || 1);
            const tDate = new Date(t.date);
            const localDate = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            const tEnd = new Date(localDate.getFullYear(), localDate.getMonth() + tInstallments, 1);
            const currentLoopMonth = new Date(d.getFullYear(), d.getMonth(), 1);

            if (currentLoopMonth >= new Date(localDate.getFullYear(), localDate.getMonth(), 1) && currentLoopMonth < tEnd) {
                // CORRECCIÓN AQUÍ: Usamos '==' en lugar de '===' para que coincidan texto y número
                const cardObj = cards.find(c => c.id == t.cardId);
                const cardName = cardObj ? cardObj.name : 'Otras';
                const quotaValue = tAmount / tInstallments;

                if (monthData[cardName] !== undefined) {
                    monthData[cardName] += quotaValue;
                } else {
                    // Si cae en "Otras", lo sumamos igual pero deberíamos revisar por qué
                    monthData['Otras'] = (monthData['Otras'] || 0) + quotaValue;
                }
                monthData.total += quotaValue;
            }
        });
        result.push(monthData);
    }
    return result;
  }, [transactions, cards]);

  const totalDebt = transactions.reduce((acc, t) => acc + Number(t.finalAmount || t.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Deuda Total Procesada</p>
             <h2 className="text-3xl font-light text-gray-900 mt-2">{formatMoney(totalDebt)}</h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">A Pagar este Mes</p>
             <h2 className="text-3xl font-light text-gray-900 mt-2">
                 {formatMoney(projectedData[0]?.total || 0)}
             </h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Compras Activas</p>
             <h2 className="text-3xl font-light text-gray-900 mt-2">{transactions.length}</h2>
          </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
         <h3 className="text-lg font-medium text-gray-900 mb-6">Proyección Mensual</h3>
         <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectedData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <Tooltip 
                        cursor={{fill: '#f9fafb'}} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value) => [formatMoney(value), 'Cuota']}
                    />
                    <Legend />
                    {cards.map((card, index) => (
                        <Bar 
                            key={card.id} 
                            dataKey={card.name} 
                            stackId="a" 
                            fill={card.color || '#3483fa'} 
                            radius={index === cards.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} 
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
         </div>
      </section>
    </div>
  );
}