import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget'; 
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function Home({ transactions, cards, supermarketItems = [], services = [], privacyMode, setView }) {
  
  // --- 1. CÁLCULOS (Igual que antes) ---
  const totalDeudaTarjetas = useMemo(() => transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0), [transactions]);
  const totalLimiteGlobal = useMemo(() => cards.reduce((acc, c) => acc + (Number(c.limit) || 0), 0), [cards]);
  
  const superData = useMemo(() => {
      const total = supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const inCart = supermarketItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
      return { total, inCart };
  }, [supermarketItems]);

  // --- 2. GENERAR AGENDA (Igual que antes) ---
  const agenda = useMemo(() => {
      const realServices = services.map(s => ({ ...s, type: 'service' }));
      
      if (totalDeudaTarjetas > 0) {
          const nextVto = cards.length > 0 ? Math.min(...cards.map(c => c.dueDay)) : 10;
          realServices.push({
              id: 'virtual-cards', name: 'Tarjetas de Crédito', amount: totalDeudaTarjetas,
              day: nextVto, isPaid: false, type: 'card_summary', status: 'warning'
          });
      }
      return realServices.sort((a, b) => a.day - b.day);
  }, [services, totalDeudaTarjetas, cards]);

  // --- 3. FILTRO "PRÓXIMOS 3" (NUEVO) ---
  // Solo mostramos lo que NO está pagado, máximo 3 items
  const upcomingAgenda = agenda.filter(item => !item.isPaid).slice(0, 3);

  // --- 4. TOTALES PARA EL ANILLO ---
  const servicesTotal = services.reduce((acc, s) => acc + s.amount, 0);
  const granTotalNecesario = totalDeudaTarjetas + superData.total + servicesTotal;
  const servicesPaid = services.filter(s => s.isPaid).reduce((acc, s) => acc + s.amount, 0);
  const granTotalPagado = superData.inCart + servicesPaid; 

  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  const togglePaid = async (service) => {
      if (service.type === 'card_summary') { setView('cards'); return; }
      await updateDoc(doc(db, 'services', service.id), { isPaid: !service.isPaid });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      <div className="pt-4 px-2 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Hola, Nico 👋</h1>
            <p className="text-sm text-gray-500">Tu radar financiero</p>
        </div>
      </div>

      <FinancialTarget totalNeed={granTotalNecesario} totalPaid={granTotalPagado} privacyMode={privacyMode} />

      {/* BLOQUE DE VENCIMIENTOS (RESUMIDO) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Próximos Compromisos</h3>
              {/* Este botón ahora lleva a la pantalla completa */}
              <button onClick={() => setView('services_manager')} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  Ver Todos ({agenda.length})
              </button>
          </div>
          
          <div className="divide-y divide-gray-50">
              {upcomingAgenda.map((item) => (
                  <div key={item.id} onClick={() => togglePaid(item)} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.day <= new Date().getDate() ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`}></div>
                          <div>
                              <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                              <p className="text-xs text-gray-400 font-medium">Vence día {item.day}</p>
                          </div>
                      </div>
                      <p className="font-mono font-bold text-gray-700">{showMoney(item.amount)}</p>
                  </div>
              ))}
              
              {upcomingAgenda.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      Todo al día. ¡Buen trabajo!
                  </div>
              )}
          </div>
      </div>

      {/* SUPERMERCADO */}
      <div onClick={() => setView('super')} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                  <p className="text-sm font-bold text-gray-800">Supermercado</p>
                  <p className="text-xs text-purple-500 font-medium">{superData.inCart > 0 ? `En carro: ${showMoney(superData.inCart)}` : 'Ir a la lista'}</p>
              </div>
          </div>
          <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
              <p className="font-bold text-gray-800 text-lg leading-tight">{showMoney(superData.total)}</p>
          </div>
      </div>
    </div>
  );
}