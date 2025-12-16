import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList({ items = [], currentDate }) {
  const [newItem, setNewItem] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);

  // 1. CLAVE DEL MES (Máquina del Tiempo ⏳)
  const currentMonthKey = useMemo(() => {
      if (!currentDate) return '';
      return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  }, [currentDate]);

  // 2. LISTA DEL MES ACTUAL
  const monthlyList = useMemo(() => {
      return items.filter(item => {
          if (item.month) return item.month === currentMonthKey;
          // Compatibilidad con items viejos
          const realNow = new Date();
          const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
          return currentMonthKey === realKey;
      });
  }, [items, currentMonthKey]);

  // 3. CÁLCULOS TOTALES
  const totals = useMemo(() => {
      const estimated = monthlyList.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const real = monthlyList.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const count = monthlyList.length;
      const checkedCount = monthlyList.filter(i => i.checked).length;
      return { estimated, real, count, checkedCount };
  }, [monthlyList]);

  // 4. LÓGICA DE HISTORIAL (Comparación de Precios) 📉
  const getPriceHistory = (itemName, currentPrice) => {
      // Buscamos items con el mismo nombre, que estén comprados (checked), pero que NO sean de este mes
      const history = items
          .filter(i => 
              i.name.trim().toLowerCase() === itemName.trim().toLowerCase() && 
              i.checked && 
              i.month !== currentMonthKey
          )
          // Ordenamos del más reciente al más viejo
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      if (history.length === 0) return null; // No hay historial

      const lastPrice = history[0].price;
      const diff = currentPrice - lastPrice;

      return { lastPrice, diff };
  };

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
              month: currentMonthKey,
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
      if(window.confirm("¿Borrar item?")) {
        await deleteDoc(doc(db, 'supermarket_items', id));
      }
  };

  // Edición directa de campos
  const handleUpdate = async (item, field, value) => {
      const itemRef = doc(db, 'supermarket_items', item.id);
      await updateDoc(itemRef, { [field]: Number(value) });
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
               <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${totals.estimated > 0 ? (totals.real / totals.estimated) * 100 : 0}%` }}></div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 min-w-[60px] text-right">{totals.checkedCount}/{totals.count} ítems</span>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="space-y-3">
          {monthlyList.map((item) => {
              // Calcular historial para este item
              const history = getPriceHistory(item.name, item.price);
              
              return (
                <div key={item.id} className={`flex flex-col p-3 rounded-xl border transition-all ${item.checked ? 'bg-purple-50 border-purple-100 opacity-80' : 'bg-white border-gray-100 shadow-sm'}`}>
                    
                    {/* FILA SUPERIOR: Check + Nombre + Info Histórica */}
                    <div className="flex items-center gap-3 mb-3">
                        <div 
                            onClick={() => handleToggle(item)}
                            className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}
                        >
                            {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm text-gray-800 truncate ${item.checked ? 'line-through decoration-purple-400' : ''}`}>{item.name}</p>
                            
                            {/* COMPARACIÓN HISTÓRICA */}
                            {history && item.price > 0 && (
                                <p className="text-[10px] flex items-center gap-1">
                                    <span className="text-gray-400">Antes: {formatMoney(history.lastPrice)}</span>
                                    {history.diff !== 0 && (
                                        <span className={`font-bold ${history.diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            ({history.diff > 0 ? '+' : ''}{formatMoney(history.diff)})
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        
                        <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>

                    {/* FILA INFERIOR: Edición de Cantidad y Precio */}
                    <div className="flex gap-2 pl-9">
                        {/* INPUT CANTIDAD */}
                        <div className="flex-1 bg-gray-50 rounded-lg flex items-center px-2 border border-gray-200 focus-within:border-purple-300 focus-within:bg-white transition-colors">
                            <span className="text-[10px] text-gray-400 font-bold mr-1">Cant.</span>
                            <input 
                                type="number" 
                                className="w-full bg-transparent outline-none text-sm font-bold text-gray-700 text-center py-2"
                                value={item.quantity}
                                onChange={(e) => handleUpdate(item, 'quantity', e.target.value)}
                            />
                        </div>

                        {/* INPUT PRECIO */}
                        <div className="flex-[1.5] bg-gray-50 rounded-lg flex items-center px-2 border border-gray-200 focus-within:border-purple-300 focus-within:bg-white transition-colors">
                            <span className="text-[10px] text-gray-400 font-bold mr-1">$</span>
                            <input 
                                type="number" 
                                className={`w-full bg-transparent outline-none text-sm font-bold text-right py-2 ${item.checked ? 'text-purple-700' : 'text-gray-800'}`}
                                value={item.price}
                                onChange={(e) => handleUpdate(item, 'price', e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                </div>
              );
          })}

          {monthlyList.length === 0 && (
              <div className="text-center py-10 opacity-50">
                  <span className="text-4xl">🛒</span>
                  <p className="text-sm font-bold text-gray-400 mt-2">Lista vacía</p>
                  <p className="text-xs text-gray-400">Agrega cosas para {currentDate.toLocaleString('es-AR', {month: 'long'})}</p>
              </div>
          )}
      </div>

      {/* INPUT ADD FLOTANTE */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:relative md:border-0 md:bg-transparent md:p-0 z-20">
          <form onSubmit={handleAdd} className="flex gap-2 max-w-5xl mx-auto">
              <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 border border-transparent focus-within:border-purple-500 focus-within:bg-white transition-all">
                  <input type="text" className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 py-3" placeholder="¿Qué falta?" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
              </div>
              <input type="number" className="w-16 bg-gray-100 rounded-xl px-1 text-center font-bold text-gray-800 outline-none focus:bg-white focus:border focus:border-purple-500 text-sm" placeholder="Cant." value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <button type="submit" disabled={!newItem} className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
          </form>
      </div>

    </div>
  );
}