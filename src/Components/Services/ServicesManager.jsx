import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function ServicesManager() {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', amount: '', day: '' });

  // 1. CARGAR SERVICIOS
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'services'), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar por día de vencimiento
      docs.sort((a, b) => a.day - b.day);
      setServices(docs);
    });
    return () => unsubscribe();
  }, []);

  // 2. AGREGAR SERVICIO
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.amount || !auth.currentUser) return;

    await addDoc(collection(db, 'services'), {
        name: newService.name,
        amount: Number(newService.amount),
        day: Number(newService.day) || 10, // Día por defecto 10
        isPaid: false, // Por defecto no pagado
        userId: auth.currentUser.uid
    });
    setNewService({ name: '', amount: '', day: '' });
  };

  const handleDelete = async (id) => {
      if(window.confirm("¿Borrar servicio fijo?")) await deleteDoc(doc(db, 'services', id));
  };

  // Botón para resetear todos a "No Pagado" (Para inicio de mes)
  const resetMonth = async () => {
      if(!window.confirm("¿Empezar nuevo mes? Esto marcará todos los servicios como pendientes.")) return;
      const promises = services.map(s => updateDoc(doc(db, 'services', s.id), { isPaid: false }));
      await Promise.all(promises);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Configurar Gastos Fijos</h2>
          <p className="text-sm text-gray-500 mb-6">Carga aquí tus costos recurrentes (Alquiler, Luz, Monotributo).</p>

          <form onSubmit={handleAdd} className="space-y-4">
              <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
                  <input 
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" 
                    placeholder="Ej: Alquiler"
                    value={newService.name}
                    onChange={e => setNewService({...newService, name: e.target.value})}
                  />
              </div>
              <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Monto Estimado</label>
                      <input 
                        type="number"
                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" 
                        placeholder="$"
                        value={newService.amount}
                        onChange={e => setNewService({...newService, amount: e.target.value})}
                      />
                  </div>
                  <div className="w-24">
                      <label className="text-xs font-bold text-gray-400 uppercase">Día Vto.</label>
                      <input 
                        type="number" max="31" min="1"
                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center" 
                        placeholder="DD"
                        value={newService.day}
                        onChange={e => setNewService({...newService, day: e.target.value})}
                      />
                  </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white p-3 rounded-xl font-bold hover:bg-black">
                  Guardar Gasto Fijo
              </button>
          </form>
      </div>

      <div className="space-y-3">
          <h3 className="font-bold text-gray-800 px-2">Mis Servicios ({services.length})</h3>
          {services.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                      <p className="font-bold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">Vence el día {item.day}</p>
                  </div>
                  <div className="flex items-center gap-4">
                      <p className="font-mono font-bold text-gray-600">{formatMoney(item.amount)}</p>
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 p-2">×</button>
                  </div>
              </div>
          ))}
      </div>

      <div className="text-center pt-8">
          <button onClick={resetMonth} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              🔄 Reiniciar mes (Marcar todo pendiente)
          </button>
      </div>

    </div>
  );
}