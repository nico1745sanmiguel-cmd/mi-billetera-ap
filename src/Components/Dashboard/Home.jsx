import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget'; 

export default function Home({ transactions, cards, supermarketItems = [], services = [], savingsList = [], privacyMode, setView, onLogout }) {
  
  // --- CÁLCULOS (Misma lógica robusta de siempre) ---
  const cardsWithDebt = useMemo(() => {
      return cards.map(card => {
          const debt = transactions.filter(t => t.cardId === card.id).reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
          return { ...card, currentDebt: debt };
      }).filter(c => c.currentDebt > 0);
  }, [cards, transactions]);

  const superData = useMemo(() => {
      const total = supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const inCart = supermarketItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
      return { total, inCart };
  }, [supermarketItems]);

  const agenda = useMemo(() => {
      const realServices = services.map(s => ({ ...s, type: 'service', amount: s.amount }));
      const cardServices = cardsWithDebt.map(c => ({
          id: c.id, name: c.name, amount: c.currentDebt, day: c.dueDay, isPaid: c.isPaid || false, type: 'card_item', status: 'warning'
      }));
      return [...realServices, ...cardServices].sort((a, b) => a.day - b.day);
  }, [services, cardsWithDebt]);

  const upcomingAgenda = agenda.filter(item => !item.isPaid).slice(0, 3);

  const totalServicesNeed = services.reduce((acc, s) => acc + s.amount, 0);
  const totalCardsNeed = cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0);
  const granTotalNecesario = totalCardsNeed + superData.total + totalServicesNeed;
  const servicesPaid = services.filter(s => s.isPaid).reduce((acc, s) => acc + s.amount, 0);
  const cardsPaid = cardsWithDebt.filter(c => c.isPaid).reduce((acc, c) => acc + c.currentDebt, 0);
  const granTotalPagado = superData.inCart + servicesPaid + cardsPaid;

  const savingsTotal = useMemo(() => {
      return savingsList.reduce((acc, item) => {
          const val = item.type === 'deposit' ? item.amount : -item.amount;
          if (item.currency === 'USD') acc.usd += val;
          else acc.ars += val;
          return acc;
      }, { ars: 0, usd: 0 });
  }, [savingsList]);

  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* 1. HEADER: SALUDO + LOGOUT */}
      <div className="flex justify-between items-end px-2 pt-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Hola, Nico 👋</h1>
            <p className="text-xs text-gray-400 font-medium">Panel de Control</p>
        </div>
        <button 
            onClick={onLogout}
            className="bg-gray-100 text-gray-400 p-2 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Cerrar Sesión"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>

      {/* 2. FINANCIAL TARGET (Tu Radar) */}
      <FinancialTarget totalNeed={granTotalNecesario} totalPaid={granTotalPagado} privacyMode={privacyMode} />

      {/* 3. ZONA DE ACCIÓN (BOTONERA PRINCIPAL - NUEVO DISEÑO) */}
      <div className="grid grid-cols-3 gap-3">
          
          {/* A. NUEVA COMPRA (Destacado) */}
          <button 
            onClick={() => setView('purchase')} 
            className="col-span-1 bg-[#3483fa] text-white p-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group"
          >
              <div className="bg-white/20 p-2 rounded-full group-hover:rotate-90 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="text-xs font-bold">Gasto</span>
          </button>

          {/* B. MIS TARJETAS */}
          <button 
            onClick={() => setView('cards')} 
            className="col-span-1 bg-white border border-gray-100 text-gray-700 p-4 rounded-2xl shadow-sm hover:border-purple-200 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group"
          >
              <div className="bg-purple-50 text-purple-600 p-2 rounded-full group-hover:bg-purple-100 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className="text-xs font-bold">Tarjetas</span>
          </button>

          {/* C. ANÁLISIS (DASHBOARD) */}
          <button 
            onClick={() => setView('stats')} 
            className="col-span-1 bg-gray-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group"
          >
              <div className="bg-gray-700 p-2 rounded-full group-hover:bg-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <span className="text-xs font-bold">Análisis</span>
          </button>
      </div>

      {/* 4. AGENDA (SERVICES MANAGER) */}
      <div onClick={() => setView('services_manager')} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors group">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Agenda de Pagos</h3>
              <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-xs font-bold">VER TODO 👉</span>
          </div>
          <div className="divide-y divide-gray-50">
              {upcomingAgenda.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 opacity-90 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.type === 'card_item' ? 'bg-blue-500' : (item.day <= new Date().getDate() ? 'bg-red-500 animate-pulse' : 'bg-yellow-400')}`}></div>
                          <div>
                              <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                              <p className="text-xs text-gray-400 font-medium flex items-center gap-1">{item.type === 'card_item' && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">TARJETA</span>} Vence día {item.day}</p>
                          </div>
                      </div>
                      <p className="font-mono font-bold text-gray-700">{showMoney(item.amount)}</p>
                  </div>
              ))}
              {upcomingAgenda.length === 0 && <div className="p-6 text-center text-gray-400 text-xs flex flex-col items-center gap-2"><span className="text-2xl">🎉</span>Todo al día.</div>}
          </div>
      </div>

      {/* 5. MÓDULOS SECUNDARIOS (SUPER + AHORRO) */}
      <div className="grid grid-cols-2 gap-4">
          
          {/* SUPERMERCADO */}
          <div onClick={() => setView('super')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:border-purple-200 transition-colors group relative overflow-hidden h-full">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2 z-10 relative">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div className="z-10 relative">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Super</p>
                  <p className="font-bold text-gray-800 text-lg leading-tight">{showMoney(superData.total)}</p>
                  <p className="text-[10px] text-purple-500 font-bold">{superData.inCart > 0 ? 'En carro' : 'Ver lista'}</p>
              </div>
          </div>

          {/* AHORROS */}
          <div onClick={() => setView('savings')} className="bg-green-600 p-4 rounded-2xl shadow-lg shadow-green-200 flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden group h-full transition-transform active:scale-95">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-5 -mt-5 transition-transform group-hover:scale-110"></div>
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mb-2 shadow-sm border border-green-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                  <p className="text-[10px] uppercase font-bold text-green-100">Fondo Ahorro</p>
                  <p className="font-bold text-white text-lg leading-tight tracking-wide">{showMoney(savingsTotal.ars)}</p>
                  <p className="text-[10px] text-green-100 font-medium flex items-center gap-1">{savingsTotal.usd > 0 ? `+ ${savingsTotal.usd} USD` : 'Sin USD'}</p>
              </div>
          </div>

      </div>
    </div>
  );
}