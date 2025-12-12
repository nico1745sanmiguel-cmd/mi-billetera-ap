import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function Dashboard({ transactions = [], cards = [], privacyMode, currentDate }) {
  
  const [selectedCard, setSelectedCard] = useState('all');
  const [viewType, setViewType] = useState('list'); // 'list', 'blocks', 'projection'
  const [analysisMode, setAnalysisMode] = useState('monthly'); // 'monthly' (Cuota) vs 'total' (Deuda Total)

  // --- 0. FILTRO DE TIEMPO (CEREBRO) ---
  // Filtramos las compras que tienen una "vida" activa en el mes que elegiste arriba
  const activeTransactions = useMemo(() => {
      const targetDate = currentDate || new Date();
      const targetMonthVal = targetDate.getFullYear() * 12 + targetDate.getMonth();

      return transactions.filter(t => {
          const purchaseDate = new Date(t.date);
          // Ajuste horario para evitar errores de día
          purchaseDate.setHours(12,0,0,0);

          const startMonthVal = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
          const endMonthVal = startMonthVal + (t.installments || 1); 
          
          // ¿El mes seleccionado cae dentro del rango de pago?
          return targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal;
      });
  }, [transactions, currentDate]);


  // --- HELPER: Obtener valor (Cuota vs Total) ---
  const getValue = (t) => {
      if (analysisMode === 'monthly') {
          return t.installments > 1 ? t.monthlyInstallment : t.amount;
      }
      return t.finalAmount || t.amount;
  };

  // --- HELPER: Info de Cuota (ej: "3/12") ---
  const getInstallmentInfo = (t) => {
      if (t.installments <= 1) return null;
      const purchaseDate = new Date(t.date);
      const targetDate = currentDate || new Date();
      
      const diffMonths = (targetDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (targetDate.getMonth() - purchaseDate.getMonth());
      const currentInst = diffMonths + 1;
      
      if (currentInst > t.installments) return null;
      return `${currentInst}/${t.installments}`;
  };

  // --- 1. RANKING POR TARJETA (FILTRADO) ---
  const spendingByCard = useMemo(() => {
      return cards.map(card => {
          const total = activeTransactions
            .filter(t => t.cardId === card.id)
            .reduce((acc, t) => acc + getValue(t), 0);
          return { ...card, total };
      }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [cards, activeTransactions, analysisMode]);

  const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;

  // --- 2. LISTA DETALLADA ---
  const filteredTransactions = useMemo(() => {
      let list = selectedCard === 'all' 
        ? activeTransactions 
        : activeTransactions.filter(t => t.cardId === selectedCard);
      
      // Ordenamos por el monto que estás viendo (Cuota o Total)
      return list.sort((a, b) => getValue(b) - getValue(a));
  }, [activeTransactions, selectedCard, analysisMode]);

  const headerTotal = filteredTransactions.reduce((acc, t) => acc + getValue(t), 0);

  // --- 3. PROYECCIÓN FUTURA (A 12 Meses desde la fecha seleccionada) ---
  const projectionData = useMemo(() => {
      const months = [];
      const baseDate = currentDate || new Date();
      
      for (let i = 0; i < 12; i++) {
          const futureDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
          let monthlyTotal = 0;
          
          // Usamos 'transactions' (todas) para proyectar el futuro, no solo las activas de hoy
          transactions.forEach(t => {
              const purchaseDate = new Date(t.date);
              purchaseDate.setHours(12,0,0,0);
              
              if (t.installments > 1) {
                  const startM = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
                  const endM = startM + t.installments;
                  const currentM = futureDate.getFullYear() * 12 + futureDate.getMonth();

                  if (currentM >= startM && currentM < endM) {
                      monthlyTotal += t.monthlyInstallment;
                  }
              } else if (i === 0) { 
                  // Si es 1 pago, solo suma si coincide EXACTO con el mes base
                  const startM = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
                  const currentM = futureDate.getFullYear() * 12 + futureDate.getMonth();
                  if (currentM === startM) monthlyTotal += t.amount;
              }
          });

          if (monthlyTotal > 0) {
              months.push({
                  date: futureDate,
                  label: futureDate.toLocaleString('es-AR', { month: 'long', year: '2-digit' }),
                  amount: monthlyTotal
              });
          }
      }
      return months;
  }, [transactions, currentDate]);

  // Helpers visuales
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
  const handleDelete = async (id) => { if(window.confirm("¿Eliminar consumo?")) await deleteDoc(doc(db, 'transactions', id)); };
  const getCardName = (id) => cards.find(c => c.id === id)?.name || 'Tarjeta';

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      
      {/* 1. HEADER DASHBOARD */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden transition-all duration-500">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
          
          <div className="absolute top-4 right-4 flex bg-black/20 rounded-lg p-1 backdrop-blur-md z-20">
              <button onClick={() => setAnalysisMode('monthly')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'monthly' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}>📅 Mes</button>
              <button onClick={() => setAnalysisMode('total')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'total' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}>💰 Total</button>
          </div>

          <div className="relative z-10 mt-2">
              <h2 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
                  {analysisMode === 'monthly' ? 'A pagar este periodo' : 'Deuda Total Activa'}
              </h2>
              <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
                  {showMoney(headerTotal)}
              </h1>
              <p className="text-[10px] text-gray-400">
                  {filteredTransactions.length} cuotas activas en {selectedCard === 'all' ? 'total' : getCardName(selectedCard)}
              </p>
          </div>
      </div>

      {/* 2. RANKING DE TARJETAS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm">
                  {analysisMode === 'monthly' ? 'Impacto en Cuota' : 'Ranking de Deuda'}
              </h3>
              {selectedCard !== 'all' && <button onClick={() => setSelectedCard('all')} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold hover:bg-gray-200">Ver Todas</button>}
          </div>
          <div className="space-y-3">
              {spendingByCard.map((card) => (
                  <div key={card.id} onClick={() => setSelectedCard(card.id === selectedCard ? 'all' : card.id)} className="cursor-pointer group">
                      <div className="flex justify-between text-xs mb-1">
                          <span className={`font-bold ${selectedCard === card.id ? 'text-indigo-600' : 'text-gray-600'}`}>{card.name}</span>
                          <span className="font-mono font-medium text-gray-500">{showMoney(card.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${selectedCard === card.id ? 'bg-indigo-600' : 'bg-gray-400'}`} style={{ width: `${(card.total / maxCardSpend) * 100}%` }}></div>
                      </div>
                  </div>
              ))}
              {spendingByCard.length === 0 && <p className="text-xs text-gray-400 text-center">Nada que pagar en este mes 🎉</p>}
          </div>
      </div>

      {/* 3. TABS DE DETALLE */}
      <div>
          <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
              <button onClick={() => setViewType('list')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>📄 Lista</button>
              <button onClick={() => setViewType('blocks')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'blocks' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🧱 Bloques</button>
              <button onClick={() => setViewType('projection')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'projection' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🔮 Futuro</button>
          </div>

          {/* VISTA A: LISTA */}
          {viewType === 'list' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {filteredTransactions.map((item) => {
                      const primaryVal = getValue(item);
                      const secondaryVal = analysisMode === 'monthly' ? (item.finalAmount || item.amount) : (item.installments > 1 ? item.monthlyInstallment : null);
                      const infoCuota = getInstallmentInfo(item);

                      return (
                          <div key={item.id} className="p-4 flex justify-between items-start group hover:bg-gray-50">
                              <div className="flex-1 pr-2">
                                  <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.description}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">{getCardName(item.cardId)}</span>
                                      {infoCuota && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">Cuota {infoCuota}</span>}
                                  </div>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                  <p className="font-mono font-bold text-gray-900 text-sm">{showMoney(primaryVal)}</p>
                                  {secondaryVal && <p className="text-[10px] text-gray-400">{analysisMode === 'monthly' ? 'Total: ' : 'Cuota: '}{showMoney(secondaryVal)}</p>}
                                  <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity block w-full text-right">Eliminar</button>
                              </div>
                          </div>
                      );
                  })}
                  {filteredTransactions.length === 0 && <p className="text-center text-gray-400 p-8 text-sm">Sin datos para este mes.</p>}
              </div>
          )}

          {/* VISTA B: BLOQUES (Treemap) */}
          {viewType === 'blocks' && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-1 min-h-[300px] content-start">
                  {filteredTransactions.map((item, index) => {
                      const val = getValue(item);
                      const percent = (val / headerTotal) * 100;
                      const widthClass = percent > 40 ? 'w-full' : percent > 20 ? 'w-[49%]' : 'w-[32%]';
                      const heightClass = percent > 20 ? 'h-24' : 'h-16';
                      const colorClass = index < 3 ? 'bg-indigo-600 text-white' : index < 6 ? 'bg-indigo-400 text-white' : 'bg-indigo-100 text-indigo-800';

                      return (
                          <div key={item.id} className={`${widthClass} ${heightClass} flex-grow rounded-lg ${colorClass} p-2 flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02] shadow-sm`}>
                              <span className="text-[10px] font-bold truncate z-10">{item.description}</span>
                              <span className="text-xs font-mono font-bold z-10">{showMoney(val)}</span>
                              {analysisMode === 'monthly' && item.installments > 1 && <span className="absolute top-1 right-1 text-[8px] opacity-70 border border-white/30 px-1 rounded">{getInstallmentInfo(item)}</span>}
                              <div className="absolute bottom-0 left-0 h-1 bg-black/10" style={{ width: `${percent}%` }}></div>
                          </div>
                      )
                  })}
                  {filteredTransactions.length === 0 && <p className="w-full text-center text-gray-400 p-8 text-sm">Sin datos.</p>}
              </div>
          )}

          {/* VISTA C: PROYECCIÓN (Timeline) */}
          {viewType === 'projection' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                  <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-100"></div>
                  <div className="space-y-6 relative">
                      {projectionData.map((month, index) => {
                          const isHigh = index === 0;
                          return (
                              <div key={index} className="flex items-center gap-6 relative group">
                                  <div className={`absolute left-[7px] ${isHigh ? 'w-4 h-4 ring-4 ring-indigo-50 bg-indigo-600' : 'w-3 h-3 bg-indigo-300'} rounded-full z-10`}></div>
                                  <div className="pl-8 flex-1 flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                      <div><p className="font-bold text-gray-800 capitalize text-sm">{month.label}</p><p className="text-[10px] text-gray-400">Cuotas a pagar</p></div>
                                      <p className={`font-mono font-bold ${isHigh ? 'text-indigo-600 text-lg' : 'text-gray-600'}`}>{showMoney(month.amount)}</p>
                                  </div>
                              </div>
                          )
                      })}
                      {projectionData.length === 0 && <p className="text-center text-gray-400 text-sm">No hay cuotas futuras.</p>}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}