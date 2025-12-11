import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function Savings({ savingsList = [] }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS'); 
  const [concept, setConcept] = useState('');
  const [type, setType] = useState('deposit');
  
  // ESTADO PARA LA META (Se guarda en el celu por ahora)
  const [annualGoal, setAnnualGoal] = useState(() => {
      return localStorage.getItem('savings_annual_goal') || 0;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // 1. CÁLCULO DE TOTALES HISTÓRICOS
  const totals = savingsList.reduce((acc, item) => {
      const val = item.type === 'deposit' ? item.amount : -item.amount;
      if (item.currency === 'USD') acc.usd += val;
      else acc.ars += val;
      return acc;
  }, { ars: 0, usd: 0 });

  // 2. CÁLCULO DE PROGRESO MENSUAL (MOTIVACIÓN)
  const monthlyStats = useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filtramos solo depósitos en ARS de este mes
      const depositsThisMonth = savingsList
        .filter(item => {
            const d = new Date(item.date);
            return item.type === 'deposit' && item.currency === 'ARS' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, item) => acc + item.amount, 0);

      const targetMonthly = Number(annualGoal) > 0 ? Number(annualGoal) / 12 : 0;
      const progress = targetMonthly > 0 ? (depositsThisMonth / targetMonthly) * 100 : 0;

      return { depositsThisMonth, targetMonthly, progress };
  }, [savingsList, annualGoal]);


  const handleSave = async (e) => {
      e.preventDefault();
      if (!amount || !auth.currentUser) return;

      await addDoc(collection(db, 'savings_movements'), {
          amount: Number(amount), currency, concept: concept || (type === 'deposit' ? 'Ahorro' : 'Retiro'),
          type, date: new Date().toISOString(), userId: auth.currentUser.uid
      });
      setAmount(''); setConcept('');
  };

  const handleDelete = async (id) => { if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, 'savings_movements', id)); };

  const saveGoal = () => {
      localStorage.setItem('savings_annual_goal', annualGoal);
      setIsEditingGoal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* 1. CABECERA (Bóveda Total) */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h2 className="text-green-100 text-sm font-bold uppercase tracking-wider mb-4">Total Acumulado</h2>
          <div className="flex justify-between items-end">
              <div><p className="text-xs text-green-200 mb-1">Pesos</p><p className="text-3xl font-mono font-bold">{formatMoney(totals.ars)}</p></div>
              <div className="text-right"><p className="text-xs text-green-200 mb-1">Dólares</p><p className="text-2xl font-mono font-bold text-green-50">+ {totals.usd} USD</p></div>
          </div>
      </div>

      {/* 2. OBJETIVO MENSUAL (La Motivación) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Objetivo del Mes</h3>
              <button onClick={() => setIsEditingGoal(!isEditingGoal)} className="text-xs text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded">
                  {isEditingGoal ? 'Cancelar' : (annualGoal > 0 ? 'Editar Meta' : 'Definir Meta')}
              </button>
          </div>

          {isEditingGoal ? (
              <div className="flex gap-2 mb-2 animate-fade-in">
                  <div className="flex-1">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">Meta Anual Deseada</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border border-blue-200 rounded-lg outline-none font-bold text-gray-700" 
                        value={annualGoal} 
                        onChange={e => setAnnualGoal(e.target.value)} 
                        placeholder="$ 1.200.000"
                      />
                  </div>
                  <button onClick={saveGoal} className="bg-blue-600 text-white px-4 rounded-lg font-bold text-sm mt-5">Guardar</button>
              </div>
          ) : (
              <>
                {Number(annualGoal) > 0 ? (
                    <>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Has guardado <b>{formatMoney(monthlyStats.depositsThisMonth)}</b></span>
                            <span className="text-gray-500">Meta: <b>{formatMoney(monthlyStats.targetMonthly)}</b></span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${monthlyStats.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                style={{ width: `${Math.min(monthlyStats.progress, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-xs mt-2 font-medium text-gray-500">
                            {monthlyStats.progress >= 100 
                                ? "🎉 ¡Objetivo mensual cumplido! ¡Sos un crack!" 
                                : `Te faltan ${formatMoney(monthlyStats.targetMonthly - monthlyStats.depositsThisMonth)} para cumplir el mes.`}
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-2">Define una meta anual para ver tu progreso mensual.</p>
                )}
              </>
          )}
      </div>

      {/* 3. OPERAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setType('deposit')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === 'deposit' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>⬇ Ingresar</button>
              <button onClick={() => setType('withdraw')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === 'withdraw' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>⬆ Retirar</button>
          </div>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="flex gap-2">
                  <input type="number" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-gray-600 outline-none"><option value="ARS">ARS</option><option value="USD">USD</option></select>
              </div>
              <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder="Motivo (Opcional)" value={concept} onChange={e => setConcept(e.target.value)} />
              <button disabled={!amount} type="submit" className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${!amount ? 'bg-gray-300' : type === 'deposit' ? 'bg-green-600' : 'bg-red-500'}`}>{type === 'deposit' ? 'Guardar' : 'Retirar'}</button>
          </form>
      </div>

      {/* 4. HISTORIAL */}
      <div className="space-y-3">
          <h3 className="font-bold text-gray-800 px-2 text-sm">Movimientos</h3>
          {savingsList.slice().reverse().map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{item.type === 'deposit' ? '⬇' : '⬆'}</div>
                      <div><p className="text-sm font-bold text-gray-700">{item.concept}</p><p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p></div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                      <p className={`font-mono font-bold ${item.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>{item.type === 'deposit' ? '+' : '-'} {item.currency === 'USD' ? `${item.amount} USD` : formatMoney(item.amount)}</p>
                      <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-400">×</button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}