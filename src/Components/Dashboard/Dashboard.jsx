import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

// Categorías para mapear nombres (si hiciera falta)
const CAT_LABELS = {
    'supermarket': 'Supermercado',
    'health': 'Salud',
    'food': 'Comida',
    'transport': 'Transporte',
    'services': 'Servicios',
    'shopping': 'Compras',
    'home': 'Hogar',
    'education': 'Educación'
};

export default function Dashboard({ transactions = [], cards = [], services = [], privacyMode, currentDate }) {
  
  const [viewMode, setViewMode] = useState('general'); // 'general' | 'cards_detail'

  // =================================================================
  // 1. CÁLCULOS GENERALES (Para la Vista Operativa)
  // =================================================================

  // Filtro de Transacciones del Mes Actual
  const monthlyTransactions = useMemo(() => {
      const targetDate = currentDate || new Date();
      const targetMonthVal = targetDate.getFullYear() * 12 + targetDate.getMonth();

      return transactions.filter(t => {
          const tDate = new Date(t.date);
          // Si es CASH, tiene que ser del mes exacto
          if (t.type === 'cash') {
              return tDate.getMonth() === targetDate.getMonth() && tDate.getFullYear() === targetDate.getFullYear();
          }
          // Si es CRÉDITO, tiene que ser una cuota activa en este mes
          const startMonthVal = tDate.getFullYear() * 12 + tDate.getMonth();
          const endMonthVal = startMonthVal + (t.installments || 1);
          return targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal;
      });
  }, [transactions, currentDate]);

  // A. MOCHILA FUTURA (¿Cuánto debo ya para el mes que viene?)
  const futureBackpack = useMemo(() => {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const targetVal = nextMonth.getFullYear() * 12 + nextMonth.getMonth();
      
      const cardDebt = transactions.reduce((acc, t) => {
          if (t.type === 'cash') return acc;
          const tDate = new Date(t.date);
          const startVal = tDate.getFullYear() * 12 + tDate.getMonth();
          const endVal = startVal + t.installments;
          if (targetVal >= startVal && targetVal < endVal) {
              return acc + t.monthlyInstallment;
          }
          return acc;
      }, 0);
      // Sumamos servicios promedio (opcional, por ahora solo tarjetas para ser exactos)
      return cardDebt;
  }, [transactions, currentDate]);

  // B. GASTO CONTADO (Mes Actual)
  const cashSpent = useMemo(() => {
      return monthlyTransactions
        .filter(t => t.type === 'cash')
        .reduce((acc, t) => acc + t.amount, 0);
  }, [monthlyTransactions]);

  // C. MAREA SEMANAL (Vencimientos Servicios + Tarjetas)
  const weeklyTide = useMemo(() => {
      const weeks = [0, 0, 0, 0]; // Sem 1 (1-7), Sem 2 (8-15), Sem 3 (16-23), Sem 4 (24-31)
      
      // 1. Sumar Servicios
      services.forEach(s => {
         // Si ya está pagado en este periodo, igual lo mostramos como "carga financiera" o lo filtramos.
         // Para "previsión", mostramos el monto total del compromiso.
         const day = s.day || 1;
         const idx = day <= 7 ? 0 : day <= 15 ? 1 : day <= 23 ? 2 : 3;
         weeks[idx] += s.amount;
      });

      // 2. Sumar Tarjetas (El día del vencimiento cae toda la cuota)
      cards.forEach(c => {
          const debt = monthlyTransactions
            .filter(t => t.cardId === c.id) // Solo cuotas de este mes
            .reduce((acc, t) => acc + (t.monthlyInstallment || 0), 0);
          
          if (debt > 0) {
              const day = c.dueDay || 1;
              const idx = day <= 7 ? 0 : day <= 15 ? 1 : day <= 23 ? 2 : 3;
              weeks[idx] += debt;
          }
      });
      
      const max = Math.max(...weeks, 1); // Para calcular altura de barras
      return weeks.map(amount => ({ amount, height: (amount / max) * 100 }));
  }, [services, cards, monthlyTransactions]);

  // D. BARRAS APILADAS (Categorías: Cash vs Crédito)
  const stackedData = useMemo(() => {
      const groups = {};
      monthlyTransactions.forEach(t => {
          const cat = t.category || 'varios';
          if (!groups[cat]) groups[cat] = { cash: 0, credit: 0, total: 0 };
          
          const val = t.type === 'cash' ? t.amount : t.monthlyInstallment;
          if (t.type === 'cash') groups[cat].cash += val;
          else groups[cat].credit += val;
          groups[cat].total += val;
      });

      // Convertir a array y ordenar por total
      return Object.entries(groups)
          .map(([key, val]) => ({ 
              label: CAT_LABELS[key] || key, 
              ...val, 
              cashPct: (val.cash / val.total) * 100,
              creditPct: (val.credit / val.total) * 100 
          }))
          .sort((a, b) => b.total - a.total);
  }, [monthlyTransactions]);


  // =================================================================
  // 2. LÓGICA VISTA DETALLE (TU DASHBOARD ANTERIOR)
  // =================================================================
  const [selectedCard, setSelectedCard] = useState('all');
  const [analysisMode, setAnalysisMode] = useState('monthly'); // monthly | total
  const [detailViewType, setDetailViewType] = useState('list'); // list | blocks | projection

  const detailTransactions = useMemo(() => {
      // Si es modo mensual, usamos monthlyTransactions. Si es total, usamos todas.
      // Pero ojo, tu dashboard anterior tenía lógica propia para "Deuda Total Activa".
      // Para simplificar y mantener fidelidad, replicamos la lógica exacta de tu versión anterior:
      
      if (analysisMode === 'monthly') return monthlyTransactions.filter(t => t.type !== 'cash'); // Solo tarjetas en detalle
      
      // Modo Total (Toda la deuda futura)
      return transactions.filter(t => t.type !== 'cash' && t.installments > 1); // Filtro simplificado para deuda
  }, [transactions, monthlyTransactions, analysisMode]);

  const spendingByCard = useMemo(() => {
      return cards.map(card => {
          // Calculamos según el modo
          const total = detailTransactions
            .filter(t => t.cardId === card.id)
            .reduce((acc, t) => acc + (analysisMode === 'monthly' ? t.monthlyInstallment : (t.finalAmount || t.amount)), 0);
          return { ...card, total };
      }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [cards, detailTransactions, analysisMode]);

  const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;

  const filteredDetailList = useMemo(() => {
      let list = selectedCard === 'all' ? detailTransactions : detailTransactions.filter(t => t.cardId === selectedCard);
      return list.sort((a, b) => {
          const valA = analysisMode === 'monthly' ? a.monthlyInstallment : a.finalAmount;
          const valB = analysisMode === 'monthly' ? b.monthlyInstallment : b.finalAmount;
          return valB - valA;
      });
  }, [detailTransactions, selectedCard, analysisMode]);

  const detailHeaderTotal = filteredDetailList.reduce((acc, t) => acc + (analysisMode === 'monthly' ? t.monthlyInstallment : (t.finalAmount || t.amount)), 0);

  // Proyección (Código restaurado)
  const projectionData = useMemo(() => {
      const months = [];
      const baseDate = currentDate || new Date();
      for (let i = 0; i < 12; i++) {
          const futureDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
          let monthlyTotal = 0;
          transactions.filter(t => t.type !== 'cash').forEach(t => { // Solo crédito
              const purchaseDate = new Date(t.date);
              // Ajuste zona horaria simple
              purchaseDate.setHours(12,0,0,0);
              
              if (t.installments > 1) {
                  const startM = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
                  const endM = startM + t.installments;
                  const currentM = futureDate.getFullYear() * 12 + futureDate.getMonth();
                  if (currentM >= startM && currentM < endM) monthlyTotal += t.monthlyInstallment;
              } else if (i === 0) { 
                   // 1 pago cae en el mes 0 relativo si coincide fecha
                  const startM = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
                  const currentM = futureDate.getFullYear() * 12 + futureDate.getMonth();
                  if (currentM === startM) monthlyTotal += t.amount;
              }
          });
          if (monthlyTotal > 0) months.push({ date: futureDate, label: futureDate.toLocaleString('es-AR', { month: 'long', year: '2-digit' }), amount: monthlyTotal });
      }
      return months;
  }, [transactions, currentDate]);

  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
  const getCardName = (id) => cards.find(c => c.id === id)?.name || 'Tarjeta';
  const handleDelete = async (id) => { if(window.confirm("¿Eliminar consumo?")) await deleteDoc(doc(db, 'transactions', id)); };


  // =================================================================
  // RENDER
  // =================================================================

  // VISTA 1: OPERATIVA (GENERAL)
  if (viewMode === 'general') {
      return (
        <div className="space-y-6 animate-fade-in pb-20">
            
            {/* 1. MOCHILA FUTURA VS GASTO HOY */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Gasto Contado (Mes)</p>
                    <p className="text-2xl font-bold text-gray-800">{showMoney(cashSpent)}</p>
                    <p className="text-[10px] text-green-600 font-medium">Salida de caja real</p>
                </div>
                <div className="bg-indigo-900 p-4 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-5 rounded-full -mr-5 -mt-5"></div>
                    <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">Mochila Futura (Próx Mes)</p>
                    <p className="text-2xl font-bold">{showMoney(futureBackpack)}</p>
                    <p className="text-[10px] text-indigo-300 font-medium">Ya comprometido</p>
                </div>
            </div>

            {/* 2. MAREA SEMANAL (Vencimientos) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    🌊 Marea Semanal <span className="text-[10px] font-normal text-gray-400">(Vencimientos Tarjeta + Servicios)</span>
                </h3>
                <div className="flex items-end justify-between h-32 gap-4 px-2">
                    {weeklyTide.map((week, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                             {/* Tooltip */}
                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[10px] py-1 px-2 rounded transition-opacity whitespace-nowrap z-10">
                                {showMoney(week.amount)}
                            </div>
                            <div className="w-full bg-gray-100 rounded-t-lg relative flex items-end overflow-hidden h-full">
                                <div 
                                    className={`w-full rounded-t-lg transition-all duration-700 ${week.height > 50 ? 'bg-red-400' : 'bg-blue-400'}`} 
                                    style={{ height: `${week.height}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Sem {idx + 1}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. BARRAS APILADAS (Realidad de Consumo) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Estructura de Gasto</h3>
                <div className="space-y-4">
                    {stackedData.map((cat, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-gray-700 capitalize">{cat.label}</span>
                                <span className="font-mono font-medium text-gray-500">{showMoney(cat.total)}</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full flex overflow-hidden">
                                {/* Parte Contado (Verde) */}
                                <div className="h-full bg-green-500" style={{ width: `${cat.cashPct}%` }}></div>
                                {/* Parte Crédito (Azul) */}
                                <div className="h-full bg-blue-500" style={{ width: `${cat.creditPct}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[9px] mt-0.5 text-gray-400">
                                <span>{Math.round(cat.cashPct)}% Efectivo</span>
                                <span>{Math.round(cat.creditPct)}% Crédito</span>
                            </div>
                        </div>
                    ))}
                    {stackedData.length === 0 && <p className="text-center text-gray-400 text-xs">Sin datos este mes.</p>}
                </div>
            </div>

            {/* BOTÓN PARA IR A DETALLE */}
            <button 
                onClick={() => setViewMode('cards_detail')}
                className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                Analizar Tarjetas en Detalle
            </button>
        </div>
      );
  }

  // VISTA 2: DETALLE (EL DASHBOARD ANTERIOR RESTAURADO)
  return (
    <div className="space-y-6 animate-fade-in pb-32">
        <button onClick={() => setViewMode('general')} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 mb-2">
            ← Volver al Resumen Operativo
        </button>

      {/* HEADER TARJETA CON SWITCH */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden transition-all duration-500">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
          <div className="absolute top-4 right-4 flex bg-black/20 rounded-lg p-1 backdrop-blur-md z-20">
              <button onClick={() => setAnalysisMode('monthly')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'monthly' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}>📅 Cuota Mes</button>
              <button onClick={() => setAnalysisMode('total')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'total' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}>💰 Deuda Total</button>
          </div>
          <div className="relative z-10 mt-2">
              <h2 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">{analysisMode === 'monthly' ? 'A pagar este mes (Tarjetas)' : 'Deuda Total Activa'}</h2>
              <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">{showMoney(detailHeaderTotal)}</h1>
              <p className="text-[10px] text-gray-400">{filteredDetailList.length} ítems activos en {selectedCard === 'all' ? 'total' : getCardName(selectedCard)}</p>
          </div>
      </div>

      {/* RANKING TARJETAS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 text-sm">{analysisMode === 'monthly' ? 'Impacto en Cuota' : 'Ranking de Deuda'}</h3>{selectedCard !== 'all' && <button onClick={() => setSelectedCard('all')} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold hover:bg-gray-200">Ver Todas</button>}</div>
          <div className="space-y-3">
              {spendingByCard.map((card) => (
                  <div key={card.id} onClick={() => setSelectedCard(card.id === selectedCard ? 'all' : card.id)} className="cursor-pointer group">
                      <div className="flex justify-between text-xs mb-1"><span className={`font-bold ${selectedCard === card.id ? 'text-indigo-600' : 'text-gray-600'}`}>{card.name}</span><span className="font-mono font-medium text-gray-500">{showMoney(card.total)}</span></div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${selectedCard === card.id ? 'bg-indigo-600' : 'bg-gray-400'}`} style={{ width: `${(card.total / maxCardSpend) * 100}%` }}></div></div>
                  </div>
              ))}
              {spendingByCard.length === 0 && <p className="text-xs text-gray-400 text-center">Sin consumo de tarjetas.</p>}
          </div>
      </div>

      {/* VISTAS DETALLE (LISTA / BLOQUES / FUTURO) */}
      <div>
          <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
              <button onClick={() => setDetailViewType('list')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${detailViewType === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>📄 Lista</button>
              <button onClick={() => setDetailViewType('blocks')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${detailViewType === 'blocks' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🧱 Bloques</button>
              <button onClick={() => setDetailViewType('projection')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${detailViewType === 'projection' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🔮 Futuro</button>
          </div>

          {detailViewType === 'list' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {filteredDetailList.map((item) => (
                      <div key={item.id} className="p-4 flex justify-between items-start group hover:bg-gray-50">
                          <div className="flex-1 pr-2">
                              <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">{getCardName(item.cardId)}</span>
                                  {item.installments > 1 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">{item.installments} pagos</span>}
                              </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                              <p className="font-mono font-bold text-gray-900 text-sm">
                                  {showMoney(analysisMode === 'monthly' ? item.monthlyInstallment : (item.finalAmount || item.amount))}
                              </p>
                              <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity block w-full text-right">Eliminar</button>
                          </div>
                      </div>
                  ))}
                  {filteredDetailList.length === 0 && <p className="text-center text-gray-400 p-8 text-sm">Sin datos.</p>}
              </div>
          )}

          {detailViewType === 'blocks' && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-1 min-h-[300px] content-start">
                  {filteredDetailList.map((item, index) => {
                      const val = analysisMode === 'monthly' ? item.monthlyInstallment : (item.finalAmount || item.amount);
                      const percent = (val / detailHeaderTotal) * 100;
                      const widthClass = percent > 40 ? 'w-full' : percent > 20 ? 'w-[49%]' : 'w-[32%]';
                      return (<div key={item.id} className={`${widthClass} h-20 flex-grow rounded-lg ${index < 3 ? 'bg-indigo-600 text-white' : 'bg-indigo-400 text-white'} p-2 flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02] shadow-sm`}><span className="text-[10px] font-bold truncate z-10">{item.description}</span><span className="text-xs font-mono font-bold z-10">{showMoney(val)}</span></div>)
                  })}
              </div>
          )}
          
          {detailViewType === 'projection' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative"><div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-100"></div><div className="space-y-6 relative">{projectionData.map((month, index) => (<div key={index} className="flex items-center gap-6 relative group"><div className={`absolute left-[7px] w-3 h-3 bg-indigo-300 rounded-full z-10`}></div><div className="pl-8 flex-1 flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors"><div><p className="font-bold text-gray-800 capitalize text-sm">{month.label}</p></div><p className="font-mono font-bold text-gray-600">{showMoney(month.amount)}</p></div></div>))}</div></div>
          )}
      </div>
    </div>
  );
}