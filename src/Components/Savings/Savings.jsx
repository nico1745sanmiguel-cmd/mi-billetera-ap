import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function Savings({ savingsList = [] }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS'); // 'ARS' o 'USD'
  const [concept, setConcept] = useState('');
  const [type, setType] = useState('deposit'); // 'deposit' o 'withdraw'

  // 1. CÁLCULO DE TOTALES
  const totals = savingsList.reduce((acc, item) => {
      const val = item.type === 'deposit' ? item.amount : -item.amount;
      if (item.currency === 'USD') acc.usd += val;
      else acc.ars += val;
      return acc;
  }, { ars: 0, usd: 0 });

  // 2. GUARDAR MOVIMIENTO
  const handleSave = async (e) => {
      e.preventDefault();
      if (!amount || !auth.currentUser) return;

      await addDoc(collection(db, 'savings_movements'), {
          amount: Number(amount),
          currency,
          concept: concept || (type === 'deposit' ? 'Ahorro' : 'Retiro'),
          type, // deposit / withdraw
          date: new Date().toISOString(),
          userId: auth.currentUser.uid
      });
      setAmount('');
      setConcept('');
  };

  const handleDelete = async (id) => {
      if(window.confirm("¿Borrar movimiento?")) await deleteDoc(doc(db, 'savings_movements', id));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* CABECERA (Bóveda) */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          
          <h2 className="text-green-100 text-sm font-bold uppercase tracking-wider mb-4">Fondo de Seguridad</h2>
          
          <div className="flex justify-between items-end">
              <div>
                  <p className="text-xs text-green-200 mb-1">Pesos Argentinos</p>
                  <p className="text-3xl font-mono font-bold">{formatMoney(totals.ars)}</p>
              </div>
              <div className="text-right">
                  <p className="text-xs text-green-200 mb-1">Dólares</p>
                  <p className="text-2xl font-mono font-bold text-green-50">+ {totals.usd} USD</p>
              </div>
          </div>
      </div>

      {/* FORMULARIO DE INGRESO/RETIRO */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setType('deposit')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === 'deposit' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>
                  ⬇ Ingresar
              </button>
              <button onClick={() => setType('withdraw')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === 'withdraw' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>
                  ⬆ Retirar
              </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                  <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-gray-600 outline-none"
                  >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                  </select>
              </div>
              <input 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                placeholder={type === 'deposit' ? "Motivo (Ej: Aguinaldo)" : "Motivo (Ej: Mecánico)"}
                value={concept}
                onChange={e => setConcept(e.target.value)}
              />
              <button disabled={!amount} type="submit" className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${!amount ? 'bg-gray-300' : type === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                  {type === 'deposit' ? 'Guardar en el Chanchito 🐷' : 'Retirar Fondos 💸'}
              </button>
          </form>
      </div>

      {/* HISTORIAL */}
      <div className="space-y-3">
          <h3 className="font-bold text-gray-800 px-2 text-sm">Últimos Movimientos</h3>
          {savingsList.slice().reverse().map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {item.type === 'deposit' ? '⬇' : '⬆'}
                      </div>
                      <div>
                          <p className="text-sm font-bold text-gray-700">{item.concept}</p>
                          <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                      <p className={`font-mono font-bold ${item.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                          {item.type === 'deposit' ? '+' : '-'} {item.currency === 'USD' ? `${item.amount} USD` : formatMoney(item.amount)}
                      </p>
                      <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-400">×</button>
                  </div>
              </div>
          ))}
          {savingsList.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Aún no tienes ahorros.</p>}
      </div>

    </div>
  );
}