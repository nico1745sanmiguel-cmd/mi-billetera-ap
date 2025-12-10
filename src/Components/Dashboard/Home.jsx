import React, { useMemo } from 'react';
import { formatMoney } from '../../utils';

export default function Home({ transactions, cards, supermarketItems = [], privacyMode, setView }) {
  
  // 1. CÁLCULOS REALES (Traídos de tus módulos)
  const totalDeudaTarjetas = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
  }, [transactions]);

  const totalLimiteGlobal = useMemo(() => {
    return cards.reduce((acc, c) => acc + (Number(c.limit) || 0), 0);
  }, [cards]);

  const porcentajeUso = totalLimiteGlobal > 0 ? (totalDeudaTarjetas / totalLimiteGlobal) * 100 : 0;

  const totalSuper = useMemo(() => {
      // Sumamos precio * cantidad de tu lista de super
      return supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [supermarketItems]);

  // 2. DATOS SIMULADOS (Pronto los haremos reales)
  // Estos son los que vi en tu Excel
  const serviciosMock = [
      { id: 1, name: 'Naturgy', amount: 25040, day: 10, status: 'pending' }, // pending, warning, paid
      { id: 2, name: 'Visa Santa Cruz', amount: 474900, day: 16, status: 'warning' },
      { id: 3, name: 'Seguro Auto', amount: 115939, day: 20, status: 'ok' },
  ];
  
  // Helper para ocultar dinero
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* 1. BLOQUE DE SALDO (Hero) */}
      <div className="flex flex-col items-center py-6">
          <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">Disponible Real</p>
          <h1 className="text-5xl font-bold text-gray-800 tracking-tight">{showMoney(850000)}</h1>
          
          {/* Accesos Rápidos */}
          <div className="flex gap-6 mt-8">
              <button className="flex flex-col items-center gap-2 group" onClick={() => setView('purchase')}>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-blue-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </div>
                  <span className="text-xs font-bold text-gray-600">Gasto</span>
              </button>
              <button className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-green-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="text-xs font-bold text-gray-600">Ingreso</span>
              </button>
              <button className="flex flex-col items-center gap-2 group" onClick={() => setView('super')}>
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-purple-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <span className="text-xs font-bold text-gray-600">Super</span>
              </button>
          </div>
      </div>

      {/* 2. AGENDA DE VENCIMIENTOS (Estilo Excel) */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Próximos Vencimientos</h3>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Ver Agenda</button>
          </div>
          <div className="divide-y divide-gray-50">
              {serviciosMock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                          {/* Semáforo */}
                          <div className={`w-2.5 h-2.5 rounded-full ${item.status === 'pending' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : item.status === 'warning' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                          <div>
                              <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                              <p className="text-xs text-gray-400 font-medium">Vence el día {item.day}</p>
                          </div>
                      </div>
                      <p className="font-mono font-bold text-gray-700">{showMoney(item.amount)}</p>
                  </div>
              ))}
          </div>
      </div>

      {/* 3. WIDGET TARJETAS (Real) */}
      <div onClick={() => setView('cards')} className="bg-[#0f172a] rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer group">
          {/* Fondo decorativo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
          
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <h3 className="text-white font-bold text-lg">Tarjetas de Crédito</h3>
                      <p className="text-blue-200 text-xs">Cierre total estimado</p>
                  </div>
                  <div className="bg-white/10 p-2 rounded-lg text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
              </div>

              <div className="flex justify-between items-end mb-2">
                 <span className="text-3xl font-mono font-bold text-white tracking-tight">{showMoney(totalDeudaTarjetas)}</span>
                 <span className="text-xs text-blue-300 mb-1 font-bold">{porcentajeUso.toFixed(0)}% del límite</span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-2 bg-blue-900/50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(porcentajeUso, 100)}%` }}></div>
              </div>
          </div>
      </div>

      {/* 4. WIDGET DOBLE (Ahorro + Super) */}
      <div className="grid grid-cols-2 gap-4">
          
          {/* Ahorros (Estático por ahora) */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Fondo Ahorro</p>
                  <p className="font-bold text-gray-800 text-lg leading-tight">{showMoney(300000)}</p>
                  <p className="font-bold text-green-600 text-xs">+ 200 USD</p>
              </div>
          </div>

          {/* Supermercado (Real) */}
          <div onClick={() => setView('super')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:border-purple-200 transition-colors">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Lista Super</p>
                  <p className="font-bold text-gray-800 text-lg leading-tight">{showMoney(totalSuper)}</p>
                  <p className="text-xs text-purple-500 font-medium">{supermarketItems.filter(i=>i.checked).length} en carro</p>
              </div>
          </div>
      </div>

    </div>
  );
}