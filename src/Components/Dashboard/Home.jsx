import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget'; 

// Colores para las tarjetas si no tienen color definido
const DEFAULT_CARD_COLOR = '#1e293b'; 

export default function Home({ transactions, cards, supermarketItems = [], services = [], privacyMode, setView, onLogout }) {
  
  // --- CÁLCULOS ---
  
  // 1. Tarjetas
  const cardsWithDebt = useMemo(() => {
      return cards.map(card => {
          const debt = transactions.filter(t => t.cardId === card.id).reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
          return { ...card, currentDebt: debt };
      });
  }, [cards, transactions]);

  // 2. Supermercado (Presupuesto vs Real)
  const superData = useMemo(() => {
      // Presupuesto: Todo lo que anoté en la lista
      const totalBudget = supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      // Real: Lo que ya marqué (Check)
      const realSpent = supermarketItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
      // Porcentaje
      const percent = totalBudget > 0 ? (realSpent / totalBudget) * 100 : 0;
      
      return { totalBudget, realSpent, percent };
  }, [supermarketItems]);

  // 3. Agenda
  const agenda = useMemo(() => {
      const realServices = services.map(s => ({ ...s, type: 'service', amount: s.amount }));
      const cardServices = cardsWithDebt.filter(c => c.currentDebt > 0).map(c => ({
          id: c.id, name: c.name, amount: c.currentDebt, day: c.dueDay, isPaid: c.isPaid || false, type: 'card_item'
      }));
      return [...realServices, ...cardServices].sort((a, b) => a.day - b.day);
  }, [services, cardsWithDebt]);

  const upcomingAgenda = agenda.filter(item => !item.isPaid).slice(0, 3);

  // 4. Totales Generales para el Radar
  const totalServicesNeed = services.reduce((acc, s) => acc + s.amount, 0);
  const totalCardsNeed = cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0);
  const granTotalNecesario = totalCardsNeed + superData.totalBudget + totalServicesNeed;
  const servicesPaid = services.filter(s => s.isPaid).reduce((acc, s) => acc + s.amount, 0);
  const cardsPaid = cardsWithDebt.filter(c => c.isPaid).reduce((acc, c) => acc + c.currentDebt, 0);
  const granTotalPagado = superData.realSpent + servicesPaid + cardsPaid;

  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-end px-2 pt-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Hola, Nico 👋</h1>
            <p className="text-xs text-gray-400 font-medium">Resumen Financiero</p>
        </div>
        <button onClick={onLogout} className="bg-gray-100 text-gray-400 p-2 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors" title="Cerrar Sesión">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>

      {/* 2. TARGET (Radar) */}
      <FinancialTarget totalNeed={granTotalNecesario} totalPaid={granTotalPagado} privacyMode={privacyMode} />

      {/* 3. WIDGET: TARJETERO (STACKED CARDS) 💳 */}
      <div className="px-1">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="font-bold text-gray-800 text-sm">Mi Billetera</h3>
            <button onClick={() => setView('cards')} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">GESTIONAR</button>
          </div>
          
          <div onClick={() => setView('cards')} className="relative h-44 cursor-pointer group perspective-1000">
             {cards.length > 0 ? (
                 cards.slice(0, 4).map((card, index) => (
                    <div 
                        key={card.id}
                        className="absolute w-full h-32 rounded-2xl shadow-lg border border-white/10 text-white p-4 transition-transform duration-300 group-hover:-translate-y-2"
                        style={{ 
                            top: `${index * 12}px`, // Efecto cascada
                            zIndex: index, 
                            backgroundColor: card.color || DEFAULT_CARD_COLOR,
                            transform: `scale(${1 - (index * 0.03)}) translateY(${index * 2}px)`, // Efecto profundidad
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div className="flex justify-between items-start opacity-90">
                            <span className="font-bold text-sm tracking-wider uppercase">{card.bank}</span>
                            {/* Logo marca simulación */}
                            <div className="opacity-80">
                                {card.name.toLowerCase().includes('visa') ? <span className="font-bold italic">VISA</span> : 
                                 card.name.toLowerCase().includes('master') ? <div className="flex -space-x-2"><div className="w-4 h-4 rounded-full bg-red-500/80"></div><div className="w-4 h-4 rounded-full bg-yellow-500/80"></div></div> : 
                                 <span className="text-[10px]">CARD</span>}
                            </div>
                        </div>
                        {index === 0 && ( // Solo mostramos saldo en la primera para no saturar
                            <div className="mt-6">
                                <p className="text-[10px] opacity-70 uppercase">Consumo Actual</p>
                                <p className="font-mono text-xl font-bold tracking-wide">{showMoney(cardsWithDebt.find(c => c.id === card.id)?.currentDebt || 0)}</p>
                            </div>
                        )}
                    </div>
                 ))
             ) : (
                 <div className="w-full h-32 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                     <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                     <span className="text-xs font-bold">Sin tarjetas</span>
                 </div>
             )}
             {/* Sombra base */}
             {cards.length > 0 && <div className="absolute top-36 w-full h-4 bg-black/5 blur-xl rounded-full z-[-1]"></div>}
          </div>
      </div>

      {/* 4. WIDGET: SUPERMERCADO (BARRA DE PROGRESO) 🛒 */}
      <div onClick={() => setView('super')} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all">
          <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <div>
                      <p className="font-bold text-gray-800 text-sm">Supermercado</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                          {superData.percent >= 100 ? 'Compra finalizada' : 'En progreso...'}
                      </p>
                  </div>
              </div>
              <div className="text-right">
                   <p className="text-[10px] text-gray-400 uppercase font-bold">Real / Presupuesto</p>
                   <div className="flex items-baseline justify-end gap-1">
                       <span className={`font-bold font-mono ${superData.realSpent > superData.totalBudget ? 'text-red-500' : 'text-gray-800'}`}>
                           {showMoney(superData.realSpent)}
                       </span>
                       <span className="text-xs text-gray-400 font-medium">/ {showMoney(superData.totalBudget)}</span>
                   </div>
              </div>
          </div>
          
          {/* Barra de Progreso */}
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${superData.percent >= 100 ? 'bg-green-500' : 'bg-purple-500'}`} 
                style={{ width: `${Math.min(superData.percent, 100)}%` }}
              ></div>
              {/* Marca de exceso si gastamos más */}
              {superData.realSpent > superData.totalBudget && (
                  <div className="absolute top-0 right-0 bottom-0 bg-red-500 animate-pulse w-2"></div>
              )}
          </div>
      </div>

      {/* 5. AGENDA (Services) */}
      <div onClick={() => setView('services_manager')} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer group">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Próximos Pagos</h3>
              <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-gray-200 text-gray-500">VER CALENDARIO</span>
          </div>
          <div className="divide-y divide-gray-50">
              {upcomingAgenda.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${item.type === 'card_item' ? 'bg-blue-500' : 'bg-yellow-400'}`}></div>
                          <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm leading-none mb-1">{item.name}</span>
                              <span className="text-[10px] text-gray-400 font-medium">Vence el {item.day}</span>
                          </div>
                      </div>
                      <p className="font-mono font-bold text-gray-700 text-sm">{showMoney(item.amount)}</p>
                  </div>
              ))}
              {upcomingAgenda.length === 0 && <div className="p-4 text-center text-gray-400 text-xs">🎉 Nada pendiente por ahora</div>}
          </div>
      </div>

      {/* 6. BOTONERA SECUNDARIA (Acciones rápidas) */}
      <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView('purchase')} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2">
              <span className="bg-white/20 p-1.5 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></span>
              <span className="text-sm font-bold">Nuevo Gasto</span>
          </button>
          <button onClick={() => setView('stats')} className="bg-white border border-gray-200 text-gray-700 p-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-gray-50">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="text-sm font-bold">Ver Análisis</span>
          </button>
      </div>

    </div>
  );
}