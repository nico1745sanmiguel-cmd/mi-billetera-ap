import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

// Recibimos 'cards' y 'transactions' para poder calcular la tarjeta en la lista completa
export default function ServicesManager({ services, cards, transactions }) {
  const [newService, setNewService] = useState({ name: '', amount: '', day: '' });
  const [showForm, setShowForm] = useState(false); // Ocultar formulario para que parezca más una lista

  // --- CÁLCULO DE LA TARJETA UNIFICADA (Igual que en Home) ---
  const totalDeudaTarjetas = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((acc, t) => acc + (Number(t.finalAmount) || Number(t.amount) || 0), 0);
  }, [transactions]);

  // --- UNIFICAR LISTA (Servicios DB + Tarjeta Virtual) ---
  const fullList = useMemo(() => {
      let list = services.map(s => ({ ...s, type: 'service' }));
      
      // Agregamos tarjeta si hay deuda
      if (totalDeudaTarjetas > 0) {
          const nextVto = cards && cards.length > 0 ? Math.min(...cards.map(c => c.dueDay)) : 10;
          list.push({
              id: 'virtual-cards',
              name: 'Resumen Tarjetas',
              amount: totalDeudaTarjetas,
              day: nextVto,
              isPaid: false, // Podrías guardar esto en localstorage si quisieras persistirlo
              type: 'card_summary'
          });
      }
      // Ordenar por día
      return list.sort((a, b) => a.day - b.day);
  }, [services, totalDeudaTarjetas, cards]);


  // ACCIONES
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.amount || !auth.currentUser) return;
    await addDoc(collection(db, 'services'), {
        name: newService.name, amount: Number(newService.amount), day: Number(newService.day) || 10, isPaid: false, userId: auth.currentUser.uid
    });
    setNewService({ name: '', amount: '', day: '' });
    setShowForm(false);
  };

  const handleDelete = async (id) => { if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, 'services', id)); };
  
  const togglePaid = async (service) => {
      if (service.type === 'card_summary') return; // La tarjeta no se marca aquí
      await updateDoc(doc(db, 'services', service.id), { isPaid: !service.isPaid });
  };

  const resetMonth = async () => {
      if(!window.confirm("¿Reiniciar mes?")) return;
      await Promise.all(services.map(s => updateDoc(doc(db, 'services', s.id), { isPaid: false })));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* HEADER TIPO EXCEL */}
      <div className="bg-green-700 p-4 rounded-xl text-white shadow-lg flex justify-between items-center">
          <h2 className="font-bold text-lg">📅 Agenda de Pagos</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-500 p-2 rounded-lg text-xs font-bold transition-colors">
              {showForm ? 'Cancelar' : '+ Agregar Nuevo'}
          </button>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border border-green-100 space-y-4 animate-fade-in-down">
              <div><label className="text-[10px] uppercase font-bold text-gray-400">Concepto</label><input className="w-full p-2 border-b border-gray-200 outline-none" placeholder="Ej: Internet" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} /></div>
              <div className="flex gap-4">
                  <div className="flex-1"><label className="text-[10px] uppercase font-bold text-gray-400">Monto</label><input type="number" className="w-full p-2 border-b border-gray-200 outline-none" placeholder="$" value={newService.amount} onChange={e => setNewService({...newService, amount: e.target.value})} /></div>
                  <div className="w-20"><label className="text-[10px] uppercase font-bold text-gray-400">Día</label><input type="number" className="w-full p-2 border-b border-gray-200 outline-none text-center" placeholder="10" value={newService.day} onChange={e => setNewService({...newService, day: e.target.value})} /></div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm">Guardar</button>
          </form>
      )}

      {/* LISTA COMPLETA (SÁBANA) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Encabezados Tabla */}
          <div className="grid grid-cols-12 bg-gray-50 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center border-b border-gray-100">
              <div className="col-span-2">Día</div>
              <div className="col-span-6 text-left pl-2">Concepto</div>
              <div className="col-span-3 text-right pr-2">Monto</div>
              <div className="col-span-1">OK</div>
          </div>

          <div className="divide-y divide-gray-100">
            {fullList.map((item) => (
                <div key={item.id} className={`grid grid-cols-12 p-3 items-center text-sm transition-colors ${item.isPaid ? 'bg-gray-50 opacity-60' : 'hover:bg-green-50/30'}`}>
                    
                    {/* DÍA */}
                    <div className="col-span-2 flex justify-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${item.type === 'card_summary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.day}
                        </span>
                    </div>

                    {/* CONCEPTO */}
                    <div className="col-span-6 pl-2 relative">
                        <p className={`font-bold truncate ${item.isPaid ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.name}</p>
                        {item.type === 'card_summary' && <span className="text-[9px] text-blue-500 block">Automático</span>}
                        {item.type !== 'card_summary' && (
                            <button onClick={() => handleDelete(item.id)} className="absolute -left-2 top-1 opacity-0 hover:opacity-100 text-red-400 p-1">×</button>
                        )}
                    </div>

                    {/* MONTO */}
                    <div className="col-span-3 text-right pr-2">
                        <p className={`font-mono font-bold ${item.isPaid ? 'text-gray-400' : 'text-gray-700'}`}>{formatMoney(item.amount)}</p>
                    </div>

                    {/* CHECKBOX (Acción) */}
                    <div className="col-span-1 flex justify-center">
                        {item.type !== 'card_summary' ? (
                            <input 
                                type="checkbox" 
                                checked={item.isPaid} 
                                onChange={() => togglePaid(item)}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                            />
                        ) : (
                            <span className="text-blue-500 text-xs">💳</span>
                        )}
                    </div>
                </div>
            ))}
          </div>
      </div>

      <div className="text-center pt-8">
          <button onClick={resetMonth} className="text-xs font-bold text-gray-400 border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-50">
              Reiniciar Mes (Destildar todo)
          </button>
      </div>

    </div>
  );
}