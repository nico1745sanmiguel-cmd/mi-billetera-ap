import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Importer({ cards }) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('Esperando...');

  const handleImport = async () => {
    try {
      setStatus('Procesando...');
      const data = JSON.parse(jsonInput);
      
      let count = 0;
      for (const item of data) {
        // Buscamos el ID de la tarjeta por el nombre
        // IMPORTANTE: Busca coincidencias parciales (ej: "Nacion" encuentra "Visa Banco Nacion")
        const card = cards.find(c => 
            c.name.toLowerCase().includes(item.cardName.toLowerCase()) || 
            item.cardName.toLowerCase().includes(c.name.toLowerCase())
        );

        if (card) {
            // Calculamos monto de cuota
            const monthlyInstallment = Number(item.amount) / Number(item.installments);
            
            await addDoc(collection(db, 'transactions'), {
                description: item.description,
                amount: Number(item.amount),
                installments: Number(item.installments),
                date: item.date,
                cardId: card.id,
                finalAmount: Number(item.amount),
                monthlyInstallment: monthlyInstallment,
                currency: 'ARS' // Asumimos pesos por ahora
            });
            count++;
        } else {
            console.warn(`Tarjeta no encontrada para: ${item.description} (${item.cardName})`);
        }
      }
      setStatus(`¡Éxito! Se importaron ${count} compras.`);
    } catch (error) {
      console.error(error);
      setStatus('Error: Revisa el formato del JSON');
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg mt-8 border-2 border-dashed border-gray-300">
      <h3 className="font-bold mb-2">📥 Importador Masivo (Temporal)</h3>
      <textarea 
        className="w-full h-32 p-2 text-xs font-mono border rounded"
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder="Pega el JSON aquí..."
      />
      <button 
        onClick={handleImport}
        className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
      >
        Procesar Importación
      </button>
      <p className="mt-2 text-sm font-bold text-blue-600">{status}</p>
    </div>
  );
}