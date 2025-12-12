import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function Dashboard({ transactions = [], cards = [], privacyMode }) {
  
  const [selectedCard, setSelectedCard] = useState('all');
  const [viewType, setViewType] = useState('list'); // 'list', 'blocks', 'projection'

  // --- 1. FILTRADO MAESTRO ---
  
  // Agrupar gastos por Tarjeta (Para el gráfico de arriba)
  const spendingByCard = useMemo(() => {
      return cards.map(card => {
          const total = transactions
            .filter(t => t.cardId === card.id)
            .reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
          return { ...card, total };
      }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [cards, transactions]);

  const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;

  // Transacciones Filtradas (Base para las 3 vistas de abajo)
  const filteredTransactions = useMemo(() => {
      let list = selectedCard === 'all' 
        ? transactions 
        : transactions.filter(t => t.cardId === selectedCard);
      return list.sort((a, b) => (b.finalAmount || b.amount) - (a.finalAmount || a.amount));
  }, [transactions, selectedCard]);

  const totalFilteredDebt = filteredTransactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);

  // --- 2. CÁLCULO DE PROYECCIÓN (FUTURO) ---
  const projectionData = useMemo(() => {
      const months = [];
      const today = new Date();
      
      // Proyectamos 12 meses hacia adelante
      for (let i = 0; i < 12; i++) {
          const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
          let monthlyTotal = 0;

          // Revisamos cada compra para ver si impacta en este mes futuro
          filteredTransactions.forEach(t => {
              if (t.installments > 1) {
                  // Si es cuota, sumamos si todavía está vigente
                  // (Simplificación: asumimos que las cuotas arrancaron en la fecha de compra)
                  const purchaseDate = new Date(t.date);
                  const endInstallmentsDate = new Date(purchaseDate);
                  endInstallmentsDate.setMonth(endInstallmentsDate.getMonth() + t.installments);
                  
                  if (futureDate >= purchaseDate && futureDate < endInstallmentsDate) {
                      monthlyTotal += t.monthlyInstallment;
                  }
              } else if (i === 0) {
                  // Si es 1 pago, solo suma al mes actual (deuda inmediata)
                  monthlyTotal += t.amount;
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
  }, [filteredTransactions]);


  // Helpers
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
  const handleDelete = async (id) => { if(window.confirm("¿Eliminar este consumo?")) await deleteDoc(doc(db, 'transactions', id)); };
  const getCardName = (id) => cards.find(c => c.id === id)?.name || 'Tarjeta';

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      
      {/* 1. HEADER: TOTALES */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
              {selectedCard === 'all' ? 'Deuda Total Global' : `Deuda ${getCardName(selectedCard)}`}
          </h2>
          <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
              {showMoney(totalFilteredDebt)}
          </h1>
          <p className="text-xs text-indigo-200">
              {filteredTransactions.length} consumos activos
          </p>
      </div>

      {/* 2. GRÁFICO MAESTRO (FILTRO) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm">Ranking de Tarjetas</h3>
              {selectedCard !== 'all' && (
                  <button onClick={() => setSelectedCard('all')} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold hover:bg-gray-200">
                      Ver Todas
                  </button>
              )}
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

      {/* 3. ZONA DE DETALLE (CON PESTAÑAS) */}
      <div>
          {/* TABS */}
          <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
              <button onClick={() => setViewType('list')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>📄 Lista</button>
              <button onClick={() => setViewType('blocks')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'blocks' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🧱 Bloques</button>
              <button onClick={() => setViewType('projection')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewType === 'projection' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>🔮 Futuro</button>
          </div>

          {/* VISTA A: LISTA (CLÁSICA) */}
          {viewType === 'list' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {filteredTransactions.map((item) => (
                      <div key={item.id} className="p-4 flex justify-between items-start group hover:bg-gray-50">
                          <div>
                              <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">{getCardName(item.cardId)}</span>
                                  {item.installments > 1 && <span className="text-[9px] text-indigo-500 font-bold">{item.installments} cuotas</span>}
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="font-mono font-bold text-gray-900 text-sm">{showMoney(item.finalAmount || item.amount)}</p>
                              <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                          </div>
                      </div>
                  ))}
                  {filteredTransactions.length === 0 && <p className="text-center text-gray-400 p-8 text-sm">Sin datos.</p>}
              </div>
          )}

          {/* VISTA B: BLOQUES (TREEMAP DE GASTOS) */}
          {viewType === 'blocks' && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-1 min-h-[300px] content-start">
                  {filteredTransactions.map((item, index) => {
                      const percent = ( (item.finalAmount || item.amount) / totalFilteredDebt ) * 100;
                      // Bloques grandes ocupan más ancho
                      const widthClass = percent > 40 ? 'w-full' : percent > 20 ? 'w-[49%]' : 'w-[32%]';
                      const heightClass = percent > 20 ? 'h-24' : 'h-16';
                      // Colores: Más caro = Más oscuro/rojo
                      const colorClass = index < 3 ? 'bg-indigo-600 text-white' : index < 6 ? 'bg-indigo-400 text-white' : 'bg-indigo-100 text-indigo-800';

                      return (
                          <div key={item.id} className={`${widthClass} ${heightClass} flex-grow rounded-lg ${colorClass} p-2 flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02] shadow-sm`}>
                              <span className="text-[10px] font-bold truncate z-10">{item.description}</span>
                              <span className="text-xs font-mono font-bold z-10">{showMoney(item.finalAmount || item.amount)}</span>
                              {/* Barra de progreso interna sutil */}
                              <div className="absolute bottom-0 left-0 h-1 bg-black/10" style={{ width: `${percent}%` }}></div>
                          </div>
                      )
                  })}
                  {filteredTransactions.length === 0 && <p className="w-full text-center text-gray-400 p-8 text-sm">Sin datos.</p>}
              </div>
          )}

          {/* VISTA C: PROYECCIÓN (LÍNEA DE TIEMPO) */}
          {viewType === 'projection' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                  {/* Línea Vertical */}
                  <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-100"></div>

                  <div className="space-y-6 relative">
                      {projectionData.map((month, index) => {
                          // Escala visual del círculo
                          const isHigh = index === 0; // El primer mes suele ser el más alto
                          const circleSize = isHigh ? 'w-4 h-4 ring-4 ring-indigo-50' : 'w-3 h-3';
                          const circleColor = isHigh ? 'bg-indigo-600' : 'bg-indigo-300';

                          return (
                              <div key={index} className="flex items-center gap-6 relative group">
                                  {/* Punto en la línea */}
                                  <div className={`absolute left-[7px] ${circleSize} ${circleColor} rounded-full z-10 transition-all group-hover:scale-125`}></div>
                                  
                                  <div className="pl-8 flex-1 flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                      <div>
                                          <p className="font-bold text-gray-800 capitalize text-sm">{month.label}</p>
                                          <p className="text-[10px] text-gray-400">Compromisos de cuotas</p>
                                      </div>
                                      <p className={`font-mono font-bold ${isHigh ? 'text-indigo-600 text-lg' : 'text-gray-600'}`}>
                                          {showMoney(month.amount)}
                                      </p>
                                  </div>
                              </div>
                          )
                      })}
                      {projectionData.length === 0 && <p className="text-center text-gray-400 text-sm">No hay cuotas futuras registradas.</p>}
                  </div>
              </div>
          )}
      </div>

    </div>
  );
}