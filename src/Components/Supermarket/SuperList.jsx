import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: 1 });
  const [total, setTotal] = useState(0);

  // 1. CARGAR LISTA DE FIREBASE
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'supermarket_items'), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(docs);
      // Calcular Total
      const t = docs.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
      setTotal(t);
    });
    return () => unsubscribe();
  }, []);

  // 2. AGREGAR PRODUCTO
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.name || !auth.currentUser) return;

    await addDoc(collection(db, 'supermarket_items'), {
        name: newItem.name,
        price: Number(newItem.price) || 0,
        quantity: Number(newItem.quantity) || 1,
        userId: auth.currentUser.uid,
        checked: false
    });
    setNewItem({ name: '', price: '', quantity: 1 });
  };

  // 3. BORRAR
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'supermarket_items', id));
  };

  // 4. MARCAR COMO "EN EL CARRITO" (CHECKBOX)
  const toggleCheck = async (item) => {
      await updateDoc(doc(db, 'supermarket_items', item.id), { checked: !item.checked });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* CABECERA CON TOTAL */}
      <div className="bg-purple-600 p-6 rounded-2xl text-white shadow-lg flex justify-between items-center">
          <div>
              <h2 className="text-xl font-bold">🛒 Supermercado</h2>
              <p className="text-purple-200 text-sm">{items.length} productos</p>
          </div>
          <div className="text-right">
              <p className="text-xs uppercase opacity-80">Total Estimado</p>
              <p className="text-2xl font-mono font-bold">{formatMoney(total)}</p>
          </div>
      </div>

      {/* FORMULARIO SIMPLE */}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-2 items-end">
          <div className="flex-grow">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Producto</label>
              <input 
                className="w-full p-2 border-b-2 border-gray-200 focus:border-purple-500 outline-none text-sm font-medium" 
                placeholder="Ej: Aceite"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
              />
          </div>
          <div className="w-20">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Precio</label>
              <input 
                type="number"
                className="w-full p-2 border-b-2 border-gray-200 focus:border-purple-500 outline-none text-sm font-medium text-center" 
                placeholder="$0"
                value={newItem.price}
                onChange={e => setNewItem({...newItem, price: e.target.value})}
              />
          </div>
          <div className="w-12">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Cant.</label>
              <input 
                type="number"
                className="w-full p-2 border-b-2 border-gray-200 focus:border-purple-500 outline-none text-sm font-medium text-center" 
                value={newItem.quantity}
                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
              />
          </div>
          <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 shadow-md">
            +
          </button>
      </form>

      {/* LISTA TIPO EXCEL */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-50 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
              <div className="col-span-1">OK</div>
              <div className="col-span-5 text-left pl-2">Producto</div>
              <div className="col-span-2">Precio</div>
              <div className="col-span-1">Cant</div>
              <div className="col-span-2">Subtotal</div>
              <div className="col-span-1"></div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
                <div key={item.id} className={`grid grid-cols-12 p-3 items-center text-sm ${item.checked ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    {/* CHECKBOX */}
                    <div className="col-span-1 flex justify-center">
                        <input 
                            type="checkbox" 
                            checked={item.checked} 
                            onChange={() => toggleCheck(item)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                    </div>
                    
                    {/* NOMBRE */}
                    <div className={`col-span-5 pl-2 font-medium truncate ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.name}
                    </div>

                    {/* PRECIO */}
                    <div className="col-span-2 text-center text-gray-500 text-xs">
                        ${item.price}
                    </div>

                    {/* CANTIDAD */}
                    <div className="col-span-1 text-center font-bold text-gray-600">
                        {item.quantity}
                    </div>

                    {/* SUBTOTAL (Precio x Cantidad) */}
                    <div className="col-span-2 text-center font-bold text-purple-700">
                        {formatMoney(item.price * item.quantity)}
                    </div>

                    {/* BORRAR */}
                    <div className="col-span-1 flex justify-center">
                        <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500">
                            ×
                        </button>
                    </div>
                </div>
            ))}
            {items.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                    Tu lista está vacía. ¡Agrega cosas!
                </div>
            )}
          </div>
      </div>
    </div>
  );
}