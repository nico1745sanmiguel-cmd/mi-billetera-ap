import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget'; 
import { db } from '../../firebase'; // Importamos DB para actualizar pagos
import { doc, updateDoc } from 'firebase/firestore';

export default function Home({ transactions, cards, supermarketItems = [], services = [], privacyMode, setView }) {
  
  // 1. CÁLCULO TARJETAS (Deuda Real)
  const totalDeudaTarjetas = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
  }, [transactions]);

  const totalLimiteGlobal = useMemo(() => {
    return cards.reduce((acc, c) => acc + (Number(c.limit) || 0), 0);
  }, [cards]);
  
  const porcentajeUso = totalLimiteGlobal > 0 ? (totalDeudaTarjetas / totalLimiteGlobal) * 100 : 0;

  // 2. CÁLCULO SUPERMERCADO
  const superData = useMemo(() => {
      const total = supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const inCart = supermarketItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
      return { total, inCart };
  }, [supermarketItems]);

  // 3. FUSIÓN INTELIGENTE: SERVICIOS + TARJETAS (AGENDA)
  const agenda = useMemo(() => {
      // a) Convertimos los servicios reales de Firestore
      const realServices = services.map(s => ({
          ...s,
          type: 'service'
      }));

      // b) Creamos el "Servicio Virtual" de las Tarjetas
      // Solo si hay deuda, para no ensuciar
      if (totalDeudaTarjetas > 0) {
          // Buscamos la fecha de vencimiento más cercana de tus tarjetas para ser precisos
          // (Si no hay, ponemos día 10 por defecto)
          const nextVto = cards.length > 0 ? Math.min(...cards.map(c => c.dueDay)) : 10;
          
          realServices.push({
              id: 'virtual-cards',
              name: 'Tarjetas de Crédito',
              amount: totalDeudaTarjetas,
              day: nextVto,
              isPaid: false, // La tarjeta la marcamos como pagada manualmente o asumimos pendiente
              type: 'card_summary',
              status: 'warning' // Siempre alerta
          });
      }

      // c) Ordenamos todo por fecha de vencimiento
      return realServices.sort((a, b) => a.day - b.day);

  }, [services, totalDeudaTarjetas, cards]);


  // 4. CÁLCULOS FINALES PARA EL ANILLO (META)
  // Necesitamos el TOTAL A PAGAR (Cards + Super + Servicios)
  const servicesTotal = services.reduce((acc, s) => acc + s.amount, 0);
  const granTotalNecesario = totalDeudaTarjetas + superData.total + servicesTotal;

  // Necesitamos el TOTAL YA PAGADO
  // (Super en Carrito + Servicios marcados como isPaid)
  const servicesPaid = services.filter(s => s.isPaid).reduce((acc, s) => acc + s.amount, 0);
  const granTotalPagado = superData.inCart + servicesPaid; 
  // Nota: Las tarjetas no las sumamos a "Pagado" hasta que las pagues por homebanking, por ahora quedan en "Falta".

  // Helper privacidad
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  // ACCIÓN: MARCAR SERVICIO COMO PAGADO
  const togglePaid = async (service) => {
      if (service.type === 'card_summary') {
          // Si tocan la tarjeta, los llevamos al detalle
          setView('cards');
          return;
      }
      // Si es un servicio normal, actualizamos en Firebase
      await updateDoc(doc(db, 'services', service.id), { isPaid: !service.isPaid });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* HEADER SALUDO */}
      <div className="pt-4 px-2 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Hola, Nico 👋</h1>
            <p className="text-sm text-gray-500">Objetivo del mes</p>
        </div>
        <button onClick={() => setView('services_manager')} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
            ⚙️ Gestionar Fijos
        </button>
      </div>

      {/* 1. RADAR DE OBJETIVO (CIRCULAR) */}
      <FinancialTarget 
        totalNeed={granTotalNecesario} 
        totalPaid={granTotalPagado} 
        privacyMode={privacyMode} 
      />

      {/* 2. AGENDA UNIFICADA (SERVICIOS + TARJETAS) */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Próximos Vencimientos</h3>
          </div>
          <div className="divide-y divide-gray-50">
              {agenda.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => togglePaid(item)}
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer ${item.isPaid ? 'opacity-40 grayscale bg-gray-50' : ''}`}
                  >
                      <div className="flex items-center gap-4">
                          {/* CHECKBOX / SEMÁFORO */}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${item.isPaid ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {item.isPaid && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                {!item.isPaid && item.type === 'card_summary' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                          </div>
                          
                          <div>
                              <p className={`font-bold text-sm ${item.isPaid ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.name}</p>
                              <p className="text-xs text-gray-400 font-medium">
                                  {item.isPaid ? 'Pagado' : `Vence el día ${item.day}`}
                              </p>
                          </div>
                      </div>
                      
                      <div className="text-right">
                         <p className="font-mono font-bold text-gray-700">{showMoney(item.amount)}</p>
                         {item.type === 'card_summary' && <p className="text-[9px] text-blue-500 font-bold uppercase">Ver detalle</p>}
                      </div>
                  </div>
              ))}
              {agenda.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">
                      No tienes vencimientos pendientes.
                  </div>
              )}
          </div>
      </div>

      {/* 3. SUPERMERCADO */}
      <div onClick={() => setView('super')} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors group">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                  <p className="text-sm font-bold text-gray-800">Control de Super</p>
                  <p className="text-xs text-purple-500 font-medium">{superData.inCart > 0 ? `Llevas ${showMoney(superData.inCart)}` : 'Carrito vacío'}</p>
              </div>
          </div>
          <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-gray-400">Estimado</p>
              <p className="font-bold text-gray-800 text-lg leading-tight">{showMoney(superData.total)}</p>
          </div>
      </div>

    </div>
  );
}