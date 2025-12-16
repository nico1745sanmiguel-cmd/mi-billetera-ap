import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList({ items = [], currentDate }) {
  const [newItem, setNewItem] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);

  // 1. CLAVE DEL MES (Para filtrar la lista)
  const currentMonthKey = useMemo(() => {
      if (!currentDate) return '';
      return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  }, [currentDate]);

  // 2. FILTRAR ÍTEMS DEL MES
  const monthlyList = useMemo(() => {
      return items.filter(item => {
          // Si el item tiene mes asignado, debe coincidir.
          // Si es un item viejo (sin mes), lo mostramos solo en el mes actual real o decidimos migrarlo.
          // Para que quede limpio "Opción 2", filtramos estricto por key.
          if (item.month) return item.month === currentMonthKey;
          
          // Compatibilidad: Si no tiene mes (creado antes de hoy), lo mostramos solo si estamos en el mes actual real
          const realNow = new Date();
          const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
          return currentMonthKey === realKey;
      });
  }, [items, currentMonthKey]);

  // 3. CÁLCULOS
  const totals = useMemo(() => {
      const estimated = monthlyList.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const real = monthlyList.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const count = monthlyList.length;
      const checkedCount = monthlyList.filter(i => i.checked).length;
      return { estimated, real, count, checkedCount };
  }, [monthlyList]);

  // --- HANDLERS ---
  const handleAdd = async (e) => {
      e.preventDefault();
      if (!newItem || !auth.currentUser) return;

      try {
          await addDoc(collection(db, 'supermarket_items'), {
              name: newItem,
              price: Number(price) || 0,
              quantity: Number(quantity) || 1,
              checked: false,
              userId: auth.currentUser.uid,
              month: currentMonthKey, // GUARDAMOS LA FECHA
              createdAt: new Date().toISOString()
          });
          setNewItem('');
          setPrice('');
          setQuantity(1);
      } catch (error) {
          console.error("Error adding item:", error);
      }
  };

  const handleToggle = async (item) => {
      const itemRef = doc(db, 'supermarket_items', item.id);
      await updateDoc(itemRef, { checked: !item.checked });
  };

  const handleDelete = async (id) => {
      await deleteDoc(doc(db, 'supermarket_items', id));
  };

  const handleUpdatePrice = async (item, newPrice) => {
      const itemRef = doc(db, 'supermarket_items', item.id);
      await updateDoc(itemRef, { price: Number(newPrice) });
  };

  return (
    <div className="animate-fade-in pb-24 space-y-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-end px-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Supermercado</h2>
            <p className="text-xs text-purple-600 font-bold uppercase">Lista de {currentDate.toLocaleString('es-AR', {month: 'long'})}</p>
          </div>
          <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold">En Carrito</p>
              <p className="text-xl font-bold text-gray-800">{formatMoney(totals.real)}</p>
          </div>
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="bg-white p-1 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
               <div 
                  className="h-full bg-purple-500 transition-all duration-500" 
                  style={{ width: `${totals.estimated > 0 ? (totals.real / totals.estimated) * 100 : 0}%` }}
               ></div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 min-w-[60px] text-right">
              {totals.checkedCount}/{totals.count} ítems
          </span>
      </div>

      {/* LISTA */}
      <div className="space-y-2">
          {monthlyList.map((item) => (
              <div 
                  key={item.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.checked ? 'bg-purple-50 border-purple-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}
              >
                  {/* CHECKBOX */}
                  <div 
                      onClick={() => handleToggle(item)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}
                  >
                      {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>

                  {/* INFO */}
                  <div className="flex-1">
                      <p className={`font-bold text-sm text-gray-800 ${item.checked ? 'line-through decoration-purple-400' : ''}`}>{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{item.quantity} un.</span>
                          {item.price > 0 && <span>x {formatMoney(item.price)}</span>}
                      </div>
                  </div>

                  {/* PRECIO EDITABLE */}
                  <div className="flex flex-col items-end gap-1">
                      <input 
                          type="number" 
                          className={`w-20 text-right font-mono font-bold text-sm bg-transparent outline-none border-b border-transparent focus:border-purple-300 focus:bg-purple-50 rounded px-1 ${item.checked ? 'text-purple-700' : 'text-gray-800'}`}
                          value={item.price}
                          onChange={(e) => handleUpdatePrice(item, e.target.value)}
                          placeholder="$0"
                      />
                      <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-300 hover:text-red-500">Eliminar</button>
                  </div>
              </div>
          ))}

          {monthlyList.length === 0 && (
              <div className="text-center py-10 opacity-50">
                  <span className="text-4xl">🛒</span>
                  <p className="text-sm font-bold text-gray-400 mt-2">Lista vacía</p>
                  <p className="text-xs text-gray-400">Agrega cosas para {currentDate.toLocaleString('es-AR', {month: 'long'})}</p>
              </div>
          )}
      </div>

      {/* INPUT FLOTANTE (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:relative md:border-0 md:bg-transparent md:p-0 z-20">
          <form onSubmit={handleAdd} className="flex gap-2 max-w-5xl mx-auto">
              <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 border border-transparent focus-within:border-purple-500 focus-within:bg-white transition-all">
                  <input 
                      type="text" 
                      className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 py-3" 
                      placeholder="¿Qué falta comprar?" 
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                  />
              </div>
              <input 
                  type="number" 
                  className="w-20 bg-gray-100 rounded-xl px-2 text-center font-bold text-gray-800 outline-none focus:bg-white focus:border focus:border-purple-500 text-sm" 
                  placeholder="$ Est." 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
              />
              <button 
                  type="submit" 
                  disabled={!newItem}
                  className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
              >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
          </form>
      </div>

    </div>
  );
}