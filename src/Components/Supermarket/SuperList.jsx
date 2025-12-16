import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList({ items = [], currentDate }) {
  const [newItem, setNewItem] = useState('');
  // Usamos strings para los inputs locales para facilitar el manejo de "vacío"
  const [priceInput, setPriceInput] = useState(''); 
  const [quantity, setQuantity] = useState(1);

  // 1. CLAVE DEL MES
  const currentMonthKey = useMemo(() => {
      if (!currentDate) return '';
      return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  }, [currentDate]);

  // 2. LISTA FILTRADA Y ORDENADA (A-Z y Check al fondo) 📉
  const monthlyList = useMemo(() => {
      const list = items.filter(item => {
          if (item.month) return item.month === currentMonthKey;
          const realNow = new Date();
          const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
          return currentMonthKey === realKey;
      });

      // ORDENAMIENTO: 
      // 1. Checked (false arriba, true abajo)
      // 2. Alfabético (A-Z)
      return list.sort((a, b) => {
          if (a.checked === b.checked) {
              return a.name.localeCompare(b.name);
          }
          return a.checked ? 1 : -1;
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

  // 4. HISTORIAL
  const getPriceHistory = (itemName, currentPrice) => {
      const history = items
          .filter(i => 
              i.name.trim().toLowerCase() === itemName.trim().toLowerCase() && 
              i.checked && 
              i.month !== currentMonthKey
          )
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      if (history.length === 0) return null;
      const lastPrice = history[0].price;
      const diff = currentPrice - lastPrice;
      return { lastPrice, diff };
  };

  // --- HANDLERS ---
  
  // Formatea el valor visualmente para el input ($ 1.000)
  const formatInputCurrency = (val) => {
      if (!val) return '';
      // Convertir a número y luego a formato moneda sin decimales
      return '$ ' + Number(val).toLocaleString('es-AR');
  };

  // Parsea lo que escribe el usuario para guardar el número limpio
  const parseCurrencyInput = (val) => {
      // Quitar todo lo que no sea número
      return val.replace(/\D/g, '');
  };

  const handleAdd = async (e) => {
      e.preventDefault();
      if (!newItem || !auth.currentUser) return;
      // Parseamos el input local de precio antes de guardar
      const finalPrice = priceInput ? Number(parseCurrencyInput(priceInput)) : 0;

      try {
          await addDoc(collection(db, 'supermarket_items'), {
              name: newItem,
              price: finalPrice,
              quantity: Number(quantity) || 1,
              checked: false,
              userId: auth.currentUser.uid,
              month: currentMonthKey,
              createdAt: new Date().toISOString()
          });
          setNewItem('');
          setPriceInput('');
          setQuantity(1);
      } catch (error) { console.error(error); }
  };

  const handleToggle = async (item) => {
      const itemRef = doc(db, 'supermarket_items', item.id);
      await updateDoc(itemRef, { checked: !item.checked });
  };

  const handleDelete = async (id) => {
      if(window.confirm("¿Borrar item?")) await deleteDoc(doc(db, 'supermarket_items', id));
  };

  // Actualizar precio en tiempo real con formato
  const handleUpdatePrice = async (item, rawValue) => {
      const numericValue = parseCurrencyInput(rawValue);
      const itemRef = doc(db, 'supermarket_items', item.id);
      await updateDoc(itemRef, { price: Number(numericValue) });
  };

  // Actualizar cantidad (Stepper)
  const handleUpdateQuantity = async (item, delta) => {
      const newQty = Math.max(1, item.quantity + delta);
      const itemRef = doc(db, 'supermarket_items', item.id);
      await updateDoc(itemRef, { quantity: newQty });
  };


  return (
    <div className="animate-fade-in pb-28 space-y-4">
      
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
              const history = getPriceHistory(item.name, item.price);
              const subtotal = item.price * item.quantity;
              
              return (
                <div key={item.id} className={`flex flex-col p-3 rounded-xl border transition-all duration-500 ${item.checked ? 'bg-purple-50 border-purple-100 opacity-60 order-last' : 'bg-white border-gray-100 shadow-sm'}`}>
                    
                    {/* FILA SUPERIOR: Check + Nombre + Subtotal */}
                    <div className="flex items-center gap-3 mb-3">
                        <div 
                            onClick={() => handleToggle(item)}
                            className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}
                        >
                            {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className={`font-bold text-sm text-gray-800 truncate ${item.checked ? 'line-through decoration-purple-400' : ''}`}>{item.name}</p>
                                {/* SUBTOTAL */}
                                {subtotal > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-bold">Sub: {formatMoney(subtotal)}</span>}
                            </div>
                            
                            {/* HISTORIAL */}
                            {history && item.price > 0 && (
                                <p className="text-[10px] flex items-center gap-1">
                                    <span className="text-gray-400">Antes: {formatMoney(history.lastPrice)}</span>
                                    {history.diff !== 0 && <span className={`font-bold ${history.diff > 0 ? 'text-red-500' : 'text-green-500'}`}>({history.diff > 0 ? '+' : ''}{formatMoney(history.diff)})</span>}
                                </p>
                            )}
                        </div>
                        
                        <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>

                    {/* FILA INFERIOR: Stepper Cantidad y Precio Formateado */}
                    <div className="flex gap-3 pl-9">
                        
                        {/* STEPPER CANTIDAD */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-10">
                            <button onClick={() => handleUpdateQuantity(item, -1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 rounded-l-lg transition-colors text-lg font-bold">-</button>
                            <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item, 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 rounded-r-lg transition-colors text-lg font-bold">+</button>
                        </div>

                        {/* INPUT PRECIO FORMATEADO */}
                        <div className="flex-1 bg-gray-50 rounded-lg flex items-center px-3 border border-gray-200 focus-within:border-purple-300 focus-within:bg-white transition-colors h-10">
                            <input 
                                type="tel" 
                                className={`w-full bg-transparent outline-none text-sm font-bold text-right ${item.checked ? 'text-purple-700' : 'text-gray-800'}`}
                                value={item.price ? formatInputCurrency(item.price) : ''}
                                onChange={(e) => handleUpdatePrice(item, e.target.value)}
                                placeholder="$ 0"
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
              {/* Input Nombre */}
              <div className="flex-[2] bg-gray-100 rounded-xl flex items-center px-4 border border-transparent focus-within:border-purple-500 focus-within:bg-white transition-all">
                  <input type="text" className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 py-3" placeholder="¿Qué falta?" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
              </div>
              
              {/* Input Precio Nuevo (Formateado) */}
              <div className="flex-1 bg-gray-100 rounded-xl px-2 flex items-center border border-transparent focus-within:border-purple-500 focus-within:bg-white transition-all">
                   <input 
                      type="tel" 
                      className="w-full bg-transparent outline-none text-center font-bold text-gray-800 text-sm" 
                      placeholder="$ Est." 
                      value={priceInput ? formatInputCurrency(parseCurrencyInput(priceInput)) : ''} 
                      onChange={(e) => setPriceInput(e.target.value)} 
                    />
              </div>

              <button type="submit" disabled={!newItem} className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
          </form>
      </div>

    </div>
  );
}