import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export default function Importer({ cards }) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('Esperando datos...');

  const handleImport = async () => {
    if (!auth.currentUser) {
        setStatus("Error: Debes estar logueado.");
        return;
    }

    const userId = auth.currentUser.uid; // TU FIRMA DIGITAL

    try {
      setStatus('Procesando...');
      const data = JSON.parse(jsonInput);
      let count = 0;

      for (const item of data) {
        
        // --- MODO 1: IMPORTAR TARJETAS ---
        if (item.type === 'card') {
           // Usamos setDoc para mantener los IDs fijos (1, 2, 3) si vienen en el JSON
           // Ojo: Si el ID ya existe, lo sobrescribe con tus datos nuevos
           await setDoc(doc(db, "cards", item.customId), {
              name: item.name,
              bank: item.bank,
              limit: Number(item.limit),
              closeDay: Number(item.closeDay),
              dueDay: Number(item.dueDay),
              color: item.color,
              userId: userId // <--- IMPORTANTE
           });
           count++;
        } 
        
        // --- MODO 2: IMPORTAR COMPRAS ---
        else {
            // Buscamos si la tarjeta existe en TUS tarjetas cargadas
            // Intenta coincidir por nombre o usa la primera que encuentre como fallback
            const card = cards.find(c => 
                c.name.toLowerCase().includes((item.cardName || '').toLowerCase())
            ) || cards[0];

            if (card) {
                const amount = Number(item.amount || item.finalAmount);
                const installments = Number(item.installments || 1);
                
                await addDoc(collection(db, 'transactions'), {
                    description: item.description,
                    amount: amount,
                    finalAmount: amount,
                    installments: installments,
                    monthlyInstallment: amount / installments,
                    date: item.date,
                    cardId: card.id, 
                    userId: userId, // <--- IMPORTANTE
                    currency: 'ARS'
                });
                count++;
            }
        }
      }
      setStatus(`¡Éxito! Se importaron ${count} elementos a tu cuenta.`);
      setJsonInput(''); // Limpiar caja
    } catch (error) {
      console.error(error);
      setStatus('Error: Revisa el formato del JSON');
    }
  };

  return (
    <div className="p-6 bg-gray-800 text-white rounded-xl mt-8 border-2 border-dashed border-gray-600">
      <h3 className="font-bold mb-2 text-lg">📥 Importador Masivo (Seguro)</h3>
      <p className="text-xs text-gray-400 mb-2">Pega tu JSON de tarjetas o compras aquí.</p>
      <textarea 
        className="w-full h-32 p-3 text-xs font-mono bg-gray-900 border border-gray-700 rounded text-green-400 focus:outline-none" 
        value={jsonInput} 
        onChange={(e) => setJsonInput(e.target.value)} 
        placeholder='[ { "type": "card", ... } ]' 
      />
      <div className="flex justify-between items-center mt-3">
          <span className="text-sm font-bold text-yellow-400">{status}</span>
          <button onClick={handleImport} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95">
            Procesar Importación
          </button>
      </div>
    </div>
  );
}