import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function Dashboard({ transactions = [], cards = [], privacyMode }) {
  
  const [selectedCard, setSelectedCard] = useState('all');

  // --- 1. CÁLCULOS ---
  
  // Total general de deuda en tarjetas
  const totalDebt = useMemo(() => {
      return transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
  }, [transactions]);

  // Agrupar gastos por Tarjeta
  const spendingByCard = useMemo(() => {
      return cards.map(card => {
          const total = transactions
            .filter(t => t.cardId === card.id)
            .reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
          return { ...card, total };
      }).filter(c => c.total > 0).sort((a, b) => b.total - a.total); // Ordenar de mayor a menor
  }, [cards, transactions]);

  // Filtrar lista según selección
  const filteredTransactions = useMemo(() => {
      let list = selectedCard === 'all' 
        ? transactions 
        : transactions.filter(t => t.cardId === selectedCard);
      
      // Ordenar por monto (descendente) para ver los gastos grandes primero
      return list.sort((a, b) => (b.finalAmount || b.amount) - (a.finalAmount || a.amount));
  }, [transactions, selectedCard]);

  // Escala para el gráfico de barras
  const maxCardSpend = spendingByCard.length > 0 ? spendingByCard[0].total : 1;

  // Helpers
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
  
  const handleDelete = async (id) => {
      if(window.confirm("¿Eliminar este consumo?")) await deleteDoc(doc(db, 'transactions', id));
  };

  const getCardName = (id) => {
      const c = cards.find(card => card.id === id);
      return c ? c.name : 'Desconocida';
  };

  const getCardColor = (id) => {
      const c = cards.find(card => card.id === id);
      return c ? c.color : '#6b7280';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      
      {/* 1. HEADER: TOTAL DEUDA TARJETAS */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>
          
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Consumos Tarjeta</h2>
          <div className="flex items-end gap-3">
              <h1 className="text-4xl font-bold tracking-tighter text-white">
                  {showMoney(totalDebt)}
              </h1>
          </div>
          <p className="text-xs text-indigo-200 mt-2">
              {transactions.length} compras registradas este mes.
          </p>
      </div>

      {/* 2. GRÁFICO: ¿QUIÉN GASTA MÁS? (GUERRA DE TARJETAS) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-4">Gastos por Tarjeta</h3>
          
          <div className="space-y-4">
              {spendingByCard.map((card) => (
                  <div key={card.id} onClick={() => setSelectedCard(card.id === selectedCard ? 'all' : card.id)} className="cursor-pointer group">
                      <div className="flex justify-between text-xs mb-1">
                          <span className={`font-bold transition-colors ${selectedCard === card.id ? 'text-indigo-600' : 'text-gray-600'}`}>
                              {card.name}
                          </span>
                          <span className="font-mono font-medium text-gray-500">{showMoney(card.total)}</span>
                      </div>
                      
                      {/* Barra de Progreso */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${selectedCard === card.id ? 'bg-indigo-600' : 'bg-gray-400 group-hover:bg-gray-500'}`}
                            style={{ width: `${(card.total / maxCardSpend) * 100}%` }}
                          ></div>
                      </div>
                  </div>
              ))}
              {spendingByCard.length === 0 && <p className="text-xs text-gray-400">No hay consumos registrados.</p>}
          </div>
          
          {spendingByCard.length > 0 && (
              <button 
                onClick={() => setSelectedCard('all')} 
                className={`text-[10px] mt-4 font-bold px-2 py-1 rounded border transition-all ${selectedCard === 'all' ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
              >
                  {selectedCard === 'all' ? 'Mostrando todas' : 'Ver todas las tarjetas'}
              </button>
          )}
      </div>

      {/* 3. LISTA DE DETALLE (EL FORENSE) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-gray-800 text-sm">Detalle de Compras</h3>
              <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 font-bold uppercase">
                  {selectedCard === 'all' ? 'Todas' : 'Filtrado'}
              </span>
          </div>

          <div className="divide-y divide-gray-50">
              {filteredTransactions.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-indigo-50/30 transition-colors flex justify-between items-start group">
                      
                      {/* IZQUIERDA: Concepto y Tarjeta */}
                      <div className="flex gap-3">
                          {/* Icono de Tarjeta */}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mt-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          </div>
                          <div>
                              <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase tracking-wide">
                                      {getCardName(item.cardId)}
                                  </span>
                                  {item.installments > 1 && (
                                      <span className="text-[9px] text-indigo-500 font-bold">
                                          {item.installments} cuotas
                                      </span>
                                  )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(item.date).toLocaleDateString()}
                              </p>
                          </div>
                      </div>

                      {/* DERECHA: Monto y Borrar */}
                      <div className="text-right">
                          <p className="font-mono font-bold text-gray-900 text-sm">
                              {showMoney(item.finalAmount || item.amount)}
                          </p>
                          {item.installments > 1 && (
                              <p className="text-[10px] text-gray-400">
                                  {showMoney(item.monthlyInstallment)} /mes
                              </p>
                          )}
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="text-[10px] text-red-300 hover:text-red-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                              Eliminar
                          </button>
                      </div>
                  </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                      No hay compras que coincidan con el filtro.
                  </div>
              )}
          </div>
      </div>

    </div>
  );
}