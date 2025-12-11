import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { formatMoney } from '../../utils';
import useDolar from '../../Hooks/useDolar';

export default function Savings({ savingsList = [] }) {
  const { blue, loading: loadingDolar } = useDolar();
  
  // --- ESTADOS ---
  const [localAmount, setLocalAmount] = useState(''); // Estado visual con puntos
  const [currency, setCurrency] = useState('ARS'); 
  const [instrument, setInstrument] = useState('');
  const [tna, setTna] = useState(''); 
  const [type, setType] = useState('deposit');
  
  // Meta Anual (Ahora en USD)
  const [annualGoalUSD, setAnnualGoalUSD] = useState(() => localStorage.getItem('savings_annual_goal_usd') || '');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  
  // Sugerencias animadas
  const [placeholderInstrument, setPlaceholderInstrument] = useState('Mercado Pago');

  // --- 1. SUGERENCIAS ANIMADAS (Carrusel) ---
  useEffect(() => {
    const options = ["Mercado Pago", "Naranja X", "Plazo Fijo", "USD Billete", "FCI", "CEDEARs", "Ladrillo", "Personal Pay"];
    let i = 0;
    const interval = setInterval(() => {
        i = (i + 1) % options.length;
        setPlaceholderInstrument(options[i]);
    }, 2000); // Cambia cada 2 segundos
    return () => clearInterval(interval);
  }, []);

  // --- 2. FORMATO DE MILES AUTOMÁTICO ---
  const formatNumberInput = (val) => {
    const raw = val.replace(/\D/g, ''); // Solo números
    if (!raw) return '';
    return new Intl.NumberFormat('es-AR').format(parseInt(raw));
  };

  const handleAmountChange = (e) => {
      setLocalAmount(formatNumberInput(e.target.value));
  };

  const handleGoalChange = (e) => {
      setAnnualGoalUSD(formatNumberInput(e.target.value));
  };

  // --- 3. CÁLCULOS DE PATRIMONIO ---
  const totals = useMemo(() => {
      return savingsList.reduce((acc, item) => {
          const val = item.type === 'deposit' ? item.amount : -item.amount;
          if (item.currency === 'USD') acc.usd += val;
          else acc.ars += val;
          
          if(item.type === 'deposit' && item.currency === 'ARS' && item.tna > 0) {
              acc.weightedTna += (item.tna * item.amount);
              acc.tnaCapital += item.amount;
          }
          return acc;
      }, { ars: 0, usd: 0, weightedTna: 0, tnaCapital: 0 });
  }, [savingsList]);

  const avgTna = totals.tnaCapital > 0 ? (totals.weightedTna / totals.tnaCapital) : 0;
  const totalInUsd = totals.usd + (blue > 0 ? totals.ars / blue : 0);

  // --- 4. PROYECCIONES ---
  const projections = useMemo(() => {
      // Convertimos la meta input (string con puntos) a numero
      const goalNum = parseInt(annualGoalUSD.replace(/\./g, '')) || 0;
      
      // Ritmo Mensual en USD
      const monthlyContributionUSD = goalNum > 0 ? goalNum / 12 : 0;
      
      // Proyección Simplificada (Asumiendo que ahorras en USD o Equiv)
      const oneYearUsd = totalInUsd + (monthlyContributionUSD * 12);
      const fiveYearsUsd = totalInUsd + (monthlyContributionUSD * 60);

      // Conversión a Pesos para referencia (Ritmo)
      const monthlyContributionARS = monthlyContributionUSD * blue;

      return {
          monthlyContributionUSD,
          monthlyContributionARS,
          oneYearUsd,
          fiveYearsUsd
      };
  }, [totals, annualGoalUSD, blue, totalInUsd]);


  const handleSave = async (e) => {
      e.preventDefault();
      // Limpiamos los puntos para guardar el número puro
      const rawAmount = parseInt(localAmount.replace(/\./g, ''));
      if (!rawAmount || !auth.currentUser) return;

      await addDoc(collection(db, 'savings_movements'), {
          amount: rawAmount, currency, 
          concept: instrument || placeholderInstrument, // Si no escribió nada, usa la sugerencia actual? No, mejor no.
          tna: Number(tna) || 0,
          type, date: new Date().toISOString(), userId: auth.currentUser.uid
      });
      setLocalAmount(''); setTna(''); setInstrument('');
  };

  const handleDelete = async (id) => { if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, 'savings_movements', id)); };
  
  const saveGoal = () => { 
      localStorage.setItem('savings_annual_goal_usd', annualGoalUSD); 
      setIsEditingGoal(false); 
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* 1. CABECERA: PATRIMONIO */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-xl relative overflow-hidden border border-gray-800">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
          
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Tu Bóveda Total</h2>
          
          <div className="flex items-end gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  US$ {loadingDolar ? '...' : Math.floor(totalInUsd).toLocaleString('de-DE')}
              </h1>
              {avgTna > 0 && (
                <span className="text-xs text-green-400 font-bold mb-2 bg-green-900/30 px-2 py-0.5 rounded border border-green-800">
                    Rendimiento ARS: {avgTna.toFixed(1)}%
                </span>
              )}
          </div>
          
          <div className="flex gap-4 text-xs text-gray-400 font-mono border-t border-gray-700 pt-3 mt-2">
              <p>ARS: {formatMoney(totals.ars)}</p>
              <p>USD: {totals.usd}</p>
              <p className="text-blue-400">Blue: ${Math.floor(blue)}</p>
          </div>
      </div>

      {/* 2. META ANUAL (USD) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 font-bold uppercase">Meta de Ahorro Anual (USD)</p>
                <button onClick={isEditingGoal ? saveGoal : () => setIsEditingGoal(true)} className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200">
                    {isEditingGoal ? '💾 Guardar Meta' : '✏️ Editar'}
                </button>
            </div>
            
            {isEditingGoal ? (
                <div className="animate-fade-in">
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400 font-bold">US$</span>
                        <input 
                            autoFocus 
                            type="tel" // Numérico
                            className="w-full p-3 pl-12 bg-gray-50 border border-blue-200 rounded-xl outline-none font-bold text-xl text-gray-800" 
                            value={annualGoalUSD} 
                            onChange={handleGoalChange} 
                            placeholder="Ej: 10.000"
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Ingresa cuánto quieres acumular en un año.</p>
                </div>
            ) : (
                <div>
                    {annualGoalUSD ? (
                        <div className="flex justify-between items-end">
                             <div>
                                <p className="text-2xl font-bold text-gray-800">US$ {annualGoalUSD}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Ritmo necesario: <span className="text-blue-600 font-bold">US$ {Math.floor(projections.monthlyContributionUSD).toLocaleString('de-DE')}/mes</span>
                                </p>
                             </div>
                             <div className="text-right">
                                 <p className="text-[10px] uppercase font-bold text-gray-400">Equivalente Pesos</p>
                                 <p className="font-mono text-gray-600 font-medium">{formatMoney(projections.monthlyContributionARS)} / mes</p>
                             </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Define una meta en dólares para ver tu proyección.</p>
                    )}
                </div>
            )}
      </div>

      {/* 3. PROYECCIÓN FUTURA */}
      {annualGoalUSD && (
         <div className="grid grid-cols-2 gap-4">
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                 <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">En 1 Año tendrías</p>
                 <p className="text-xl font-bold text-blue-800">US$ {Math.floor(projections.oneYearUsd).toLocaleString('de-DE')}</p>
             </div>
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                 <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">En 5 Años tendrías</p>
                 <p className="text-xl font-bold text-indigo-800">US$ {Math.floor(projections.fiveYearsUsd).toLocaleString('de-DE')}</p>
             </div>
         </div>
      )}

      {/* 4. AGREGAR MOVIMIENTO */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-3">
              {type === 'deposit' ? '⬇ Ingresar Dinero' : '⬆ Retirar Dinero'}
          </h3>
          
          <form onSubmit={handleSave} className="space-y-4">
              {/* Monto y Moneda */}
              <div className="flex gap-2">
                  <div className="flex-1 relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                      <input 
                        type="tel"
                        className="w-full p-2.5 pl-8 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold text-lg text-gray-800 focus:bg-white focus:border-green-500 transition-colors"
                        placeholder="0"
                        value={localAmount}
                        onChange={handleAmountChange}
                      />
                  </div>
                  <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 font-bold text-sm text-gray-600 outline-none"
                  >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                  </select>
              </div>

              {/* Instrumento y Tasa */}
              <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                      <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Instrumento</label>
                      <input 
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-medium focus:bg-white focus:border-blue-500 transition-all"
                        placeholder={placeholderInstrument} // <--- SUGERENCIA ANIMADA
                        value={instrument}
                        onChange={e => setInstrument(e.target.value)}
                      />
                  </div>
                  <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">TNA %</label>
                      <input 
                        type="number" 
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold text-green-600 text-center"
                        placeholder="0%" 
                        value={tna} 
                        onChange={e => setTna(e.target.value)} 
                      />
                  </div>
              </div>

              {/* Botones Acción */}
              <div className="flex gap-3 pt-2">
                 <button 
                    type="button" 
                    onClick={() => setType(type === 'deposit' ? 'withdraw' : 'deposit')} 
                    className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-bold text-xs hover:bg-gray-200"
                 >
                    Cambiar a {type === 'deposit' ? 'Retirar' : 'Ingresar'}
                 </button>
                 <button 
                    type="submit" 
                    disabled={!localAmount} 
                    className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 ${!localAmount ? 'bg-gray-300' : type === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                 >
                    {type === 'deposit' ? 'Guardar Ahorro' : 'Confirmar Retiro'}
                 </button>
              </div>
          </form>
      </div>

      {/* 5. PORTAFOLIO */}
      <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase px-2">Tu Portafolio</p>
          {savingsList.slice().reverse().map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center hover:shadow-sm transition-shadow">
                  <div>
                      <p className="text-sm font-bold text-gray-800">{item.concept || 'Ahorro General'}</p>
                      <div className="flex gap-2 text-[10px] items-center mt-0.5">
                          <span className="text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
                          {item.tna > 0 && <span className="text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded-md border border-green-200">{item.tna}% TNA</span>}
                      </div>
                  </div>
                  <div className="text-right">
                      <p className={`font-mono font-bold ${item.type === 'deposit' ? 'text-gray-800' : 'text-red-500'}`}>
                          {item.type === 'withdraw' && '-'} {item.currency === 'USD' ? `${formatNumberInput(item.amount.toString())} USD` : formatMoney(item.amount)}
                      </p>
                      <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 mt-1">Eliminar</button>
                  </div>
              </div>
          ))}
          {savingsList.length === 0 && <p className="text-center text-gray-400 text-xs py-4">Empieza hoy. Tu yo del futuro te lo agradecerá.</p>}
      </div>

    </div>
  );
}