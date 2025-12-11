import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { formatMoney } from '../../utils';
import useDolar from '../../Hooks/useDolar'; // <--- Importamos el Hook

export default function Savings({ savingsList = [] }) {
  const { blue, loading: loadingDolar } = useDolar(); // Precio del Dólar en vivo
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS'); 
  const [instrument, setInstrument] = useState('Billetera Virtual'); // Tipo de instrumento
  const [tna, setTna] = useState(''); // Tasa Nominal Anual
  const [type, setType] = useState('deposit');
  
  // META ANUAL (Para calcular el "Ritmo" de ahorro)
  const [annualGoal, setAnnualGoal] = useState(() => localStorage.getItem('savings_annual_goal') || 0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // --- 1. CÁLCULO DE PATRIMONIO ACTUAL ---
  const totals = useMemo(() => {
      return savingsList.reduce((acc, item) => {
          const val = item.type === 'deposit' ? item.amount : -item.amount;
          if (item.currency === 'USD') acc.usd += val;
          else acc.ars += val;
          
          // Calculamos TNA Promedio Ponderada (simplificada)
          if(item.type === 'deposit' && item.currency === 'ARS' && item.tna > 0) {
              acc.weightedTna += (item.tna * item.amount);
              acc.tnaCapital += item.amount;
          }
          return acc;
      }, { ars: 0, usd: 0, weightedTna: 0, tnaCapital: 0 });
  }, [savingsList]);

  // TNA Promedio de tu cartera (ej: si tenes mucho en MP al 35% y poco en Banco al 0%)
  const avgTna = totals.tnaCapital > 0 ? (totals.weightedTna / totals.tnaCapital) : 0;

  // PATRIMONIO TOTAL EN USD (Blue)
  const totalInUsd = totals.usd + (blue > 0 ? totals.ars / blue : 0);

  // --- 2. EL MOTOR DE PROYECCIÓN (MOTIVACIÓN) ---
  const projections = useMemo(() => {
      const monthlyContribution = Number(annualGoal) > 0 ? Number(annualGoal) / 12 : 0;
      const monthlyRate = (avgTna / 100) / 12; // Tasa mensual
      
      // Fórmula Interés Compuesto con Aportes Mensuales:
      // FV = P * (1+r)^n + PMT * [((1+r)^n - 1) / r]
      
      const calculateFuture = (months) => {
          if (monthlyContribution === 0 && totals.ars === 0) return 0;
          
          // Parte 1: Lo que ya tenés (Capital inicial creciendo)
          const futureCapital = totals.ars * Math.pow(1 + monthlyRate, months);
          
          // Parte 2: Lo que vas a agregar (Aportes mensuales creciendo)
          let futureContributions = 0;
          if (monthlyRate > 0) {
              futureContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
          } else {
              futureContributions = monthlyContribution * months;
          }

          return futureCapital + futureContributions;
      };

      const oneYearArs = calculateFuture(12);
      const fiveYearsArs = calculateFuture(60);

      // Convertimos a USD para que el número sea "real" (quitando inflación mentalmente)
      // Asumimos que el dólar acompaña la inflación/tasa a largo plazo para simplificar la vista
      // (Es una proyección optimista en "Moneda Dura")
      return {
          oneYearUsd: blue > 0 ? oneYearArs / blue : 0,
          fiveYearsUsd: blue > 0 ? fiveYearsArs / blue : 0,
          interestGainedYear: oneYearArs - (totals.ars + (monthlyContribution * 12)) // Cuanta plata es "gratis"
      };
  }, [totals, annualGoal, avgTna, blue]);


  const handleSave = async (e) => {
      e.preventDefault();
      if (!amount || !auth.currentUser) return;

      await addDoc(collection(db, 'savings_movements'), {
          amount: Number(amount), currency, 
          concept: instrument, // Guardamos el instrumento como concepto
          tna: Number(tna) || 0, // Guardamos la tasa
          type, date: new Date().toISOString(), userId: auth.currentUser.uid
      });
      setAmount(''); setTna('');
  };

  const handleDelete = async (id) => { if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, 'savings_movements', id)); };
  const saveGoal = () => { localStorage.setItem('savings_annual_goal', annualGoal); setIsEditingGoal(false); };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* 1. CABECERA: PATRIMONIO EN USD */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-xl relative overflow-hidden border border-gray-800">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
          
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Patrimonio Total Estimado</h2>
          
          <div className="flex items-end gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  US$ {loadingDolar ? '...' : Math.floor(totalInUsd).toLocaleString('de-DE')}
              </h1>
              <span className="text-sm text-green-400 font-bold mb-1 bg-green-900/30 px-2 py-0.5 rounded">
                  {avgTna > 0 ? `+${avgTna.toFixed(1)}% TNA` : '0% Rend.'}
              </span>
          </div>
          
          <div className="flex gap-4 text-xs text-gray-400 font-mono border-t border-gray-700 pt-3 mt-2">
              <p>En Pesos: {formatMoney(totals.ars)}</p>
              <p>En Dólares: {totals.usd} USD</p>
              <p>Blue: ${blue}</p>
          </div>
      </div>

      {/* 2. LA ZANAHORIA 🥕 (PROYECCIONES) */}
      {Number(annualGoal) > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      🚀 Proyección de Riqueza
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-normal">Si sigues así</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-8">
                      <div>
                          <p className="text-blue-200 text-xs uppercase font-bold mb-1">En 1 Año tendrías</p>
                          <p className="text-2xl font-bold font-mono">US$ {Math.floor(projections.oneYearUsd).toLocaleString('de-DE')}</p>
                          <p className="text-[10px] text-blue-100"> Ganancia pura: {formatMoney(projections.interestGainedYear)} </p>
                      </div>
                      <div className="border-l border-blue-400/30 pl-6">
                          <p className="text-indigo-200 text-xs uppercase font-bold mb-1">En 5 Años</p>
                          <p className="text-2xl font-bold font-mono text-yellow-300">US$ {Math.floor(projections.fiveYearsUsd).toLocaleString('de-DE')}</p>
                          <p className="text-[10px] text-indigo-100">¡Efecto Bola de Nieve!</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 3. CONFIGURAR META (RITMO) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Tu Ritmo de Ahorro</p>
                {isEditingGoal ? (
                    <input autoFocus className="border-b border-blue-500 outline-none w-32 font-bold text-gray-800" type="number" value={annualGoal} onChange={e => setAnnualGoal(e.target.value)} />
                ) : (
                    <p className="font-bold text-gray-700">{Number(annualGoal) > 0 ? `${formatMoney(Number(annualGoal)/12)} / mes` : 'Sin definir'}</p>
                )}
            </div>
            <button onClick={isEditingGoal ? saveGoal : () => setIsEditingGoal(true)} className="text-xs bg-gray-100 px-3 py-2 rounded-lg font-bold text-gray-600">
                {isEditingGoal ? 'Guardar' : 'Cambiar Meta'}
            </button>
      </div>

      {/* 4. AGREGAR INVERSIÓN */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-3">Nueva Inversión / Ahorro</h3>
          
          <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Monto</label>
                      <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold" placeholder="$ 0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400">Moneda</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold text-sm"><option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option></select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Instrumento</label>
                      <input list="instruments" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold" placeholder="Ej: MercadoPago" value={instrument} onChange={e => setInstrument(e.target.value)} />
                      <datalist id="instruments">
                          <option value="Billetera Virtual" />
                          <option value="Plazo Fijo" />
                          <option value="FCI" />
                          <option value="Dólar Billete" />
                          <option value="CEDEARs" />
                      </datalist>
                  </div>
                  <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">TNA Estimada %</label>
                      <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold text-green-600" placeholder="Ej: 32" value={tna} onChange={e => setTna(e.target.value)} />
                  </div>
              </div>

              <div className="flex gap-2 pt-2">
                 <button type="button" onClick={() => setType('withdraw')} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100">Retirar</button>
                 <button type="submit" disabled={!amount} className="flex-[2] py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-black disabled:opacity-50">Guardar Activo</button>
              </div>
          </form>
      </div>

      {/* 5. PORTAFOLIO (LISTA) */}
      <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase px-2">Tu Portafolio</p>
          {savingsList.slice().reverse().map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                      <p className="text-sm font-bold text-gray-800">{item.concept}</p>
                      <div className="flex gap-2 text-[10px]">
                          <span className="text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
                          {item.tna > 0 && <span className="text-green-600 font-bold bg-green-50 px-1 rounded">Rentabilidad: {item.tna}%</span>}
                      </div>
                  </div>
                  <div className="text-right">
                      <p className={`font-mono font-bold ${item.type === 'deposit' ? 'text-gray-800' : 'text-red-500'}`}>
                          {item.type === 'withdraw' && '-'} {item.currency === 'USD' ? `${item.amount} USD` : formatMoney(item.amount)}
                      </p>
                      <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500">Eliminar</button>
                  </div>
              </div>
          ))}
      </div>

    </div>
  );
}