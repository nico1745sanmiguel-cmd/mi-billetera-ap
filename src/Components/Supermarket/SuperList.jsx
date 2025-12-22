import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList({ items = [], currentDate }) {
    const [newItem, setNewItem] = useState('');

    // ESTADO PARA ENFOCAR EL NUEVO ÍTEM AUTOMÁTICAMENTE
    const [lastAddedId, setLastAddedId] = useState(null);
    const itemsRefs = useRef({});

    // TOAST STATE 🍞
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    const showToast = (message, undoAction) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, undoAction });
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
    };

    const handleUndo = async () => {
        if (toast?.undoAction) {
            await toast.undoAction();
            setToast(null);
        }
    };

    // 1. CLAVE DEL MES (MÁQUINA DEL TIEMPO ⏳)
    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // 2. LISTA FILTRADA Y ORDENADA
    const monthlyList = useMemo(() => {
        const list = items.filter(item => {
            if (item.month) return item.month === currentMonthKey;
            // Compatibilidad con items viejos (si no tienen mes, asumen el actual real)
            const realNow = new Date();
            const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
            return currentMonthKey === realKey;
        });

        // Orden: 1. Pendientes A-Z, 2. Comprados (Check) al fondo
        return list.sort((a, b) => {
            if (a.checked === b.checked) return a.name.localeCompare(b.name);
            return a.checked ? 1 : -1;
        });
    }, [items, currentMonthKey]);

    // 3. AUTO-SCROLL Y FOCO AL AGREGAR 🎯
    useEffect(() => {
        if (lastAddedId && itemsRefs.current[lastAddedId]) {
            // Scrollear hasta el elemento
            itemsRefs.current[lastAddedId].scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Enfocar el input de precio del nuevo item
            const priceInputEl = itemsRefs.current[lastAddedId].querySelector('input[type="tel"]');
            if (priceInputEl) {
                setTimeout(() => priceInputEl.focus(), 300);
            }
            setLastAddedId(null);
        }
    }, [monthlyList, lastAddedId]);

    // 4. CÁLCULOS
    const totals = useMemo(() => {
        const estimated = monthlyList.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const real = monthlyList.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const count = monthlyList.length;
        const checkedCount = monthlyList.filter(i => i.checked).length;
        return { estimated, real, count, checkedCount };
    }, [monthlyList]);

    // 5. HISTORIAL DE PRECIOS 📉
    const getPriceHistory = (itemName, currentPrice) => {
        const history = items
            .filter(i => i.name.trim().toLowerCase() === itemName.trim().toLowerCase() && i.checked && i.month !== currentMonthKey)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        if (history.length === 0) return null;
        const lastPrice = history[0].price;
        const diff = currentPrice - lastPrice;
        return { lastPrice, diff };
    };

    // FORMATOS
    const formatInputCurrency = (val) => val ? '$ ' + Number(val).toLocaleString('es-AR') : '';
    const parseCurrencyInput = (val) => val.replace(/\D/g, '');

    // --- HANDLERS ---
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem || !auth.currentUser) return;

        try {
            const docRef = await addDoc(collection(db, 'supermarket_items'), {
                name: newItem,
                price: 0, // Precio por defecto 0
                quantity: 1, // Cantidad por defecto 1
                checked: false,
                userId: auth.currentUser.uid,
                month: currentMonthKey,
                createdAt: new Date().toISOString()
            });

            setLastAddedId(docRef.id); // Guardamos ID para el auto-focus
            setNewItem('');

            showToast(`Agregado: ${newItem}`, async () => {
                await deleteDoc(docRef);
            });
        } catch (error) { console.error(error); }
    };

    const handleToggle = async (item) => {
        const itemRef = doc(db, 'supermarket_items', item.id);
        await updateDoc(itemRef, { checked: !item.checked });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Borrar item?")) await deleteDoc(doc(db, 'supermarket_items', id));
    };

    const handleUpdatePrice = async (item, rawValue) => {
        const numericValue = parseCurrencyInput(rawValue);
        const itemRef = doc(db, 'supermarket_items', item.id);

        const oldPrice = item.price;
        const wasChecked = item.checked;

        const updates = { price: Number(numericValue) };
        // Auto-check: Si cambio precio y no está checkeado, lo checkeo automágicamente
        if (!item.checked && Number(numericValue) > 0) {
            updates.checked = true;
        }

        await updateDoc(itemRef, updates);

        showToast("Precio actualizado", async () => {
            await updateDoc(itemRef, { price: oldPrice, checked: wasChecked });
        });
    };

    const handleUpdateQuantity = async (item, delta) => {
        const oldQty = item.quantity;
        const newQty = Math.max(1, item.quantity + delta);
        if (oldQty === newQty) return;

        const itemRef = doc(db, 'supermarket_items', item.id);
        await updateDoc(itemRef, { quantity: newQty });

        showToast("Cantidad modificada", async () => {
            await updateDoc(itemRef, { quantity: oldQty });
        });
    };

    return (
        <div className="animate-fade-in pb-32">

            {/* HEADER STICKY (Siempre visible arriba) */}
            <div className="sticky top-0 z-30 bg-[#f3f4f6]/95 backdrop-blur-sm pt-2 pb-3 mb-2 transition-all shadow-sm -mx-4 px-6 border-b border-gray-200/50">

                {/* TOAST DE NOTIFICACIÓN 🍞 */}
                <div className={`fixed top-4 left-0 right-0 flex justify-center transition-all duration-300 z-50 pointer-events-none ${toast ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                    <div className="bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold pointer-events-auto">
                        <span>{toast?.message}</span>
                        {toast?.undoAction && (
                            <button onClick={handleUndo} className="text-yellow-400 hover:text-yellow-300 uppercase tracking-wider ml-2">
                                Deshacer
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Supermercado</h2>
                        <p className="text-xs text-purple-600 font-bold uppercase">Lista de {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
                    </div>
                    <div className="text-right">
                        {/* Lógica Visual: Si hay algo checkeado es "En Carrito", si no es "Presupuesto" */}
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                            {totals.checkedCount > 0 ? 'En Carrito' : 'Presupuesto'}
                        </p>
                        <p className={`text-2xl font-bold ${totals.checkedCount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {formatMoney(totals.checkedCount > 0 ? totals.real : totals.estimated)}
                        </p>
                    </div>
                </div>

                {/* BARRA DE PROGRESO */}
                <div className="bg-white p-1 rounded-full shadow-inner border border-gray-100 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${totals.estimated > 0 ? (totals.real / totals.estimated) * 100 : 0}%` }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 min-w-[50px] text-right">{totals.checkedCount}/{totals.count}</span>
                </div>
            </div>

            {/* LISTA DE ITEMS CON SCROLLBAR 📜 */}
            <div className="flex relative">
                <div className="flex-1 space-y-3 pb-32">
                    {monthlyList.map((item) => {
                        const history = getPriceHistory(item.name, item.price);
                        const subtotal = item.price * item.quantity;

                        return (
                            <div
                                key={item.id}
                                ref={el => itemsRefs.current[item.id] = el}
                                data-letter={item.name[0].toUpperCase()}
                                className={`flex flex-col p-3 rounded-xl border transition-all duration-500 ${item.checked ? 'bg-purple-50 border-purple-100 opacity-60 order-last' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                {/* FILA 1: Check, Nombre, Subtotal */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div onClick={() => handleToggle(item)} className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}>
                                        {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={`font-bold text-sm text-gray-800 truncate ${item.checked ? 'line-through decoration-purple-400' : ''}`}>{item.name}</p>
                                            {subtotal > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-bold">Sub: {formatMoney(subtotal)}</span>}
                                        </div>

                                        {/* Comparación de Historial */}
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

                                {/* FILA 2: Controles de Cantidad y Precio */}
                                <div className="flex gap-3 pl-9">
                                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-10">
                                        <button onClick={() => handleUpdateQuantity(item, -1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 rounded-l-lg transition-colors text-lg font-bold">-</button>
                                        <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item, 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 rounded-r-lg transition-colors text-lg font-bold">+</button>
                                    </div>
                                    <div className={`flex-1 bg-gray-50 rounded-lg flex items-center px-3 border transition-colors h-10 ${lastAddedId === item.id ? 'border-purple-400 ring-2 ring-purple-100 bg-white' : 'border-gray-200'}`}>
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
                            <p className="text-xs text-gray-400">Agrega cosas para {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
                        </div>
                    )}
                </div>

                {/* BARRA LATERAL ALFABÉTICA (Derecha) */}
                <div className="w-8 flex flex-col items-center justify-center fixed right-1 top-32 bottom-24 z-20 pointer-events-none">
                    <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-full py-2 shadow-lg border border-gray-200 flex flex-col gap-1 max-h-full overflow-y-auto w-8 scrollbar-hide">
                        {[...new Set(monthlyList.filter(i => !i.checked).map(i => i.name[0].toUpperCase()))].sort().map(letter => (
                            <a
                                key={letter}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const target = monthlyList.find(i => i.name.toUpperCase().startsWith(letter) && !i.checked);
                                    if (target && itemsRefs.current[target.id]) {
                                        itemsRefs.current[target.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }}
                                className="text-[10px] font-black text-gray-400 hover:text-purple-600 hover:scale-150 transition-all text-center h-5 flex items-center justify-center shrink-0 w-full select-none"
                            >
                                {letter}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* INPUT ADD FLOTANTE (Simplificado) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:relative md:border-0 md:bg-transparent md:p-0 z-20">
                <form onSubmit={handleAdd} className="flex gap-2 max-w-5xl mx-auto">
                    <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 border border-transparent focus-within:border-purple-500 focus-within:bg-white transition-all shadow-sm">
                        <input
                            type="text"
                            className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 py-3"
                            placeholder="¿Qué falta comprar?"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newItem}
                        className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </form>
            </div>

        </div>
    );
}