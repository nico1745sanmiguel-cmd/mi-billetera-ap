import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

// --- SUB-COMPONENTE: TARJETA DE PRODUCTO ---
const SuperItem = ({ item, onUpdate, onToggle, onDelete, isNew }) => {
    const [localPrice, setLocalPrice] = useState('');
    const [localQty, setLocalQty] = useState('');

    useEffect(() => {
        setLocalPrice(item.price === 0 ? '' : new Intl.NumberFormat('es-AR').format(item.price));
        setLocalQty(item.quantity.toString());
    }, [item.price, item.quantity]);

    // --- MANEJO DE CANTIDAD CON BOTONES (STEPPER) ---
    const changeQty = (amount) => {
        const current = parseInt(localQty) || 0;
        const newVal = Math.max(1, current + amount); // Mínimo 1
        setLocalQty(newVal.toString());
        onUpdate(item.id, item.price, newVal); // Guardar directo
    };

    // --- MANEJO DE PRECIO ---
    const handlePriceChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) { setLocalPrice(''); return; }
        setLocalPrice(new Intl.NumberFormat('es-AR').format(parseInt(raw)));
    };

    // Al salir del input de precio, guardamos
    const savePrice = () => {
        const numPrice = parseInt(localPrice.replace(/\./g, '')) || 0;
        if (numPrice !== item.price) onUpdate(item.id, numPrice, item.quantity);
    };

    // Guardar cantidad manual (si escribieron un número grande)
    const saveQtyManual = () => {
        const numQty = parseInt(localQty) || 1;
        if (numQty !== item.quantity) onUpdate(item.id, item.price, numQty);
    };

    const subtotal = (parseInt(localPrice.replace(/\./g, '')) || 0) * (parseInt(localQty) || 0);
    const variation = item.lastPrice > 0 ? (( (parseInt(localPrice.replace(/\./g, '')) || 0) - item.lastPrice) / item.lastPrice) * 100 : 0;

    return (
        <div 
            id={`item-${item.id}`}
            className={`relative flex flex-col p-4 rounded-xl border transition-all duration-500 ${isNew ? 'ring-2 ring-purple-400 bg-purple-50' : (item.checked ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 shadow-sm')}`}
        >
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                    <div onClick={() => onToggle(item)} className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {item.checked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <h3 className={`font-bold text-gray-800 text-lg leading-tight ${item.checked ? 'line-through text-gray-400' : ''}`}>{item.name}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</p>
                    <p className={`font-mono font-bold text-lg ${item.checked ? 'text-gray-400' : 'text-purple-700'}`}>{formatMoney(subtotal)}</p>
                </div>
            </div>

            {/* CONTROLES */}
            <div className={`grid grid-cols-12 gap-3 items-center ${item.checked ? 'pointer-events-none grayscale' : ''}`}>
                
                {/* CANTIDAD (STEPPER) */}
                <div className="col-span-5 flex flex-col">
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">Cant.</label>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-10">
                        {/* Botón MENOS */}
                        <button 
                            onClick={() => changeQty(-1)}
                            className="w-8 h-full bg-gray-50 text-purple-600 font-bold active:bg-purple-100 border-r border-gray-200 flex items-center justify-center text-lg"
                        >-</button>
                        
                        {/* Input Manual */}
                        <input 
                            type="tel" inputMode="numeric"
                            className="w-full h-full text-center font-bold text-gray-700 focus:bg-white outline-none min-w-0"
                            value={localQty}
                            onChange={(e) => setLocalQty(e.target.value.replace(/\D/g, ''))}
                            onBlur={saveQtyManual}
                        />

                        {/* Botón MÁS */}
                        <button 
                            onClick={() => changeQty(1)}
                            className="w-8 h-full bg-gray-50 text-purple-600 font-bold active:bg-purple-100 border-l border-gray-200 flex items-center justify-center text-lg"
                        >+</button>
                    </div>
                </div>

                {/* PRECIO UNITARIO */}
                <div className="col-span-4 relative">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Precio</label>
                    <div className="relative h-10">
                        <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                        <input 
                            type="tel" inputMode="numeric"
                            className="w-full h-full bg-gray-50 border border-gray-200 rounded-lg pl-5 pr-1 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                            value={localPrice}
                            onChange={handlePriceChange}
                            onBlur={savePrice}
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* VARIACIÓN */}
                <div className="col-span-3 flex flex-col items-end justify-center h-full pt-4">
                    {variation !== 0 && Math.abs(variation) > 1 ? (
                        <div className={`text-[10px] font-bold px-1.5 py-1 rounded flex items-center gap-1 ${variation > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            <span>{variation > 0 ? '🔺' : '🔻'}</span>
                            <span>{Math.abs(variation).toFixed(0)}%</span>
                        </div>
                    ) : (
                        !item.lastPrice && <span className="text-[9px] text-gray-300 text-right leading-tight">Sin Historial</span>
                    )}
                </div>
            </div>
            
            {/* BORRAR */}
            <button onClick={() => onDelete(item.id)} className="absolute bottom-2 right-2 p-2 text-gray-300 hover:text-red-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
    );
};

export default function SuperList() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [justAddedId, setJustAddedId] = useState(null);

  const totalEstimado = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const totalCarrito = items.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'supermarket_items'), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snap) => setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (justAddedId && items.find(i => i.id === justAddedId)) {
        document.getElementById(`item-${justAddedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setJustAddedId(null), 2000);
    }
  }, [items, justAddedId]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.checked === b.checked ? a.name.localeCompare(b.name) : a.checked ? 1 : -1));
  }, [items]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !auth.currentUser) return;
    const docRef = await addDoc(collection(db, 'supermarket_items'), {
        name: newItemName, price: 0, lastPrice: 0, quantity: 1, checked: false, userId: auth.currentUser.uid
    });
    setJustAddedId(docRef.id);
    setNewItemName('');
  };

  const updateItem = async (id, price, quantity) => await updateDoc(doc(db, 'supermarket_items', id), { price, quantity });
  const toggleCheck = async (item) => await updateDoc(doc(db, 'supermarket_items', item.id), { checked: !item.checked });
  const handleDelete = async (id) => { if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, 'supermarket_items', id)); };
  
  const closeMonth = async () => {
      if(!window.confirm("¿Cerrar mes?")) return;
      await Promise.all(items.map(i => updateDoc(doc(db, 'supermarket_items', i.id), { lastPrice: i.price, checked: false })));
  };

  return (
    <div className="space-y-4 animate-fade-in pb-32">
      <div className="sticky top-20 z-30 bg-purple-600 text-white p-4 rounded-xl shadow-lg flex justify-between items-center ring-2 ring-purple-100">
          <div><p className="text-xs font-medium opacity-80 uppercase">En Carrito</p><h2 className="text-3xl font-bold font-mono">{formatMoney(totalCarrito)}</h2></div>
          <div className="text-right">
             <p className="text-[10px] opacity-70">Total Lista</p><p className="text-sm font-medium">{formatMoney(totalEstimado)}</p>
             <div className="w-24 h-1.5 bg-purple-900 rounded-full mt-1 ml-auto overflow-hidden"><div className="bg-white h-full transition-all" style={{ width: `${totalEstimado > 0 ? (totalCarrito/totalEstimado)*100 : 0}%` }}></div></div>
          </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
          <input value={newItemName} onChange={e => setNewItemName(e.target.value)} className="flex-grow p-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="📝 Agregar producto..." />
          <button type="submit" className="bg-purple-100 text-purple-700 p-3 rounded-xl font-bold shadow-sm hover:bg-purple-200">+</button>
      </form>

      <div className="space-y-3">
        {sortedItems.map(item => <SuperItem key={item.id} item={item} onUpdate={updateItem} onToggle={toggleCheck} onDelete={handleDelete} isNew={justAddedId === item.id} />)}
        {items.length === 0 && <p className="text-center text-gray-400 py-10">Lista vacía</p>}
      </div>

      <div className="pt-8 text-center"><button onClick={closeMonth} className="text-xs font-bold text-purple-600 bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors">🔄 Cerrar Mes</button></div>
    </div>
  );
}