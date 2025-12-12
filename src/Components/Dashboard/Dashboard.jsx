import React, { useMemo, useState, useEffect } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function Dashboard({ transactions = [], cards = [], privacyMode }) {
  
  // --- ESTADOS Y PERSISTENCIA ---
  const [selectedCard, setSelectedCard] = useState('all');
  
  // Recordar la vista preferida (Barras o Mapa)
  const [chartType, setChartType] = useState(() => {
      return localStorage.getItem('dashboard_view_preference') || 'treemap';
  });

  const changeView = (type) => {
      setChartType(type);
      localStorage.setItem('dashboard_view_preference', type);
  };

  // --- 1. CÁLCULOS ---
  
  // Total general de deuda en tarjetas
  const totalDebt = useMemo(() => {
      return transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
  }, [transactions]);

  // Proyección: ¿Cuánto voy a pagar seguro el mes que viene? (Suma de cuotas)
  const projectedNextMonth = useMemo(() => {
      return transactions.reduce((acc, t) => {
          // Si es en cuotas, sumamos la cuota mensual. Si es 1 pago, asumimos que entra todo.
          return acc + (t.installments > 1 ? t.monthlyInstallment : t.amount);
      }, 0);
  }, [transactions]);

  // Agrupar gastos por Tarjeta
  const spendingByCard = useMemo(() => {
      return cards.map(card => {
          const total = transactions
            .filter(t => t.cardId === card.id)
            .reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
          return { ...card, total };
      }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [cards, transactions]);

  // Filtrar lista según selección
  const filteredTransactions = useMemo(() => {
      let list = selectedCard === 'all' 
        ? transactions 
        : transactions.filter(t => t.cardId === selectedCard);
      return list.sort((a, b) => (b.finalAmount || b.amount) - (a.finalAmount || a.amount));
  }, [transactions, selectedCard]);

  const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
  
  const handleDelete = async (id) => {
      if(window.confirm("¿Eliminar este consumo?")) await deleteDoc(doc(db, 'transactions', id));
  };

  const getCardName = (id) => cards.find(c => c.id === id)?.name || 'Tarjeta';

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      
      {/* 1. HEADER: DATOS DUROS + PROYECCIÓN */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
          
          <div className="relative z-10">
              <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Deuda Total Tarjetas</h2>
              <h1 className="text-4xl font-bold tracking-tighter text-white mb-4">
                  {showMoney(totalDebt)}
              </h1>

              {/* DATO DE PROYECCIÓN (SIN BARRAS) */}
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                      <p className="text-[10px] text-indigo-200 uppercase font-bold">Proyección Mes Próximo</p>
                      <p className="text-sm font-mono font-bold text-white">
                          Pagarás aprox. {showMoney(projectedNextMonth)}
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. ZONA DE ANÁLISIS (CON SELECTOR DE VISTA) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 text-sm">Composición de Gastos</h3>
              
              {/* SELECTOR DE VISTA (PERSISTENTE) */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => changeView('bars')}
                    className={`p-1.5 rounded-md transition-all ${chartType === 'bars' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}
                    title="Ver Barras"
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  </button>
                  <button 
                    onClick={() => changeView('treemap')}
                    className={`p-1.5 rounded-md transition-all ${chartType === 'treemap' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}
                    title="Ver Mapa de Bloques"
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                  </button>
              </div>
          </div>
          
          {/* OPCIÓN A: BARRAS (RANKING) */}
          {chartType === 'bars' && (
              <div className="space-y-4 animate-fade-in">
                  {spendingByCard.map((card) => (
                      <div key={card.id} onClick={() => setSelectedCard(card.id === selectedCard ? 'all' : card.id)} className="cursor-pointer group">
                          <div className="flex justify-between text-xs mb-1">
                              <span className={`font-bold ${selectedCard === card.id ? 'text-indigo-600' : 'text-gray-600'}`}>{card.name}</span>
                              <span className="font-mono font-medium text-gray-500">{showMoney(card.total)}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-1000 ${selectedCard === card.id ? 'bg-indigo-600' : 'bg-gray-400'}`} style={{ width: `${(card.total / maxCardSpend) * 100}%` }}></div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* OPCIÓN B: MAPA DE BLOQUES (TREEMAP VERTICAL) */}
          {chartType === 'treemap' && (
              <div className="flex flex-col w-full h-80 rounded-xl overflow-hidden animate-fade-in gap-1">
                  {spendingByCard.map((card, index) => {
                      // Calculamos porcentaje de altura
                      const percent = totalDebt > 0 ? (card.total / totalDebt) * 100 : 0;
                      // Colores generados dinámicamente (Azul -> Violeta)
                      const opacity = 1 - (index * 0.15); 
                      
                      return (
                          <div 
                            key={card.id}
                            onClick={() => setSelectedCard(card.id === selectedCard ? 'all' : card.id)}
                            className={`w-full relative transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-center items-center text-white shadow-sm ${selectedCard === card.id ? 'ring-2 ring-yellow-400 z-10' : ''}`}
                            style={{ 
                                height: `${percent}%`, 
                                minHeight: '40px', // Altura mínima para ver texto
                                backgroundColor: `rgba(79, 70, 229, ${Math.max(opacity, 0.3)})` // Indigo con opacidad variable
                            }}
                          >
                              <span className="font-bold text-xs drop-shadow-md truncate max-w-full px-2">
                                  {card.name} ({Math.round(percent)}%)
                              </span>
                              {percent > 15 && (
                                  <span className="text-[10px] font-mono opacity-90 drop-shadow-md">{showMoney(card.total)}</span>
                              )}
                          </div>
                      );
                  })}
                  {spendingByCard.length === 0 && <p className="text-center text-gray-400 py-10">Sin datos para el mapa.</p>}
              </div>
          )}
          
          {spendingByCard.length > 0 && (
              <button onClick={() => setSelectedCard('all')} className={`text-[10px] mt-4 font-bold px-3 py-1.5 rounded-full border w-full text-center transition-all ${selectedCard === 'all' ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                  {selectedCard === 'all' ? 'Visualizando Todas' : '❌ Quitar Filtro'}
              </button>
          )}
      </div>

      {/* 3. LISTA DE DETALLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm">Detalle de Compras</h3>
                  <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 font-bold uppercase">
                      {filteredTransactions.length} Items
                  </span>
              </div>
          </div>

          <div className="divide-y divide-gray-50">
              {filteredTransactions.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-indigo-50/30 transition-colors flex justify-between items-start group">
                      <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mt-1 flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          </div>
                          <div>
                              <p className="text-sm font-bold text-gray-800 line-clamp-1 break-all">{item.description}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase tracking-wide">
                                      {getCardName(item.cardId)}
                                  </span>
                                  {item.installments > 1 && <span className="text-[9px] text-indigo-500 font-bold">{item.installments} cuotas</span>}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(item.date).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-mono font-bold text-gray-900 text-sm">{showMoney(item.finalAmount || item.amount)}</p>
                          {item.installments > 1 && <p className="text-[10px] text-gray-400">{showMoney(item.monthlyInstallment)} /mes</p>}
                          <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                      </div>
                  </div>
              ))}
              {filteredTransactions.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Sin movimientos.</div>}
          </div>
      </div>

    </div>
  );
}