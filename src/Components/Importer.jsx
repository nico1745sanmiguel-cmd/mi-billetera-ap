import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export default function Importer({ cards }) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('Esperando...');

  const handleImport = async () => {
    try {
      setStatus('Procesando...');
      const data = JSON.parse(jsonInput);
      let count = 0;

      for (const item of data) {
        // MODO TARJETAS (Si el JSON dice type: "card")
        if (item.type === 'card') {
           // Usamos setDoc para forzar el ID (1, 2, 3) y no perder la relación con las compras
           await setDoc(doc(db, "cards", item.customId), {
              name: item.name,
              bank: item.bank,
              limit: Number(item.limit),
              closeDay: Number(item.closeDay),
              dueDay: Number(item.dueDay),
              color: item.color
           });
           count++;
        } 
        // MODO COMPRAS (El de siempre)
        else {
            const card = cards.find(c => 
                c.name.toLowerCase().includes(item.cardName.toLowerCase()) || 
                item.cardName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (card) {
                const monthlyInstallment = Number(item.amount) / Number(item.installments);
                await addDoc(collection(db, 'transactions'), {
                    description: item.description,
                    amount: Number(item.amount),
                    installments: Number(item.installments),
                    date: item.date,
                    cardId: card.id, // Esto ahora coincidirá con el ID que forzamos arriba
                    finalAmount: Number(item.amount),
                    monthlyInstallment: monthlyInstallment,
                    currency: 'ARS'
                });
                count++;
            }
        }
      }
      setStatus(`¡Éxito! Se procesaron ${count} elementos.`);
    } catch (error) {
      console.error(error);
      setStatus('Error: Revisa el formato del JSON');
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg mt-8 border-2 border-dashed border-gray-300">
      <h3 className="font-bold mb-2">📥 Importador Universal</h3>
      <textarea className="w-full h-32 p-2 text-xs font-mono border rounded" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder="Pega el JSON aquí..." />
      <button onClick={handleImport} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Procesar</button>
      <p className="mt-2 text-sm font-bold text-blue-600">{status}</p>
    </div>
  );
}