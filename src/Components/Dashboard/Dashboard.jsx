import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function Dashboard({ transactions = [], cards = [], privacyMode }) {
  
  const [selectedCard, setSelectedCard] = useState('all');
  const [viewType, setViewType] = useState('list'); // 'list', 'blocks', 'projection'
  const [analysisMode, setAnalysisMode] = useState('monthly'); // 'monthly' (Cuota) vs 'total' (Deuda)

  // --- HELPER: Obtener el valor según el modo ---
  const getValue = (t) => {
      // Si estamos en modo "Mensual", devolvemos la cuota (o el total si es 1 pago)
      // Si estamos en modo "Total", devolvemos el monto final deuda
      if (analysisMode === 'monthly') {
          return t.installments > 1 ? t.monthlyInstallment : t.amount;
      }
      return t.finalAmount || t.amount;
  };

  // --- 1. CÁLCULOS FILTRADOS ---
  
  // Agrupar gastos por Tarjeta (Respetando el modo)
  const spendingByCard = useMemo(() => {
      return cards.map(card => {
          const total = transactions
            .filter(t => t.cardId === card.id)
            .reduce((acc, t) => acc + getValue(t), 0);
          return { ...card, total };
      }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [cards, transactions, analysisMode]);

  const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;

  // Lista Filtrada y Ordenada
  const filteredTransactions = useMemo(() => {
      let list = selectedCard === 'all' 
        ? transactions 
        : transactions.filter(t => t.cardId === selectedCard);
      
      // Ordenar por el valor del modo actual (ej: las cuotas más altas primero)
      return list.sort((a, b) => getValue(b) - getValue(a));
  }, [transactions, selectedCard, analysisMode]);

  // Total del Header (La cifra gigante)
  const headerTotal = filteredTransactions.reduce((acc, t) => acc + getValue(t), 0);

  // --- 2. CÁLCULO DE PROYECCIÓN (Siempre mira a futuro) ---
  const projectionData = useMemo(() => {
      const months = [];
      const today = new Date();
      for (let i = 0; i < 12; i++) {
          const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
          let monthlyTotal = 0;
          filteredTransactions.forEach(t => {
              if (t.installments > 1) {
                  const purchaseDate = new Date(t.date);
                  const endInstallmentsDate = new Date(purchaseDate);
                  endInstallmentsDate.setMonth(endInstallmentsDate.getMonth() + t.installments);
                  if (futureDate >= purchaseDate && futureDate < endInstallmentsDate) {
                      monthlyTotal += t.monthlyInstallment;
                  }
              } else if (i === 0) monthlyTotal += t.amount;
          });
          if (monthlyTotal > 0) months.push({ date: futureDate, label: futureDate.toLocaleString('es-AR', { month: 'long', year: '2-digit' }), amount: monthlyTotal });
      }
      return months;
  }, [filteredTransactions]);

  // Helpers
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
  const handleDelete = async (id) => { if(window.confirm("¿Eliminar este consumo?")) await deleteDoc(doc(db, 'transactions', id)); };
  const getCardName = (id) => cards.find(c => c.id === id)?.name || 'Tarjeta';

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      
      {/* 1. HEADER: DATOS CON SWITCH */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden transition-all duration-500">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
          
          {/* SWITCH DE MODO (ARRIBA A LA DERECHA) */}
          <div className="absolute top-4 right-4 flex bg-black/20 rounded-lg p-1 backdrop-blur-md z-20">
              <button 
                onClick={() => setAnalysisMode('monthly')}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'monthly' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}
              >
                  📅 Mes
              </button>
              <button 
                onClick={() => setAnalysisMode('total')}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${analysisMode === 'total' ? 'bg-white text-indigo-900 shadow' : 'text-gray-400 hover:text-white'}`}
              >
                  💰 Total
              </button>
          </div>

          <div className="relative z-10 mt-2">
              <h2 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
                  {analysisMode === 'monthly' ? 'A pagar este mes' : 'Deuda Total Acumulada'}
              </h2>
              <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
                  {showMoney(headerTotal)}
              </h1>
              <p className="text-[10px] text-gray-400">
                  {filteredTransactions.length} ítems en {selectedCard === 'all' ? 'todas las tarjetas' : getCardName(selectedCard)}
              </p>
          </div>
      </div>

      {/* 2. RANKING DE TARJETAS (SE ADAPTA AL MODO) */}
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
          </div>
      </div>

      {/* 3. ZONA DE DETALLE (TABS) */}
      <div>
          <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
              <button onClick={() => setViewType('list')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>📄 Lista</button>
              <button onClick={() => setViewType('blocks')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'blocks' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🧱 Bloques</button>
              <button onClick={() => setViewType('projection')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'projection' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🔮 Futuro</button>
          </div>

          {/* VISTA A: LISTA (AHORA MUESTRA CUOTA PRIMERO) */}
          {viewType === 'list' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {filteredTransactions.map((item) => {
                      const primaryValue = getValue(item); // Cuota o Total según switch
                      const secondaryValue = analysisMode === 'monthly' 
                          ? (item.finalAmount || item.amount) // Si veo cuota, muestro total abajo
                          : (item.installments > 1 ? item.monthlyInstallment : null); // Si veo total, muestro cuota abajo

                      return (
                          <div key={item.id} className="p-4 flex justify-between items-start group hover:bg-gray-50">
                              <div className="flex-1">
                                  <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">{getCardName(item.cardId)}</span>
                                      {item.installments > 1 && <span className="text-[9px] text-indigo-500 font-bold">{item.installments} cuotas</span>}
                                  </div>
                              </div>
                              <div className="text-right">
                                  {/* MONTO PRINCIPAL (GRANDE) */}
                                  <p className="font-mono font-bold text-gray-900 text-sm">
                                      {showMoney(primaryValue)}
                                  </p>
                                  {/* MONTO SECUNDARIO (CHICO) */}
                                  {secondaryValue && (
                                      <p className="text-[10px] text-gray-400">
                                          {analysisMode === 'monthly' ? 'Total: ' : 'Cuota: '} 
                                          {showMoney(secondaryValue)}
                                      </p>
                                  )}
                                  <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                              </div>
                          </div>
                      );
                  })}
                  {filteredTransactions.length === 0 && <p className="text-center text-gray-400 p-8 text-sm">Sin datos.</p>}
              </div>
          )}

          {/* VISTA B: BLOQUES (TREEMAP AJUSTADO AL MODO) */}
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
                              {analysisMode === 'monthly' && item.installments > 1 && (
                                  <span className="absolute top-1 right-1 text-[8px] opacity-70 border border-white/30 px-1 rounded">cuota</span>
                              )}
                              <div className="absolute bottom-0 left-0 h-1 bg-black/10" style={{ width: `${percent}%` }}></div>
                          </div>
                      )
                  })}
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