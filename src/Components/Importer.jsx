import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

export default function Importer({ cards }) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('Esperando datos...');

  const handleReset = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm("⚠️ ¿Estás seguro de borrar TODO? (Tarjetas, Compras y Super)")) return;

    const userId = auth.currentUser.uid;
    setStatus('Borrando datos...');
    
    try {
        // Borrar Compras
        const qTrans = query(collection(db, 'transactions'), where("userId", "==", userId));
        const transSnap = await getDocs(qTrans);
        await Promise.all(transSnap.docs.map(d => deleteDoc(doc(db, 'transactions', d.id))));

        // Borrar Tarjetas
        const qCards = query(collection(db, 'cards'), where("userId", "==", userId));
        const cardsSnap = await getDocs(qCards);
        await Promise.all(cardsSnap.docs.map(d => deleteDoc(doc(db, 'cards', d.id))));

        // Borrar Supermercado (NUEVO)
        const qSuper = query(collection(db, 'supermarket_items'), where("userId", "==", userId));
        const superSnap = await getDocs(qSuper);
        await Promise.all(superSnap.docs.map(d => deleteDoc(doc(db, 'supermarket_items', d.id))));

        setStatus('✨ Todo limpio.');
    } catch (error) { console.error(error); setStatus('Error al borrar.'); }
  };

  const handleImport = async () => {
    if (!auth.currentUser) { setStatus("Error: Debes estar logueado."); return; }
    const userId = auth.currentUser.uid;

    try {
      setStatus('Procesando...');
      let data;
      try { data = JSON.parse(jsonInput); } catch (e) { setStatus("Error: JSON inválido."); return; }

      let count = 0;

      for (const item of data) {
        // 1. TARJETAS
        if (item.type === 'card') {
           await setDoc(doc(db, "cards", item.customId), {
              name: item.name, bank: item.bank, 
              limit: Number(item.limit), limitOneShot: Number(item.limitOneShot), 
              closeDay: Number(item.closeDay), dueDay: Number(item.dueDay), 
              color: item.color, userId: userId 
           });
           count++;
        } 
        // 2. SUPERMERCADO (NUEVO)
        else if (item.type === 'super') {
            await addDoc(collection(db, 'supermarket_items'), {
                name: item.name,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                checked: false,
                userId: userId
            });
            count++;
        }
        // 3. COMPRAS (TRANSACTIONS)
        else {
            if (!cards || cards.length === 0) { setStatus("Error: Carga primero las Tarjetas."); return; }
            const card = cards.find(c => c.name.toLowerCase().includes((item.cardName || '').toLowerCase())) || cards[0];
            if (card) {
                const amount = Number(item.amount || item.finalAmount);
                const installments = Number(item.installments || 1);
                await addDoc(collection(db, 'transactions'), {
                    description: item.description, amount: amount, finalAmount: amount,
                    installments: installments, monthlyInstallment: amount / installments,
                    date: item.date, cardId: card.id, userId: userId, currency: 'ARS'
                });
                count++;
            }
        }
      }
      setStatus(`¡Listo! ${count} elementos importados.`);
      setJsonInput(''); 
    } catch (error) { console.error(error); setStatus('Error desconocido.'); }
  };

  return (
    <div className="p-6 bg-gray-800 text-white rounded-xl mt-8 border-2 border-dashed border-gray-600 mb-24">
      <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">📥 Importador Universal</h3>
          <button onClick={handleReset} className="text-xs bg-red-900/50 text-red-300 px-3 py-1 rounded hover:bg-red-800 border border-red-800">🗑️ Reset Total</button>
      </div>
      <textarea className="w-full h-32 p-3 text-xs font-mono bg-gray-900 border border-gray-700 rounded text-green-400 focus:outline-none" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder='Pega el JSON aquí...' />
      <div className="flex justify-between items-center mt-3">
          <span className="text-sm font-bold text-yellow-400">{status}</span>
          <button onClick={handleImport} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg">Procesar</button>
      </div>
    </div>
  );
}