import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function ServicesManager({ services = [], cards = [], transactions = [], currentDate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // Estado del formulario
  const [form, setForm] = useState({ name: '', amount: '', day: '', frequency: 'Mensual' });

  // 1. CLAVE DEL MES SELECCIONADO (La Máquina del Tiempo ⏳)
  // Usamos la fecha del selector (currentDate) para saber qué mes estamos administrando
  const currentMonthKey = useMemo(() => {
      if (!currentDate) return '';
      return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  }, [currentDate]);
  
  // Mapa de frecuencias para filtrar
  const frequencyMap = { 'Mensual': 1, 'Bimestral': 2, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12 };

  // 2. CÁLCULO DE DEUDA DE TARJETAS (Para el mes seleccionado)
  const cardServices = useMemo(() => {
      const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();

      return cards.map(c => {
          // Calculamos la deuda real de cuotas que caen en este mes específico
          const debt = transactions
            .filter(t => t.cardId === c.id && t.type !== 'cash') // Solo crédito
            .reduce((acc, t) => {
                const tDate = new Date(t.date);
                const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                
                const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                const endMonthVal = startMonthVal + (t.installments || 1);

                // Si el mes seleccionado está DENTRO del rango de cuotas
                if (targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal) {
                    return acc + Number(t.monthlyInstallment);
                }
                return acc;
            }, 0);

          if (debt === 0) return null; // Si no hay cuota este mes, no mostrar

          const isPaid = c.paidPeriods?.includes(currentMonthKey);
          
          return { 
              id: c.id, 
              name: c.name, 
              amount: debt, 
              day: c.closeDay || c.dueDay || 10, // Usamos cierre o vencimiento 
              isPaid, 
              type: 'card', 
              bank: c.bank, 
              frequency: 'Mensual' 
          };
      }).filter(Boolean);
  }, [cards, transactions, currentMonthKey, currentDate]);

  // 3. UNIFICAR SERVICIOS + TARJETAS (Filtrado por fecha)
  const allItems = useMemo(() => {
      // Filtrar servicios activos según frecuencia y mes seleccionado
      const activeServices = services.filter(s => {
          // Si es mensual, aparece siempre
          if (!s.frequency || s.frequency === 'Mensual') return true;
          
          // Si tiene frecuencia especial, calculamos si toca este mes
          if (!s.firstDueMonth) return true; // Si no tiene fecha inicio, mostramos por defecto
          
          const interval = frequencyMap[s.frequency] || 1;
          const [startYear, startMonth] = s.firstDueMonth.split('-').map(Number);
          
          // Diferencia en meses entre el inicio y el mes seleccionado actual
          const targetYear = currentDate.getFullYear();
          const targetMonth = currentDate.getMonth() + 1;
          
          const diffMonths = ((targetYear - startYear) * 12) + (targetMonth - startMonth);
          
          if (diffMonths < 0) return false; // El servicio empieza en el futuro
          return diffMonths % interval === 0; // Toca este mes (división exacta)
      });

      // Mapear y añadir estado de pago según el mes actual
      const regularServices = activeServices.map(s => ({ 
          ...s, 
          type: 'service', 
          isPaid: s.paidPeriods?.includes(currentMonthKey) // ¿Pagado en ESTE mes seleccionado?
      }));

      // Unir y ordenar: Primero Pendientes, luego Pagados
      return [...regularServices, ...cardServices].sort((a, b) => {
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1; // Pagados abajo
          return a.day - b.day; // Por día
      });
  }, [services, cardServices, currentMonthKey, currentDate]);

  // 4. GRÁFICO SEMANAL (Marea)
  const weeklyData = useMemo(() => {
      const weeks = [
          { t: 0, p: 0, label: 'Sem 1' },
          { t: 0, p: 0, label: 'Sem 2' },
          { t: 0, p: 0, label: 'Sem 3' },
          { t: 0, p: 0, label: 'Sem 4' }
      ];

      allItems.forEach(item => {
          const day = parseInt(item.day);
          let index = 0;
          if (day > 23) index = 3;
          else if (day > 15) index = 2;
          else if (day > 7) index = 1;

          weeks[index].t += item.amount;
          if (item.isPaid) weeks[index].p += item.amount;
      });

      const maxVal = Math.max(...weeks.map(w => w.t), 1);

      return weeks.map(w => ({
          total: w.t,
          paid: w.p,
          heightTotal: (w.t / maxVal) * 100,
          percentFilled: w.t > 0 ? (w.p / w.t) * 100 : 0,
          label: w.label
      }));
  }, [allItems]);

  // --- HANDLERS ---
  const openModal = (service = null) => {
      if (service) { 
          setEditingService(service); 
          setForm({ 
              name: service.name, 
              amount: service.amount, 
              day: service.day, 
              frequency: service.frequency || 'Mensual' 
          }); 
      } else { 
          setEditingService(null); 
          setForm({ name: '', amount: '', day: '', frequency: 'Mensual' }); 
      }
      setIsModalOpen(true);
  };

  const handleSave = async (e) => {
      e.preventDefault();
      if (!form.name || !form.amount || !auth.currentUser) return;
      
      const data = { 
          name: form.name, 
          amount: Number(form.amount), 
          day: Number(form.day) || 10, 
          frequency: form.frequency, 
          userId: auth.currentUser.uid 
      };

      try {
          if (editingService) {
              // AL EDITAR: Se actualiza el documento base.
              // Esto cumple con "modificar y que se conserve de ahí en adelante".
              // Los meses futuros leerán este nuevo 'amount'.
              await updateDoc(doc(db, 'services', editingService.id), data);
          } else {
              await addDoc(collection(db, 'services'), { 
                  ...data, 
                  paidPeriods: [], 
                  firstDueMonth: currentMonthKey // Se empieza a contar desde el mes actual
              });
          }
          setIsModalOpen(false);
      } catch (error) { 
          alert("Error al guardar"); 
      }
  };

  const handleDelete = async () => { 
      if(window.confirm("¿Eliminar este servicio permanentemente?")) { 
          await deleteDoc(doc(db, 'services', editingService.id)); 
          setIsModalOpen(false); 
      } 
  };

  const togglePaid = async (item) => {
      const collectionName = item.type === 'card' ? 'cards' : 'services';
      const ref = doc(db, collectionName, item.id);
      
      // Marcar/Desmarcar usando la clave del MES ACTUALMENTE SELECCIONADO
      if (item.isPaid) {
          await updateDoc(ref, { paidPeriods: arrayRemove(currentMonthKey) });
      } else {
          await updateDoc(ref, { paidPeriods: arrayUnion(currentMonthKey) });
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* HEADER DE SECCIÓN */}
      <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Calendario</h2>
            <p className="text-xs text-indigo-600 font-bold uppercase">{currentDate.toLocaleString('es-AR', {month: 'long', year: 'numeric'})}</p>
          </div>
          <button 
                  onClick={() => openModal()} 
                  className="text-xs bg-gray-900 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-black flex items-center gap-1 active:scale-95 transition-transform"
              >
                  <span>+</span> Nuevo Fijo
          </button>
      </div>

      {/* 1. GRÁFICO DE PROGRESO SEMANAL */}
      <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-lg border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-10 pointer-events-none"></div>

          <div className="flex justify-between items-center mb-8 relative z-10">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Marea Semanal</p>
              <div className="flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-700 rounded-full"></div> Pendiente</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div> Pagado</span>
              </div>
          </div>

          <div className="flex items-end justify-between h-40 gap-4 px-2 relative z-10">
              {weeklyData.map((week, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                      
                      {/* Tooltip */}
                      <div className={`absolute -top-10 transition-all duration-300 transform ${week.total > 0 ? 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0' : 'hidden'}`}>
                          <div className="bg-white text-gray-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                             {formatMoney(week.paid)} / {formatMoney(week.total)}
                          </div>
                          <div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1"></div>
                      </div>

                      {/* Estrella */}
                      {week.percentFilled >= 100 && week.total > 0 && (
                          <div className="absolute -top-8 animate-bounce z-20 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]"><span className="text-xl">⭐</span></div>
                      )}

                      {/* Barras */}
                      <div className="w-full bg-gray-800/50 rounded-t-lg relative flex items-end overflow-hidden transition-all duration-500" style={{ height: `${week.heightTotal}%` }}>
                          <div className={`w-full transition-all duration-1000 ease-out relative ${week.percentFilled >= 100 ? 'bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]' : 'bg-green-500/80'}`} style={{ height: `${week.percentFilled}%` }}>
                              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/50"></div>
                          </div>
                      </div>

                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${week.percentFilled >= 100 && week.total > 0 ? 'text-green-400' : 'text-gray-500'}`}>{week.label}</span>
                  </div>
              ))}
          </div>
      </div>

      {/* 2. LISTA DE VENCIMIENTOS */}
      <div className="space-y-3">
          {allItems.map((item) => (
              <div 
                  key={item.id} 
                  className={`bg-white p-4 rounded-xl border transition-all duration-300 group
                      ${item.isPaid 
                          ? 'border-green-200 bg-green-50/30 opacity-75' 
                          : 'border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md'
                      }
                  `}
              >
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-colors border ${item.isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                              <span className="text-lg leading-none">{item.day}</span>
                              <span className="text-[8px] uppercase opacity-70">Vence</span>
                          </div>

                          <div>
                              <div className="flex items-center gap-2">
                                  <p className={`font-bold text-sm transition-all ${item.isPaid ? 'text-green-800 line-through decoration-green-500' : 'text-gray-800'}`}>{item.name}</p>
                                  {item.type === 'card' && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-200">{item.bank}</span>}
                                  {item.type === 'service' && !item.isPaid && (
                                      <button onClick={(e) => { e.stopPropagation(); openModal(item); }} className="text-gray-300 hover:text-blue-500 p-1 rounded-full hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                  )}
                              </div>
                              <p className="text-xs text-gray-400 font-medium">{item.frequency}</p>
                          </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                          <p className={`font-mono font-bold transition-colors ${item.isPaid ? 'text-green-700' : 'text-gray-900'}`}>{formatMoney(item.amount)}</p>
                          <button onClick={() => togglePaid(item)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-90 ${item.isPaid ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] rotate-0' : 'border-gray-200 hover:border-blue-400 rotate-180 bg-white'}`}>
                              {item.isPaid && <svg className="w-5 h-5 text-white animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                      </div>
                  </div>
              </div>
          ))}
          
          {allItems.length === 0 && (
              <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-gray-400 text-sm font-medium">Nada pendiente para {currentDate.toLocaleString('es-AR', {month:'long'})}.</p>
              </div>
          )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-4 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-gray-800">{editingService ? 'Editar' : 'Nuevo Fijo'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors">✕</button>
                </div>
                
                <form onSubmit={handleSave} className="space-y-5 pb-6">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label><input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800" placeholder="Ej: Internet..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto ($)</label><input type="tel" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 text-center" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })} /></div>
                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Día Venc.</label><input type="number" max="31" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 text-center" placeholder="10" value={form.day} onChange={e => setForm({...form, day: e.target.value})} /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Frecuencia</label>
                        <div className="relative">
                            <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-600 text-sm appearance-none">
                                <option>Mensual</option><option>Bimestral</option><option>Trimestral</option><option>Semestral</option><option>Anual</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="pt-4 flex gap-3">
                        {editingService && (
                            <button type="button" onClick={handleDelete} className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        )}
                        <button type="submit" className="flex-1 bg-gray-900 text-white font-bold rounded-xl py-4 shadow-lg hover:bg-black transition-transform active:scale-95 text-lg">{editingService ? 'Actualizar' : 'Guardar'}</button>
                    </div>
                    {editingService && <p className="text-[10px] text-center text-gray-400 mt-2">Al editar, el nuevo monto se aplicará a todos los meses futuros.</p>}
                </form>
            </div>
        </div>
      )}
    </div>
  );
}