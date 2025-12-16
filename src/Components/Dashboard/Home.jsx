import React, { useMemo, useEffect } from 'react';
import { formatMoney } from '../../utils';
import FinancialTarget from './FinancialTarget';
import { useDragReorder } from '../../hooks/useDragReorder'; 

// Colores de urgencia
const URGENCY_COLORS = {
    HIGH: 'bg-red-50 text-red-700 border-red-100', // Vence hoy/mañana
    MED: 'bg-orange-50 text-orange-700 border-orange-100', // Vence en 3 días
    LOW: 'bg-white text-gray-600 border-gray-100' // Normal
};

export default function Home({ transactions, cards, supermarketItems = [], services = [], privacyMode, setView, onLogout }) {
  
  // --- DRAG & DROP SETUP ---
  const widgets = [
    { id: 'target', name: 'Target' },
    { id: 'cards', name: 'Cards' },
    { id: 'agenda', name: 'Agenda' },
    { id: 'super_actions', name: 'Super & Actions' }
  ];

  const { orderedItems: orderedWidgets, draggingId, dragOffset, handlers } = useDragReorder(widgets, 'homeWidgetOrder');

  // Event listeners globales para mouse
  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handlers.onMouseMove);
      window.addEventListener('mouseup', handlers.onMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlers.onMouseMove);
        window.removeEventListener('mouseup', handlers.onMouseUp);
      };
    }
  }, [draggingId, handlers]);

  // Función para obtener las propiedades de un widget arrastrando
  const getDragProps = (widgetId) => ({
    onTouchStart: (e) => handlers.onTouchStart(e, widgetId),
    onTouchMove: (e) => handlers.onTouchMove(e, widgetId),
    onTouchEnd: (e) => handlers.onTouchEnd(e, widgetId),
    onMouseDown: (e) => handlers.onMouseDown(e, widgetId),
  });

  // Función para obtener estilos del widget arrastrando
  const getDragStyle = (widgetId) => {
    if (draggingId !== widgetId) return {};
    return {
      opacity: 0.8,
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
      transition: 'none',
      zIndex: 1000,
    };
  };
  
  // --- 1. CÁLCULOS ---
  
  // Tarjetas con deuda
  const cardsWithDebt = useMemo(() => {
      return cards.map(card => {
          const debt = transactions
            .filter(t => t.cardId === card.id) // Solo deuda de tarjeta (no cash)
            .reduce((acc, t) => acc + (Number(t.monthlyInstallment) || Number(t.finalAmount) || 0), 0);
          
          return { ...card, currentDebt: debt };
      });
  }, [cards, transactions]);

  // Supermercado
  const superData = useMemo(() => {
      const totalBudget = supermarketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const realSpent = supermarketItems.filter(i => i.checked).reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const percent = totalBudget > 0 ? (realSpent / totalBudget) * 100 : 0;
      return { totalBudget, realSpent, percent };
  }, [supermarketItems]);

  // Agenda (Próximos 3 vencimientos reales)
  const agenda = useMemo(() => {
      // Servicios
      const realServices = services.map(s => ({ 
          id: s.id, name: s.name, amount: s.amount, day: s.day, isPaid: s.isPaid || false, type: 'service' 
      }));
      // Tarjetas
      const cardServices = cardsWithDebt.filter(c => c.currentDebt > 0).map(c => ({
          id: c.id, name: c.name, amount: c.currentDebt, day: c.dueDay, isPaid: c.isPaid || false, type: 'card_item', bank: c.bank
      }));

      // Unificar, ordenar por fecha y filtrar pagados
      return [...realServices, ...cardServices]
        .sort((a, b) => a.day - b.day)
        .filter(item => !item.isPaid)
        .slice(0, 3); // Solo los prox 3
  }, [services, cardsWithDebt]);

  // Totales para el Radar
  const totalNeed = services.reduce((acc,s) => acc + s.amount, 0) + cardsWithDebt.reduce((acc,c) => acc + c.currentDebt, 0) + superData.totalBudget;
  const totalPaid = services.filter(s=>s.isPaid).reduce((acc,s)=>acc+s.amount,0) + cardsWithDebt.filter(c=>c.isPaid).reduce((acc,c)=>acc+c.currentDebt,0) + superData.realSpent;

  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  // --- 2. DETECTOR DE URGENCIA (Alerta Superior) ---
  const criticalAlert = useMemo(() => {
      const today = new Date().getDate();
      // Buscamos algo que venza hoy o mañana
      const urgentItem = agenda.find(item => item.day === today || item.day === today + 1);
      
      if (urgentItem) {
          return {
              active: true,
              msg: `¡Atención! ${urgentItem.name} vence ${urgentItem.day === today ? 'HOY' : 'mañana'}.`,
              amount: urgentItem.amount
          };
      }
      return { active: false };
  }, [agenda]);


  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* 1. HEADER + SALUDO */}
      <div className="flex justify-between items-center px-2 pt-2">
        <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tu Panel</span>
            <h1 className="text-xl font-bold text-gray-800">Hola, Nico 👋</h1>
        </div>
        <button onClick={onLogout} className="bg-gray-50 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>

      {/* 2. ALERTA CRÍTICA (Solo aparece si es urgente) */}
      {criticalAlert.active && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse">
              <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                      <p className="text-sm font-bold text-red-800">{criticalAlert.msg}</p>
                      <p className="text-xs text-red-600 font-medium cursor-pointer underline" onClick={() => setView('services_manager')}>Ir a pagar ahora</p>
                  </div>
              </div>
              <p className="font-bold text-red-800">{showMoney(criticalAlert.amount)}</p>
          </div>
      )}

      {/* 3. RESUMEN GLOBAL (RADAR) - Draggable */}
      <div 
        {...getDragProps('target')}
        style={getDragStyle('target')}
        className={`transition-all duration-300 cursor-grab ${draggingId === 'target' ? 'cursor-grabbing' : ''} ${privacyMode ? 'opacity-50 blur-sm pointer-events-none select-none' : 'opacity-100'}`}
      >
          <FinancialTarget totalNeed={totalNeed} totalPaid={totalPaid} privacyMode={privacyMode} />
          {privacyMode && <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 z-10">Vista Privada</div>}
      </div>


      {/* 4. CAROUSEL DE TARJETAS (Horizontal Scroll) - Draggable */}
      <div 
        {...getDragProps('cards')}
        style={getDragStyle('cards')}
        className={`transition-all duration-300 cursor-grab ${draggingId === 'cards' ? 'cursor-grabbing' : ''}`}
      >
          <div className="flex justify-between items-center px-2 mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Tus Tarjetas</h3>
              <button onClick={() => setView('cards')} className="text-xs font-bold text-blue-600 hover:text-blue-800">Ver todas</button>
          </div>
          
          {cards.length > 0 ? (
              <div className="flex overflow-x-auto gap-4 pb-4 px-2 snap-x snap-mandatory hide-scrollbar">
                  {cards.map((card) => (
                      <div 
                          key={card.id}
                          className="flex-shrink-0 w-[85%] max-w-[280px] h-40 rounded-2xl shadow-md p-5 text-white relative overflow-hidden snap-center transition-transform active:scale-95"
                          style={{ background: `linear-gradient(135deg, ${card.color || '#333'} 0%, ${card.color || '#333'}EE 100%)` }}
                          onClick={() => setView('cards')}
                      >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                          <div className="flex justify-between items-start mb-6">
                              <span className="font-bold text-sm tracking-wider uppercase opacity-90">{card.bank}</span>
                              <span className="text-[10px] font-mono opacity-70">**** {card.name.slice(-4)}</span>
                          </div>
                          <div>
                              <p className="text-[10px] opacity-70 uppercase mb-1">A pagar este mes</p>
                              <p className="font-mono text-2xl font-bold tracking-tight">
                                  {showMoney(cardsWithDebt.find(c=>c.id === card.id)?.currentDebt || 0)}
                              </p>
                          </div>
                          <div className="absolute bottom-4 right-4 text-[10px] font-medium bg-black/20 px-2 py-1 rounded">
                              Cierra día {card.closeDay}
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <div onClick={() => setView('cards')} className="mx-2 h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-gray-50">
                  <span className="text-2xl">+</span>
                  <span className="text-xs font-bold">Agregar Tarjeta</span>
              </div>- Draggable */}
      <div 
        {...getDragProps('agenda')}
        style={getDragStyle('agenda')}
        className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mx-1 transition-all duration-300 cursor-grab ${draggingId === 'agenda' ? 'cursor-grabbing' : ''}`}
      
      </div>

      {/* 5. PRÓXIMOS VENCIMIENTOS (Lista Simple y Limpia) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mx-1">
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 cursor-pointer" onClick={() => setView('services_manager')}>
              <h3 className="font-bold text-gray-800 text-sm">Agenda de Pagos</h3>
              <span className="text-xs font-bold text-gray-400">Ver todo →</span>
          </div>
          <div>
              {agenda.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold ${item.day <= new Date().getDate() + 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                              <span className="text-sm">{item.day}</span>
                              <span className="text-[8px] uppercase">Vence</span>
                          </div>
                          <div>
                              <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                              <p className="text-xs text-gray-400">{item.type === 'card_item' ? 'Tarjeta Crédito' : 'Servicio'}</p>
                          </div>
                      </div>
                      <p className="font-mono font-bold text-gray-800">{showMoney(item.amount)}</p>
                  </div>
              ))}
              {agenda.length === 0 && (- Draggable */}
      <div 
        {...getDragProps('super_actions')}
        style={getDragStyle('super_actions')}
        className={`grid grid-cols-2 gap-3 mx-1 transition-all duration-300 cursor-grab ${draggingId === 'super_actions' ? 'cursor-grabbing' : ''}`}
      text-gray-400">
                      <p className="text-xs">🎉 Todo al día por hoy</p>
                  </div>
              )}
          </div>
      </div>

      {/* 6. SUPERMERCADO Y ACCIONES RÁPIDAS (Grid) */}
      <div className="grid grid-cols-2 gap-3 mx-1">
          
          {/* Supermercado (Mini Card) */}
          <div onClick={() => setView('super')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-purple-200 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                  <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${superData.percent >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {Math.round(superData.percent)}%
                  </span>
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase">Supermercado</p>
              <p className="text-lg font-bold text-gray-800">{showMoney(superData.realSpent)}</p>
          </div>

          {/* Botón Nuevo Gasto (Acción Principal) */}
          <div onClick={() => setView('purchase')} className="bg-gray-900 p-4 rounded-2xl shadow-lg cursor-pointer active:scale-95 transition-all flex flex-col justify-between group">
              <div className="bg-gray-700 w-fit p-2 rounded-lg text-white group-hover:bg-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Registrar</p>
                  <p className="text-lg font-bold text-white">Nuevo Gasto</p>
              </div>
          </div>

      </div>

      {/* Botón Secundario: Análisis */}
      <button onClick={() => setView('stats')} className="w-full py-3 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl shadow-sm hover:bg-gray-50 text-sm flex items-center justify-center gap-2 mx-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Ver Análisis Completo
      </button>

    </div>
  );
}