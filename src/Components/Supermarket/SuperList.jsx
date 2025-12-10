import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  
  // Totales
  const totalEstimado = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const totalCarrito = items.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);

  // 1. CARGAR Y ORDENAR
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'supermarket_items'), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(docs);
    });
    return () => unsubscribe();
  }, []);

  // Ordenamiento: 1. No Comprados, 2. Alfabético
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.checked === b.checked) return a.name.localeCompare(b.name);
      return a.checked ? 1 : -1;
    });
  }, [items]);

  // 2. AGREGAR RÁPIDO (Solo nombre, el resto se edita en la tarjeta)
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !auth.currentUser) return;
    await addDoc(collection(db, 'supermarket_items'), {
        name: newItemName, price: 0, lastPrice: 0, quantity: 1, checked: false, userId: auth.currentUser.uid
    });
    setNewItemName('');
  };

  // 3. ACTUALIZAR EN TIEMPO REAL (Al salir del input)
  const updateItem = async (id, field, value) => {
      await updateDoc(doc(db, 'supermarket_items', id), { [field]: Number(value) });
  };

  const toggleCheck = async (item) => {
      await updateDoc(doc(db, 'supermarket_items', item.id), { checked: !item.checked });
  };

  // 4. CERRAR MES (Mueve Precio Actual -> Precio Anterior y destilda)
  const closeMonth = async () => {
      if(!window.confirm("¿Cerrar compra del mes?\n\nEsto guardará los precios actuales como referencia histórica y destildará todo.")) return;
      
      const batchPromises = items.map(item => {
          return updateDoc(doc(db, 'supermarket_items', item.id), {
              lastPrice: item.price, // Guardamos el precio de hoy como "Anterior"
              checked: false
          });
      });
      await Promise.all(batchPromises);
  };

  // 5. CÁLCULO DE VARIACIÓN
  const getVariation = (current, last) => {
      if (!last || last === 0) return null;
      const diff = ((current - last) / last) * 100;
      return diff; // Retorna el porcentaje
  };

  return (
    <div className="space-y-4 animate-fade-in pb-32">
      
      {/* CABECERA FLOTANTE (Total Carrito) */}
      <div className="sticky top-20 z-30 bg-purple-600 text-white p-4 rounded-xl shadow-lg flex justify-between items-center ring-2 ring-purple-100">
          <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Total en Caja</p>
              <h2 className="text-3xl font-bold font-mono text-shadow-sm">{formatMoney(totalCarrito)}</h2>
          </div>
          <div className="text-right">
             <p className="text-[10px] opacity-70">Presupuesto / Estimado</p>
             <p className="text-sm font-medium">{formatMoney(totalEstimado)}</p>
             {/* Barra de Progreso */}
             <div className="w-24 h-1.5 bg-purple-900 rounded-full mt-1 ml-auto overflow-hidden">
                <div className="bg-white h-full transition-all duration-500" style={{ width: `${totalEstimado > 0 ? (totalCarrito/totalEstimado)*100 : 0}%` }}></div>
             </div>
          </div>
      </div>

      {/* AGREGAR RÁPIDO */}
      <form onSubmit={handleAdd} className="flex gap-2">
          <input 
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            className="flex-grow p-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="📝 Agregar producto nuevo..."
          />
          <button type="submit" className="bg-purple-100 text-purple-700 p-3 rounded-xl font-bold shadow-sm hover:bg-purple-200">+</button>
      </form>

      {/* LISTA DE TARJETAS INTELIGENTES */}
      <div className="space-y-3">
        {sortedItems.map(item => {
            const subtotal = item.price * item.quantity;
            const variation = getVariation(item.price, item.lastPrice);
            
            return (
                <div key={item.id} className={`relative flex flex-col p-4 rounded-xl border transition-all duration-300 ${item.checked ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 shadow-sm'}`}>
                    
                    {/* ENCABEZADO: Check y Nombre */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div 
                                onClick={() => toggleCheck(item)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                            >
                                {item.checked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <h3 className={`font-bold text-gray-800 text-lg truncate ${item.checked ? 'line-through text-gray-400' : ''}`}>{item.name}</h3>
                        </div>
                        
                        {/* SUBTOTAL */}
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</p>
                            <p className={`font-mono font-bold text-lg ${item.checked ? 'text-gray-400' : 'text-purple-700'}`}>{formatMoney(subtotal)}</p>
                        </div>
                    </div>

                    {/* INPUTS Y DATOS */}
                    <div className={`grid grid-cols-12 gap-3 items-center ${item.checked ? 'pointer-events-none grayscale' : ''}`}>
                        
                        {/* CANTIDAD */}
                        <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Cant.</label>
                            <input 
                                type="number" 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-center font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                defaultValue={item.quantity}
                                onBlur={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            />
                        </div>

                        {/* PRECIO UNITARIO */}
                        <div className="col-span-5 relative">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Precio Unit.</label>
                            <div className="relative">
                                <span className="absolute left-2 top-2 text-gray-400">$</span>
                                <input 
                                    type="number" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 pl-5 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    defaultValue={item.price}
                                    onBlur={(e) => updateItem(item.id, 'price', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* LEYENDA DE VARIACIÓN (INTELIGENCIA) */}
                        <div className="col-span-4 flex flex-col items-end justify-center h-full pt-4">
                            {variation !== null && Math.abs(variation) > 1 && (
                                <div className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${variation > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    <span>{variation > 0 ? '🔺' : '🔻'}</span>
                                    <span>{Math.abs(variation).toFixed(0)}%</span>
                                </div>
                            )}
                            {(!variation || variation === 0) && item.lastPrice > 0 && (
                                <span className="text-[10px] text-gray-400">Igual al anterior</span>
                            )}
                            {(!item.lastPrice) && (
                                <span className="text-[10px] text-gray-300">Sin historial</span>
                            )}
                        </div>
                    </div>
                    
                    {/* BOTÓN BORRAR (Discreto) */}
                    <button 
                        onClick={() => { if(window.confirm('¿Borrar?')) deleteDoc(doc(db, 'supermarket_items', item.id)) }}
                        className="absolute bottom-2 right-2 p-2 text-gray-300 hover:text-red-400"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            )
        })}
        {items.length === 0 && <p className="text-center text-gray-400 py-10">Tu lista está vacía.</p>}
      </div>

      {/* BOTÓN CERRAR MES (Final de lista) */}
      <div className="pt-8 text-center">
          <button onClick={closeMonth} className="text-xs font-bold text-purple-600 bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors">
              🔄 Cerrar Mes y Guardar Precios
          </button>
          <p className="text-[10px] text-gray-400 mt-2 px-6">
              Al cerrar, los precios actuales se guardan como "Historial" para calcular la inflación del próximo mes.
          </p>
      </div>

    </div>
  );
}