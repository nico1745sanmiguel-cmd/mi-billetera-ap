import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function ServicesManager({ services = [], cards = [], transactions = [], currentDate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({ name: '', amount: '', day: '', frequency: 'Mensual' });

  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // --- LÓGICA DE DATOS ---
  const cardServices = useMemo(() => {
      return cards.map(c => {
          const debt = transactions
            .filter(t => t.cardId === c.id)
            .reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
          
          if (debt === 0) return null;

          const isPaid = c.paidPeriods?.includes(currentMonthKey);
          return { id: c.id, name: c.name, amount: debt, day: c.dueDay, isPaid, type: 'card', bank: c.bank, frequency: 'Mensual' };
      }).filter(Boolean);
  }, [cards, transactions, currentMonthKey]);

  const allItems = useMemo(() => {
      const regularServices = services.map(s => ({
          ...s,
          type: 'service',
          isPaid: s.paidPeriods?.includes(currentMonthKey)
      }));
      return [...regularServices, ...cardServices].sort((a, b) => a.day - b.day);
  }, [services, cardServices, currentMonthKey]);

  // --- CÁLCULO GRÁFICO (ESCALADO MEJORADO) ---
  const weeklyData = useMemo(() => {
      const weeks = [0, 0, 0, 0];
      allItems.forEach(item => {
          if (!item.isPaid) {
              const weekIndex = Math.min(Math.floor((item.day - 1) / 7), 3);
              weeks[weekIndex] += item.amount;
          }
      });
      const maxVal = Math.max(...weeks, 1);
      
      return weeks.map(val => ({ 
          value: val, 
          // Calculamos porcentaje exacto. Si es 0, es 0 altura.
          height: (val / maxVal) * 100 
      }));
  }, [allItems]);

  // --- ACCIONES ---
  const openModal = (service = null) => {
      if (service) {
          setEditingService(service);
          setForm({ name: service.name, amount: service.amount, day: service.day, frequency: service.frequency || 'Mensual' });
      } else {
          setEditingService(null);
          setForm({ name: '', amount: '', day: '', frequency: 'Mensual' });
      }
      setIsModalOpen(true);
  };

  const handleSave = async (e) => {
      e.preventDefault();
      if (!form.name || !form.amount || !auth.currentUser) return;
      const data = { name: form.name, amount: Number(form.amount), day: Number(form.day) || 10, frequency: form.frequency, userId: auth.currentUser.uid };
      try {
          if (editingService) await updateDoc(doc(db, 'services', editingService.id), data);
          else await addDoc(collection(db, 'services'), { ...data, paidPeriods: [] });
          setIsModalOpen(false);
      } catch (error) { alert("Error al guardar"); }
  };

  const handleDelete = async () => {
      if (!editingService) return;
      if(window.confirm("¿Eliminar?")) { await deleteDoc(doc(db, 'services', editingService.id)); setIsModalOpen(false); }
  };

  const togglePaid = async (item) => {
      const ref = doc(db, item.type === 'card' ? 'cards' : 'services', item.id);
      if (item.isPaid) await updateDoc(ref, { paidPeriods: arrayRemove(currentMonthKey) });
      else await updateDoc(ref, { paidPeriods: arrayUnion(currentMonthKey) });
  };

  const handleAmountChange = (e) => {
      const val = e.target.value.replace(/\D/g, '');
      setForm({ ...form, amount: val });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* 1. GRÁFICO VISUAL (CON RIEL DE FONDO) */}
      <div className="bg-[#0f172a] p-5 rounded-2xl text-white shadow-lg border border-gray-800">
          <p className="text-xs text-blue-200 font-bold uppercase mb-8 tracking-wider">Carga Semanal (Pendiente)</p>
          
          <div className="flex items-end justify-between h-40 gap-4 px-2"> {/* Aumenté altura a h-40 */}
              {weeklyData.map((week, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                      
                      {/* Tooltip con monto */}
                      <div className={`absolute -top-6 text-[10px] font-bold bg-white text-blue-900 px-2 py-0.5 rounded transition-opacity ${week.value > 0 ? 'opacity-100' : 'opacity-0'}`}>
                          {formatMoney(week.value)}
                      </div>
                      
                      {/* RIEL DE FONDO (Gris oscuro) */}
                      <div className="w-full h-full bg-gray-800 rounded-t-lg relative flex items-end overflow-hidden">
                          {/* BARRA DE PROGRESO (Relleno) */}
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-1000 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                            style={{ height: `${week.height}%` }}
                          ></div>
                      </div>
                      
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sem {idx + 1}</span>
                  </div>
              ))}
          </div>
      </div>

      {/* 2. LISTA DE SERVICIOS */}
      <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
              <h3 className="font-bold text-gray-800">Vencimientos</h3>
              <button onClick={() => openModal()} className="text-xs bg-gray-900 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-black flex items-center gap-1">
                  <span>+</span> Nuevo
              </button>
          </div>

          {allItems.map((item) => (
              <div key={item.id} className={`bg-white p-4 rounded-xl border transition-all ${item.isPaid ? 'border-green-200 bg-green-50/30' : 'border-gray-100 hover:border-blue-300 shadow-sm'}`}>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${item.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              <span>{item.day}</span>
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-bold text-sm ${item.isPaid ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{item.name}</p>
                                {item.type === 'card' && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 rounded font-bold">TARJETA</span>}
                                {item.type === 'service' && (
                                    <button onClick={(e) => { e.stopPropagation(); openModal(item); }} className="text-gray-300 hover:text-blue-500 p-1 rounded-full hover:bg-blue-50 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{item.frequency} • {item.isPaid ? 'Pagado' : 'Pendiente'}</p>
                          </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                          <p className={`font-mono font-bold ${item.isPaid ? 'text-gray-400' : 'text-gray-900'}`}>{formatMoney(item.amount)}</p>
                          <div onClick={() => togglePaid(item)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${item.isPaid ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 hover:border-blue-400'}`}>
                              {item.isPaid && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                      </div>
                  </div>
              </div>
          ))}
          {allItems.length === 0 && <div className="text-center p-8 text-gray-400 text-sm">No hay vencimientos para este mes.</div>}
      </div>

      {/* 3. MODAL DE EDICIÓN (BOTTOM SHEET SCROLLEABLE) */}
      {isModalOpen && (
        // CAMBIOS AQUÍ: items-end (pega abajo), z-50 alto
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center animate-fade-in">
            {/* CARD: rounded-t-3xl (solo arriba curva en movil), max-h-[90vh], overflow-y-auto */}
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
                
                <div className="flex justify-between items-center mb-6 border-b pb-4 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-gray-800">
                        {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-5 pb-6"> {/* pb-6 extra para el teclado */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label>
                        <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 focus:bg-white focus:border-blue-500 transition-colors" placeholder="Ej: Luz" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto ($)</label>
                            <input type="tel" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 text-center focus:bg-white focus:border-blue-500" placeholder="0" value={new Intl.NumberFormat('es-AR').format(form.amount)} onChange={handleAmountChange} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Día Venc.</label>
                            <input type="number" max="31" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 text-center focus:bg-white focus:border-blue-500" placeholder="10" value={form.day} onChange={e => setForm({...form, day: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Frecuencia</label>
                        <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-600 text-sm appearance-none">
                            <option>Mensual</option>
                            <option>Bimestral</option>
                            <option>Trimestral</option>
                            <option>Semestral</option>
                            <option>Anual</option>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        {editingService && (
                            <button type="button" onClick={handleDelete} className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Eliminar">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                        <button type="submit" className="flex-1 bg-gray-900 text-white font-bold rounded-xl py-4 shadow-lg hover:bg-black transition-transform active:scale-95 text-lg">
                            {editingService ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}