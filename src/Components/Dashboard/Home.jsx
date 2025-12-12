import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget'; 
import LevelGuard from '../UI/LevelGuard'; // <--- IMPORTANTE

// AHORA RECIBE userLevel
export default function Home({ transactions, cards, supermarketItems = [], services = [], savingsList = [], privacyMode, setView, userLevel = 1 }) {
  
  // --- CÁLCULOS (Igual que antes) ---
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
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* HEADER + RADAR (NIVEL 1 - Siempre Visible) */}
      <div className="pt-4 px-2">
        <h1 className="text-2xl font-bold text-gray-800">Hola, Nico 👋</h1>
        <p className="text-sm text-gray-500">Nivel {userLevel}: {userLevel === 1 ? 'Novato' : userLevel === 2 ? 'Aprendiz' : userLevel === 3 ? 'Avanzado' : 'Experto'}</p>
      </div>

      <FinancialTarget totalNeed={granTotalNecesario} totalPaid={granTotalPagado} privacyMode={privacyMode} />

      {/* AGENDA (NIVEL 1 - Siempre Visible) */}
      <div onClick={() => setView('services_manager')} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors group">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Próximos Pagos</h3>
              <span className="text-gray-400 group-hover:text-blue-500 transition-colors">👉</span>
          </div>
          <div className="divide-y divide-gray-50">
              {upcomingAgenda.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 opacity-90">
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

      <div className="grid grid-cols-2 gap-4">
          
          {/* SUPERMERCADO (DESBLOQUEA NIVEL 2) */}
          <LevelGuard isLocked={userLevel < 2} title="Nivel 2" subtext="Carga 1 Gasto Fijo primero">
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
          </LevelGuard>

          {/* AHORROS (DESBLOQUEA NIVEL 4 - MÁXIMO) */}
          <LevelGuard isLocked={userLevel < 4} title="Nivel 4" subtext="Domina Tarjetas primero">
              <div onClick={() => setView('savings')} className="bg-green-600 p-4 rounded-2xl shadow-lg shadow-green-200 flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden group h-full">
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
          </LevelGuard>

      </div>
    </div>
  );
}