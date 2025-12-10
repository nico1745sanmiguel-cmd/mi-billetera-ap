import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget'; // <--- IMPORTAMOS EL NUEVO COMPONENTE

export default function Home({ transactions, cards, supermarketItems = [], privacyMode, setView }) {
  
  // 1. CÁLCULOS
  const totalDeudaTarjetas = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
  }, [transactions]);

  const totalLimiteGlobal = useMemo(() => {
    return cards.reduce((acc, c) => acc + (Number(c.limit) || 0), 0);
  }, [cards]);

  const porcentajeUso = totalLimiteGlobal > 0 ? (totalDeudaTarjetas / totalLimiteGlobal) * 100 : 0;

  // Súper: Total Estimado (Meta) vs Total Tildado (Pagado/En Carrito)
  const superData = useMemo(() => {
      const total = supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const inCart = supermarketItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
      return { total, inCart };
  }, [supermarketItems]);

  // 2. DATOS DE SERVICIOS (SIMULADOS POR AHORA)
  // Aquí simulamos que algunos ya los pagaste (status: 'ok')
  const serviciosMock = [
      { id: 1, name: 'Naturgy', amount: 25040, day: 10, status: 'pending' }, 
      { id: 2, name: 'Visa Santa Cruz', amount: 474900, day: 16, status: 'warning' }, // Simulando que vence pronto
      { id: 3, name: 'Seguro Auto', amount: 115939, day: 20, status: 'ok' }, // Simulando PAGADO
  ];

  // 3. CÁLCULO DE LA META MENSUAL (TOTAL NECESARIO)
  // Fórmula: Total Tarjetas + Total Super + Total Servicios
  const totalServicesNeed = serviciosMock.reduce((acc, s) => acc + s.amount, 0);
  
  const granTotalNecesario = totalDeudaTarjetas + superData.total + totalServicesNeed;

  // 4. CÁLCULO DE LO YA PAGADO (PROGRESO)
  // Asumimos: Tarjetas (0 pagado por ahora), Super (lo que está en carrito), Servicios (status 'ok')
  const totalServicesPaid = serviciosMock.filter(s => s.status === 'ok').reduce((acc, s) => acc + s.amount, 0);
  
  const granTotalPagado = superData.inCart + totalServicesPaid; 
  // Nota: Las tarjetas las contamos como "Pendiente" hasta que pagues el resumen, por eso no suman al 'Pagado' aquí.

  // Helper privacidad
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* 1. TÍTULO SIMPLE */}
      <div className="pt-4 px-2">
        <h1 className="text-2xl font-bold text-gray-800">Hola, Nico 👋</h1>
        <p className="text-sm text-gray-500">Este es tu mapa de gastos del mes.</p>
      </div>

      {/* 2. EL NUEVO DOCK DE OBJETIVO (CIRCULAR) */}
      <FinancialTarget 
        totalNeed={granTotalNecesario} 
        totalPaid={granTotalPagado} 
        privacyMode={privacyMode} 
      />

      {/* 3. AGENDA DE VENCIMIENTOS */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Próximos Vencimientos</h3>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Ver Agenda</button>
          </div>
          <div className="divide-y divide-gray-50">
              {serviciosMock.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer ${item.status === 'ok' ? 'opacity-50 grayscale' : ''}`}>
                      <div className="flex items-center gap-4">
                          {/* Semáforo */}
                          <div className={`w-2.5 h-2.5 rounded-full ${item.status === 'pending' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : item.status === 'warning' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                          <div>
                              <p className={`font-bold text-sm ${item.status === 'ok' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.name}</p>
                              <p className="text-xs text-gray-400 font-medium">
                                  {item.status === 'ok' ? 'Pagado' : `Vence el día ${item.day}`}
                              </p>
                          </div>
                      </div>
                      <p className="font-mono font-bold text-gray-700">{showMoney(item.amount)}</p>
                  </div>
              ))}
          </div>
      </div>

      {/* 4. WIDGET TARJETAS (BARRA DE PROGRESO - LINEAL) */}
      {/* Mantenemos este diferente para que no compita visualmente con el de arriba */}
      <div onClick={() => setView('cards')} className="bg-[#0f172a] rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer group transition-transform active:scale-[0.98]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
          
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <h3 className="text-white font-bold text-lg">Tarjetas de Crédito</h3>
                      <p className="text-blue-200 text-xs">Deuda acumulada total</p>
                  </div>
                  <div className="bg-white/10 p-2 rounded-lg text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
              </div>

              <div className="flex justify-between items-end mb-2">
                 <span className="text-3xl font-mono font-bold text-white tracking-tight">{showMoney(totalDeudaTarjetas)}</span>
                 <span className="text-xs text-blue-300 mb-1 font-bold">{porcentajeUso.toFixed(0)}% del límite</span>
              </div>

              <div className="w-full h-2 bg-blue-900/50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(porcentajeUso, 100)}%` }}></div>
              </div>
          </div>
      </div>

      {/* 5. SUPERMERCADO */}
      <div onClick={() => setView('super')} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
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